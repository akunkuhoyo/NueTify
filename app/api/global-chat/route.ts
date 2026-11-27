export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DEV_UID = 'ebc0b783-4ebd-44b2-89de-990c57cfd297';
const DEV_EMAIL = 'drevviann@gmail.com';

interface ChatMessageRow {
  id: string;
  user_id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  content: string;
  is_deleted?: boolean | null;
  is_pinned?: boolean | null;
  is_developer?: boolean | null;
  total_plays?: number | null;
  total_seconds?: number | null;
  reply_to_id?: string | null;
  reply_to_name?: string | null;
  reply_to_content?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

interface UserProfileRow {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface LeaderboardRow {
  user_id: string;
  total_seconds?: number | null;
  total_plays?: number | null;
}

interface OverrideEntry {
  total_seconds?: number | null;
  total_plays?: number | null;
}

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;
  return { url, anonKey, serviceKey };
}

function enrichMessage(
  m: ChatMessageRow,
  profileMap: Map<string, UserProfileRow>,
  statsMap: Map<string, LeaderboardRow>,
  overrides: Record<string, OverrideEntry>
) {
  const profile = profileMap.get(m.user_id);
  const stats = statsMap.get(m.user_id);
  const override = overrides[m.user_id];

  const totalPlays =
    typeof override?.total_plays === 'number'
      ? override.total_plays
      : typeof stats?.total_plays === 'number'
        ? stats.total_plays
        : Number(m.total_plays || 0);

  const totalSeconds =
    typeof override?.total_seconds === 'number'
      ? override.total_seconds
      : typeof stats?.total_seconds === 'number'
        ? stats.total_seconds
        : Number(m.total_seconds || 0);

  return {
    ...m,
    display_name: (profile?.display_name && String(profile.display_name).trim()) || m.display_name || 'User',
    avatar_url: profile?.avatar_url ?? m.avatar_url ?? null,
    total_plays: totalPlays,
    total_seconds: totalSeconds,
    is_developer: m.user_id === DEV_UID || Boolean(m.is_developer),
  };
}

export async function GET() {
  try {
    const { url, serviceKey } = getSupabaseEnv();
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    const [messagesRes, pinnedRes] = await Promise.all([
      admin
        .from('global_chat_messages')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(80),
      admin
        .from('global_chat_messages')
        .select('*')
        .eq('is_pinned', true)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (messagesRes.error) {
      return NextResponse.json({ error: messagesRes.error.message }, { status: 500 });
    }

    const rawMessages = ([...(messagesRes.data || [])] as ChatMessageRow[]).reverse();
    const pinnedRow = (pinnedRes.data as ChatMessageRow | null) || null;

    const userIdSet = new Set<string>();
    for (const m of rawMessages) {
      if (m.user_id) userIdSet.add(m.user_id);
    }
    if (pinnedRow?.user_id) {
      userIdSet.add(pinnedRow.user_id);
    }
    const userIds = Array.from(userIdSet);

    const profileMap = new Map<string, UserProfileRow>();
    const statsMap = new Map<string, LeaderboardRow>();
    let overrides: Record<string, OverrideEntry> = {};

    if (userIds.length > 0) {
      const [profilesRes, statsRes, configRes] = await Promise.all([
        admin.from('user_profiles').select('id, display_name, avatar_url').in('id', userIds),
        admin.from('listening_leaderboard').select('user_id, total_seconds, total_plays').in('user_id', userIds),
        admin.from('app_config').select('value').eq('key', 'leaderboard_overrides').maybeSingle(),
      ]);

      for (const p of (profilesRes.data || []) as UserProfileRow[]) {
        profileMap.set(p.id, p);
      }
      for (const s of (statsRes.data || []) as LeaderboardRow[]) {
        statsMap.set(s.user_id, s);
      }
      if (configRes.data?.value && typeof configRes.data.value === 'object') {
        overrides = configRes.data.value as Record<string, OverrideEntry>;
      }
    }

    const enriched = rawMessages.map((m) => enrichMessage(m, profileMap, statsMap, overrides));
    const enrichedPinned = pinnedRow ? enrichMessage(pinnedRow, profileMap, statsMap, overrides) : null;

    return NextResponse.json(
      {
        messages: enriched,
        pinned: enrichedPinned,
        latest: enriched[enriched.length - 1] || null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, anonKey, serviceKey } = getSupabaseEnv();
    const anonClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const u = userData.user;
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    const isDev = u.id === DEV_UID || (u.email || '').toLowerCase() === DEV_EMAIL;

    const { data: banRow } = await admin
      .from('user_bans')
      .select('is_active, banned_until')
      .eq('user_id', u.id)
      .eq('is_active', true)
      .maybeSingle();

    const isBanActive =
      Boolean(banRow?.is_active) &&
      (!banRow?.banned_until || new Date(String(banRow.banned_until)).getTime() > Date.now());

    if (isBanActive && !isDev) {
      return NextResponse.json({ error: 'Akun Anda sedang ditangguhkan.' }, { status: 403 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const action = String(body.action || 'send').trim();

    if (action === 'delete') {
      const messageId = String(body.messageId || '').trim();
      if (!messageId) {
        return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
      }

      const { data: msg, error: fetchErr } = await admin
        .from('global_chat_messages')
        .select('id, user_id')
        .eq('id', messageId)
        .maybeSingle();

      if (fetchErr) {
        return NextResponse.json({ error: fetchErr.message }, { status: 500 });
      }
      if (!msg) {
        return NextResponse.json({ error: 'Pesan tidak ditemukan.' }, { status: 404 });
      }
      if (msg.user_id !== u.id && !isDev) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { error: delErr } = await admin
        .from('global_chat_messages')
        .update({ is_deleted: true, is_pinned: false, content: '' })
        .eq('id', messageId);

      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, deletedId: messageId });
    }

    if (action === 'pin') {
      if (!isDev) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const messageId = String(body.messageId || '').trim();
      if (!messageId) {
        return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
      }
      const pinned = Boolean(body.pinned);

      if (pinned) {
        const { error: unpinErr } = await admin
          .from('global_chat_messages')
          .update({ is_pinned: false })
          .eq('is_pinned', true);
        if (unpinErr) {
          return NextResponse.json({ error: unpinErr.message }, { status: 500 });
        }

        const { error: pinErr } = await admin
          .from('global_chat_messages')
          .update({ is_pinned: true })
          .eq('id', messageId);
        if (pinErr) {
          return NextResponse.json({ error: pinErr.message }, { status: 500 });
        }
      } else {
        const { error: unpinErr } = await admin
          .from('global_chat_messages')
          .update({ is_pinned: false })
          .eq('id', messageId);
        if (unpinErr) {
          return NextResponse.json({ error: unpinErr.message }, { status: 500 });
        }
      }

      return NextResponse.json({ ok: true, messageId, pinned });
    }

    const content = String(body.content || '').trim();
    if (!content || content.length > 500) {
      return NextResponse.json(
        { error: 'Pesan harus antara 1 hingga 500 karakter.' },
        { status: 400 }
      );
    }

    const [profileRes, statsRes, overrideRes] = await Promise.all([
      admin.from('user_profiles').select('id, display_name, avatar_url').eq('id', u.id).maybeSingle(),
      admin
        .from('listening_leaderboard')
        .select('user_id, total_seconds, total_plays')
        .eq('user_id', u.id)
        .maybeSingle(),
      admin.from('app_config').select('value').eq('key', 'leaderboard_overrides').maybeSingle(),
    ]);

    const meta = (u.user_metadata || {}) as Record<string, unknown>;
    const metaName =
      typeof meta.full_name === 'string'
        ? meta.full_name.trim()
        : typeof meta.name === 'string'
          ? meta.name.trim()
          : '';
    const displayName =
      (profileRes.data?.display_name && String(profileRes.data.display_name).trim()) ||
      metaName ||
      'User';
    const avatarUrl =
      (profileRes.data?.avatar_url as string | null) ??
      (typeof meta.avatar_url === 'string' ? meta.avatar_url : null);

    const overrides =
      overrideRes.data?.value && typeof overrideRes.data.value === 'object'
        ? (overrideRes.data.value as Record<string, OverrideEntry>)
        : {};
    const userOverride = overrides[u.id];

    const totalPlays =
      typeof userOverride?.total_plays === 'number'
        ? userOverride.total_plays
        : Number(statsRes.data?.total_plays || 0);
    const totalSeconds =
      typeof userOverride?.total_seconds === 'number'
        ? userOverride.total_seconds
        : Number(statsRes.data?.total_seconds || 0);

    const replyToId = body.replyToId ? String(body.replyToId).trim() : null;
    let replyToName: string | null = null;
    let replyToContent: string | null = null;

    if (replyToId) {
      const { data: replyTarget } = await admin
        .from('global_chat_messages')
        .select('display_name, content')
        .eq('id', replyToId)
        .eq('is_deleted', false)
        .maybeSingle();

      if (replyTarget) {
        replyToName = replyTarget.display_name ? String(replyTarget.display_name) : null;
        replyToContent = replyTarget.content ? String(replyTarget.content) : null;
      }
    }

    const insertPayload: Record<string, unknown> = {
      user_id: u.id,
      display_name: displayName,
      avatar_url: avatarUrl,
      content,
      total_plays: totalPlays,
      total_seconds: totalSeconds,
      is_developer: isDev,
      is_deleted: false,
      is_pinned: false,
    };

    if (replyToId && replyToContent !== null) {
      insertPayload.reply_to_id = replyToId;
      insertPayload.reply_to_name = replyToName;
      insertPayload.reply_to_content = replyToContent;
    }

    const { data: inserted, error: insertErr } = await admin
      .from('global_chat_messages')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: inserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
}
