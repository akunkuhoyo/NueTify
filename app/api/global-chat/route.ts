import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const DEV_UID = 'ebc0b783-4ebd-44b2-89de-990c57cfd297';
const DEV_EMAIL = 'drevviann@gmail.com';
const COOLDOWN_MS = 10_000;

type ChatRow = {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_developer: boolean;
  total_plays: number;
  total_seconds: number;
  content: string;
  reply_to_id: string | null;
  reply_to_name: string | null;
  reply_to_content: string | null;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
};

type OverrideMap = Record<string, { total_seconds?: number; total_plays?: number }>;

function getSupabaseClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !anonKey) throw new Error('Supabase env belum dikonfigurasi.');
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const admin = createClient(url, serviceKey || anonKey, { auth: { persistSession: false } });
  return { anon, admin };
}

function calcHistoryStats(history: unknown): { totalSeconds: number; totalPlays: number } {
  if (!Array.isArray(history)) return { totalSeconds: 0, totalPlays: 0 };
  let totalSeconds = 0;
  let totalPlays = 0;
  for (const item of history as Array<{ playCount?: number; track?: { duration?: number } }>) {
    const plays = Math.max(0, Number(item?.playCount || 0));
    const dur = Math.max(0, Number(item?.track?.duration || 210));
    totalPlays += plays;
    totalSeconds += plays * dur;
  }
  return { totalSeconds: Math.floor(totalSeconds), totalPlays: Math.floor(totalPlays) };
}

function enrichMessage(
  m: ChatRow,
  profileMap: Map<string, { display_name?: string | null; avatar_url?: string | null }>,
  lbMap: Map<string, { total_seconds?: number | null; total_plays?: number | null }>,
  musicMap: Map<string, { totalSeconds: number; totalPlays: number }>,
  overrides: OverrideMap
): ChatRow {
  const p = profileMap.get(m.user_id);
  const lb = lbMap.get(m.user_id);
  const mus = musicMap.get(m.user_id) || { totalSeconds: 0, totalPlays: 0 };
  const ov = overrides[m.user_id];
  const rawName = String(p?.display_name || m.display_name || '').trim();
  const validName = rawName && rawName.toLowerCase() !== 'undefined' && rawName.toLowerCase() !== 'null' && !rawName.includes('@');
  const totalSeconds =
    typeof ov?.total_seconds === 'number'
      ? Math.max(0, Math.floor(ov.total_seconds))
      : Math.max(Number(lb?.total_seconds || 0), mus.totalSeconds, Number(m.total_seconds || 0));
  const totalPlays =
    typeof ov?.total_plays === 'number'
      ? Math.max(0, Math.floor(ov.total_plays))
      : Math.max(Number(lb?.total_plays || 0), mus.totalPlays, Number(m.total_plays || 0));

  return {
    ...m,
    display_name: validName ? rawName : 'Pengguna NueTify',
    avatar_url: (p?.avatar_url || m.avatar_url || '').trim() || null,
    is_developer: m.user_id === DEV_UID || Boolean(m.is_developer),
    total_seconds: totalSeconds,
    total_plays: totalPlays,
  };
}

export async function GET() {
  try {
    const { admin } = getSupabaseClients();
    const [msgsRes, pinRes] = await Promise.all([
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

    const rawMessages = ((msgsRes.data || []) as ChatRow[]).reverse();
    const pinnedRow = (pinRes.data as ChatRow | null) || null;

    const uidSet = new Set<string>();
    for (const m of rawMessages) if (m.user_id) uidSet.add(m.user_id);
    if (pinnedRow?.user_id) uidSet.add(pinnedRow.user_id);
    const userIds = Array.from(uidSet);

    const profileMap = new Map<string, { display_name?: string | null; avatar_url?: string | null }>();
    const lbMap = new Map<string, { total_seconds?: number | null; total_plays?: number | null }>();
    const musicMap = new Map<string, { totalSeconds: number; totalPlays: number }>();
    let overrides: OverrideMap = {};

    if (userIds.length > 0) {
      const [profRes, lbRes, musicRes, cfgRes] = await Promise.all([
        admin.from('user_profiles').select('id, display_name, avatar_url').in('id', userIds),
        admin.from('listening_leaderboard').select('user_id, total_seconds, total_plays').in('user_id', userIds),
        admin.from('user_music_data').select('user_id, data').in('user_id', userIds),
        admin.from('app_config').select('value').eq('key', 'leaderboard_overrides').maybeSingle(),
      ]);

      for (const p of (profRes.data || []) as Array<{ id: string; display_name?: string | null; avatar_url?: string | null }>) {
        if (p.id) profileMap.set(p.id, p);
      }
      for (const l of (lbRes.data || []) as Array<{ user_id: string; total_seconds?: number | null; total_plays?: number | null }>) {
        if (l.user_id) lbMap.set(l.user_id, l);
      }
      for (const md of (musicRes.data || []) as Array<{ user_id: string; data?: { history?: unknown } }>) {
        if (md.user_id) musicMap.set(md.user_id, calcHistoryStats(md.data?.history));
      }
      if (cfgRes.data?.value && typeof cfgRes.data.value === 'object') {
        overrides = cfgRes.data.value as OverrideMap;
      }
    }

    const messages = rawMessages.map((m) => enrichMessage(m, profileMap, lbMap, musicMap, overrides));
    const pinned = pinnedRow ? enrichMessage(pinnedRow, profileMap, lbMap, musicMap, overrides) : null;
    const latest = messages.length > 0 ? messages[messages.length - 1] : null;

    return NextResponse.json(
      { messages, pinned, latest },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memuat Global Chat';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) return NextResponse.json({ error: 'Harap login terlebih dahulu.' }, { status: 401 });

    const { anon, admin } = getSupabaseClients();
    const { data: userData, error: authErr } = await anon.auth.getUser(token);
    if (authErr || !userData?.user) {
      return NextResponse.json({ error: 'Sesi login tidak valid.' }, { status: 401 });
    }

    const u = userData.user;
    const isDev = u.id === DEV_UID || (u.email || '').toLowerCase() === DEV_EMAIL;
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      content?: string;
      replyToId?: string | null;
      messageId?: string;
      pinned?: boolean;
    };
    const action = body.action || 'send';

    if (action === 'delete') {
      const messageId = String(body.messageId || '').trim();
      if (!messageId) return NextResponse.json({ error: 'ID pesan wajib diisi.' }, { status: 400 });
      const { data: msg } = await admin
        .from('global_chat_messages')
        .select('id, user_id')
        .eq('id', messageId)
        .maybeSingle();
      if (!msg) return NextResponse.json({ error: 'Pesan tidak ditemukan.' }, { status: 404 });
      if (msg.user_id !== u.id && !isDev) {
        return NextResponse.json({ error: 'Anda hanya dapat menghapus pesan Anda sendiri.' }, { status: 403 });
      }
      await admin
        .from('global_chat_messages')
        .update({ is_deleted: true, is_pinned: false, content: '' })
        .eq('id', messageId);
      return NextResponse.json({ ok: true, deletedId: messageId });
    }

    if (action === 'pin') {
      if (!isDev) {
        return NextResponse.json({ error: 'Hanya developer yang dapat menyematkan pesan.' }, { status: 403 });
      }
      const messageId = String(body.messageId || '').trim();
      if (!messageId) return NextResponse.json({ error: 'ID pesan wajib diisi.' }, { status: 400 });
      const nextPinned = Boolean(body.pinned);
      if (nextPinned) {
        await admin.from('global_chat_messages').update({ is_pinned: false }).eq('is_pinned', true);
        await admin
          .from('global_chat_messages')
          .update({ is_pinned: true })
          .eq('id', messageId)
          .eq('is_deleted', false);
      } else {
        await admin.from('global_chat_messages').update({ is_pinned: false }).eq('id', messageId);
      }
      return NextResponse.json({ ok: true, messageId, pinned: nextPinned });
    }

    const content = String(body.content || '').trim();
    if (!content) return NextResponse.json({ error: 'Pesan tidak boleh kosong.' }, { status: 400 });
    if (content.length > 500) {
      return NextResponse.json({ error: 'Pesan maksimal 500 karakter.' }, { status: 400 });
    }
    const replyToId = body.replyToId ? String(body.replyToId).trim() : null;

    const [banRes, lastMsgRes, profRes, lbRes, musicRes, cfgRes, replyRes] = await Promise.all([
      admin.from('user_bans').select('is_active, banned_until').eq('user_id', u.id).eq('is_active', true).maybeSingle(),
      admin
        .from('global_chat_messages')
        .select('created_at')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin.from('user_profiles').select('display_name, avatar_url').eq('id', u.id).maybeSingle(),
      admin.from('listening_leaderboard').select('total_seconds, total_plays').eq('user_id', u.id).maybeSingle(),
      admin.from('user_music_data').select('data').eq('user_id', u.id).maybeSingle(),
      admin.from('app_config').select('value').eq('key', 'leaderboard_overrides').maybeSingle(),
      replyToId
        ? admin
            .from('global_chat_messages')
            .select('id, display_name, content')
            .eq('id', replyToId)
            .eq('is_deleted', false)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const ban = banRes.data as { is_active?: boolean; banned_until?: string | null } | null;
    const isBanned = Boolean(
      ban?.is_active && (!ban.banned_until || new Date(ban.banned_until).getTime() > Date.now())
    );
    if (isBanned && !isDev) {
      return NextResponse.json({ error: 'Akun Anda sedang ditangguhkan.' }, { status: 403 });
    }

    const lastCreatedAt = (lastMsgRes.data as { created_at?: string } | null)?.created_at;
    if (lastCreatedAt) {
      const elapsed = Date.now() - new Date(lastCreatedAt).getTime();
      if (elapsed >= 0 && elapsed < COOLDOWN_MS) {
        const remaining = Math.max(1, Math.ceil((COOLDOWN_MS - elapsed) / 1000));
        return NextResponse.json(
          { error: `Tunggu ${remaining} detik sebelum mengirim pesan lagi.`, retryAfter: remaining },
          { status: 429 }
        );
      }
    }

    const meta = (u.user_metadata || {}) as Record<string, unknown>;
    const emailPrefix = (u.email || '').split('@')[0].trim().toLowerCase();
    const prof = profRes.data as { display_name?: string | null; avatar_url?: string | null } | null;
    const candidates = [
      String(prof?.display_name || '').trim(),
      String(meta.custom_display_name || '').trim(),
      String(meta.display_name || meta.full_name || meta.name || '').trim(),
    ];
    const displayName =
      candidates.find((c) => c && c.toLowerCase() !== emailPrefix && !c.includes('@')) || 'Pengguna NueTify';
    const avatarUrl =
      String(
        prof?.avatar_url || meta.custom_avatar_url || meta.avatar_url || meta.picture || ''
      ).trim() || null;

    const lb = lbRes.data as { total_seconds?: number | null; total_plays?: number | null } | null;
    const musicStats = calcHistoryStats((musicRes.data as { data?: { history?: unknown } } | null)?.data?.history);
    const overrides = ((cfgRes.data?.value || {}) as OverrideMap)[u.id];
    const totalSeconds =
      typeof overrides?.total_seconds === 'number'
        ? Math.max(0, Math.floor(overrides.total_seconds))
        : Math.max(Number(lb?.total_seconds || 0), musicStats.totalSeconds);
    const totalPlays =
      typeof overrides?.total_plays === 'number'
        ? Math.max(0, Math.floor(overrides.total_plays))
        : Math.max(Number(lb?.total_plays || 0), musicStats.totalPlays);

    const replyTarget = replyRes.data as { id: string; display_name: string; content: string } | null;

    const { data: inserted, error: insErr } = await admin
      .from('global_chat_messages')
      .insert({
        user_id: u.id,
        display_name: displayName,
        avatar_url: avatarUrl,
        is_developer: isDev,
        total_plays: totalPlays,
        total_seconds: totalSeconds,
        content,
        reply_to_id: replyTarget?.id || null,
        reply_to_name: replyTarget?.display_name || null,
        reply_to_content: replyTarget ? replyTarget.content.slice(0, 140) : null,
      })
      .select('*')
      .single();

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, message: inserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memproses pesan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
