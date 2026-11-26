import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface LeaderboardRow {
  user_id: string;
  display_name: string;
  avatar_url: string;
  total_seconds: number;
  total_plays: number;
  is_verified: boolean;
}

function calcHistoryStats(history: unknown): { totalSeconds: number; totalPlays: number } {
  if (!Array.isArray(history) || history.length === 0) {
    return { totalSeconds: 0, totalPlays: 0 };
  }
  let totalSeconds = 0;
  for (const ev of history) {
    const rec = ev as {
      durationListenedSec?: number;
      durationSec?: number;
      duration?: number;
      track?: { duration?: number; durationSec?: number };
    };
    const sec = Number(
      rec?.durationListenedSec ??
        rec?.durationSec ??
        rec?.track?.durationSec ??
        rec?.track?.duration ??
        rec?.duration ??
        180
    );
    totalSeconds += Number.isFinite(sec) && sec > 0 ? Math.min(sec, 3600) : 180;
  }
  return { totalSeconds: Math.round(totalSeconds), totalPlays: history.length };
}

function getSupabaseClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey) return null;
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const admin = serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null;
  return { anon, admin };
}

export async function GET(req: NextRequest) {
  try {
    const clients = getSupabaseClients();
    if (!clients) return NextResponse.json({ entries: [] });
    const { anon, admin } = clients;
    const db = admin || anon;

    const bannedUserIds = new Set<string>();
    if (admin) {
      const { data: banRows } = await admin
        .from('user_bans')
        .select('user_id, is_active, banned_until')
        .eq('is_active', true);
      if (Array.isArray(banRows)) {
        const nowMs = Date.now();
        for (const b of banRows as Array<{ user_id?: string; is_active?: boolean; banned_until?: string | null }>) {
          if (b.user_id && b.is_active === true && (!b.banned_until || new Date(b.banned_until).getTime() > nowMs)) {
            bannedUserIds.add(b.user_id);
          }
        }
      }
    }

    const { data: rows, error } = await db
      .from('listening_leaderboard')
      .select('user_id, display_name, avatar_url, total_seconds, total_plays')
      .order('total_seconds', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[leaderboard GET] query error:', error.message);
      return NextResponse.json({ entries: [], error: error.message });
    }

    const rowList = (rows || []) as Array<{
      user_id: string;
      display_name: string | null;
      avatar_url: string | null;
      total_seconds: number | null;
      total_plays: number | null;
    }>;

    const userIds = rowList.map((r) => r.user_id).filter(Boolean);
    const profileMap = new Map<string, { display_name?: string | null; avatar_url?: string | null }>();
    if (userIds.length > 0) {
      const { data: profiles } = await db
        .from('user_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      if (Array.isArray(profiles)) {
        for (const p of profiles as Array<{ user_id: string; display_name?: string | null; avatar_url?: string | null }>) {
          profileMap.set(p.user_id, p);
        }
      }
    }

    const verifiedUserIds = new Set<string>(['ebc0b783-4ebd-44b2-89de-990c57cfd297']);
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        const { data: { user } } = await anon.auth.getUser(token);
        if (user?.id) {
          const isEmailVerified = Boolean(user.email_confirmed_at || user.confirmed_at);
          if (isEmailVerified) verifiedUserIds.add(user.id);
        }
      }
    }

    const entries: LeaderboardRow[] = rowList
      .filter((row) => {
        if (!row.user_id) return false;
        if (bannedUserIds.has(row.user_id)) return false;
        const sec = Number(row.total_seconds || 0);
        const plays = Number(row.total_plays || 0);
        return sec > 0 || plays > 0;
      })
      .map((row) => {
        const prof = profileMap.get(row.user_id);
        const rawName = (prof?.display_name || row.display_name || '').trim();
        const isValidName =
          rawName.length > 0 &&
          rawName.toLowerCase() !== 'undefined' &&
          rawName.toLowerCase() !== 'null' &&
          !rawName.includes('@');
        const displayName = isValidName ? rawName : 'Pengguna NueTify';
        const avatarUrl = (prof?.avatar_url || row.avatar_url || '').trim();
        return {
          user_id: row.user_id,
          display_name: displayName,
          avatar_url: avatarUrl,
          total_seconds: Number(row.total_seconds || 0),
          total_plays: Number(row.total_plays || 0),
          is_verified: verifiedUserIds.has(row.user_id),
        };
      });

    return NextResponse.json({ entries });
  } catch (err) {
    console.error('[leaderboard GET] unexpected error:', err);
    return NextResponse.json({ entries: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const clients = getSupabaseClients();
    if (!clients) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    const { anon, admin } = clients;

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.slice(7).trim();
    const { data: { user: u }, error: userErr } = await anon.auth.getUser(token);
    if (userErr || !u) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (admin) {
      const { data: banRow } = await admin
        .from('user_bans')
        .select('is_active, banned_until')
        .eq('user_id', u.id)
        .eq('is_active', true)
        .maybeSingle();
      if (banRow && banRow.is_active === true && (!banRow.banned_until || new Date(banRow.banned_until).getTime() > Date.now())) {
        return NextResponse.json({ error: 'Account banned' }, { status: 403 });
      }
    }

    const body = await req.json();
    let totalSeconds = Math.max(0, Number(body?.total_seconds || 0));
    let totalPlays = Math.max(0, Number(body?.total_plays || 0));
    const hasAdminOverride = Number(body?.total_seconds) >= 0 && body?.admin_override === true;
    if (body?.history && !hasAdminOverride) {
      const calc = calcHistoryStats(body.history);
      totalSeconds = Math.max(totalSeconds, calc.totalSeconds);
      totalPlays = Math.max(totalPlays, calc.totalPlays);
    }

    const db = admin || anon;
    const { data: existing } = await db
      .from('listening_leaderboard')
      .select('total_seconds, total_plays, updated_at')
      .eq('user_id', u.id)
      .maybeSingle();
    const { data: existingProfile } = await db
      .from('user_profiles')
      .select('display_name, avatar_url, updated_at')
      .eq('user_id', u.id)
      .maybeSingle();

    const isDeveloper =
      u.id === 'ebc0b783-4ebd-44b2-89de-990c57cfd297' ||
      u.email?.toLowerCase() === 'drevviann@gmail.com';
    const existingSeconds = existing?.total_seconds || 0;
    const existingPlays = existing?.total_plays || 0;
    const rawSeconds = totalSeconds;
    const rawPlays = totalPlays;

    if (hasAdminOverride) {
      totalSeconds = Math.max(0, Number(body.total_seconds || 0));
      totalPlays = Math.max(0, Number(body.total_plays || 0));
    } else {
      const prevMs = existing?.updated_at ? new Date(existing.updated_at).getTime() : NaN;
      const elapsedSec = Number.isFinite(prevMs) ? Math.max(60, Math.floor((Date.now() - prevMs) / 1000)) : 3600;
      const deltaSeconds = Math.max(0, rawSeconds - existingSeconds);
      const deltaPlays = Math.max(0, rawPlays - existingPlays);

      if (!isDeveloper && ((deltaPlays >= 12 && elapsedSec <= 120) || (deltaSeconds > Math.max(1800, elapsedSec * 4)))) {
        if (admin) {
          const bannedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          const reason =
            'Auto-Ban 24 Jam (Sistem Anti-Cheat NueTify): Terdeteksi lonjakan tidak wajar pada statistik waktu dengar/jumlah putar Leaderboard (indikasi auto-clicker atau manipulasi sistem).';
          const banDisplayName =
            (existingProfile?.display_name && String(existingProfile.display_name).trim()) || 'Pengguna NueTify';

          await admin.from('user_bans').upsert(
            {
              user_id: u.id,
              email: u.email || '',
              display_name: banDisplayName,
              reason,
              banned_until: bannedUntil,
              is_active: true,
              banned_by: 'SYSTEM_ANTI_CHEAT',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

          await admin.from('listening_leaderboard').delete().eq('user_id', u.id);

          await admin.from('admin_audit_logs').insert({
            admin_email: 'SYSTEM_ANTI_CHEAT',
            action: 'AUTO_BAN_CHEAT_24H',
            target_user_id: u.id,
            target_email: u.email || '',
            details: {
              deltaSeconds,
              deltaPlays,
              elapsedSec,
              banned_until: bannedUntil,
              reason,
            },
          });
        }
        return NextResponse.json({ error: 'Auto-banned for 24 hours', banned: true }, { status: 403 });
      }

      const maxAllowedSeconds = existingSeconds + Math.max(240, Math.floor(elapsedSec * 1.5));
      const maxAllowedPlays = existingPlays + Math.max(4, Math.ceil(elapsedSec / 30));
      totalSeconds = Math.min(totalSeconds, maxAllowedSeconds);
      totalPlays = Math.min(totalPlays, maxAllowedPlays);
    }

    const rawBodyName = typeof body?.display_name === 'string' ? body.display_name.trim() : '';
    const profileDisplayName =
      (existingProfile?.display_name && String(existingProfile.display_name).trim()) ||
      (rawBodyName && rawBodyName.toLowerCase() !== 'undefined' && rawBodyName.toLowerCase() !== 'null' && !rawBodyName.includes('@')
        ? rawBodyName
        : '') ||
      (typeof u.user_metadata?.full_name === 'string' ? u.user_metadata.full_name.trim() : '') ||
      (typeof u.user_metadata?.name === 'string' ? u.user_metadata.name.trim() : '') ||
      'Pengguna NueTify';

    const avatarUrl =
      (existingProfile?.avatar_url && String(existingProfile.avatar_url).trim()) ||
      (typeof body?.avatar_url === 'string' ? body.avatar_url.trim() : '') ||
      (typeof u.user_metadata?.avatar_url === 'string' ? u.user_metadata.avatar_url.trim() : '') ||
      '';

    const { error: upsertErr } = await db.from('listening_leaderboard').upsert(
      {
        user_id: u.id,
        display_name: profileDisplayName,
        avatar_url: avatarUrl,
        total_seconds: totalSeconds,
        total_plays: totalPlays,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      total_seconds: totalSeconds,
      total_plays: totalPlays,
    });
  } catch (err) {
    console.error('[leaderboard POST] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
