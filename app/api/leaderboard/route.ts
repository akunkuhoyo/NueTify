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
    totalSeconds += Number.isFinite(sec) && sec > 0 ? sec : 180;
  }
  return {
    totalSeconds: Math.max(1, Math.floor(totalSeconds)),
    totalPlays: history.length,
  };
}
function pickLeaderboardName(rawName: string | undefined, authInfo?: { emailPrefix: string; metaName: string; metaAvatar: string }): string { const trimmed = (rawName || '').trim(); if (authInfo) { if (trimmed && trimmed.toLowerCase() !== authInfo.emailPrefix) return trimmed; if (authInfo.metaName) return authInfo.metaName; if (trimmed && trimmed.toLowerCase() === authInfo.emailPrefix) return 'Pengguna NueTify'; } return trimmed || 'Pengguna NueTify'; }

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ entries: [] });
  }

  const byUser = new Map<string, LeaderboardRow>();
const authMap = new Map<string, { emailPrefix: string; metaName: string; metaAvatar: string; customAvatar: string }>();
  const profMap = new Map<string, { display_name: string; avatar_url: string }>();
  // 1. Coba baca tabel listening_leaderboard menggunakan anonKey (publik RLS)
  try {
    const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data } = await anonClient
      .from('listening_leaderboard')
      .select('user_id, display_name, avatar_url, total_seconds, total_plays')
      .gte('total_seconds', 60)
      .order('total_seconds', { ascending: false })
      .limit(50);
    if (Array.isArray(data)) {
      for (const row of data as LeaderboardRow[]) {
        byUser.set(row.user_id, row);
      }
    }
  } catch {
    // ignore
  }
  
  
  // 2. Jika serviceKey tersedia dan valid, gabungkan juga dari user_music_data + user_profiles
  let overrides: Record<string, { total_seconds?: number; total_plays?: number }> = {}; const bannedUserIds = new Set<string>(); if (serviceKey) {
    try {
      const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
      const [{ data: musicRows }, { data: profileRows }, authListRes, { data: overrideRow }, { data: banRows }] = await Promise.all([
        admin.from('user_music_data').select('user_id, data').limit(200),
        admin.from('user_profiles').select('id, display_name, avatar_url').limit(200), admin.auth.admin.listUsers({ perPage: 200 }).catch(() => ({ data: { users: [] } })), admin.from('app_config').select('value').eq('key', 'leaderboard_overrides').maybeSingle(), admin.from('user_bans').select('user_id, is_active, expires_at').eq('is_active', true),
      ]); for (const u of authListRes?.data?.users || []) { const emailPrefix = (u.email || '').split('@')[0].trim().toLowerCase(); const metaName = String(u.user_metadata?.display_name || u.user_metadata?.full_name || u.user_metadata?.name || '').trim(); const metaAvatar = String(u.user_metadata?.avatar_url || u.user_metadata?.picture || '').trim(); const customAvatar = String(u.user_metadata?.custom_avatar_url || '').trim(); authMap.set(u.id, { emailPrefix, metaName, metaAvatar, customAvatar }); }
            if (Array.isArray(banRows)) { const nowMs = Date.now(); for (const b of banRows as Array<{ user_id?: string; is_active?: boolean; expires_at?: string | null }>) { if (b.user_id && b.is_active === true && (!b.expires_at || new Date(b.expires_at).getTime() > nowMs)) { bannedUserIds.add(b.user_id); } } }
      if (Array.isArray(profileRows)) {
        for (const p of profileRows as Array<{ id: string; display_name?: string; avatar_url?: string }>) {
          profMap.set(p.id, {
            display_name: p.display_name || 'Pengguna NueTify',
            avatar_url: p.avatar_url || '',
          });
        }
      }
      if (Array.isArray(musicRows)) {
        for (const m of musicRows as Array<{ user_id: string; data?: { history?: unknown } }>) {
          const stats = calcHistoryStats(m.data?.history);
          if (stats.totalSeconds < 60) continue;
          const prof = profMap.get(m.user_id);
          const existing = byUser.get(m.user_id);
          if (!existing || stats.totalSeconds > existing.total_seconds || stats.totalPlays > existing.total_plays) {
            byUser.set(m.user_id, {
              user_id: m.user_id,
              display_name: prof?.display_name || existing?.display_name || 'Pengguna NueTify',
              avatar_url: prof?.avatar_url || existing?.avatar_url || '',
              total_seconds: Math.max(existing?.total_seconds || 0, stats.totalSeconds),
              total_plays:Math.max(existing?.total_plays || 0,  stats.totalPlays),
          is_verified: m.user_id === 'ebc0b783-4ebd-44b2-89de-990c57cfd297',
            });
          }
        }
      } overrides = (overrideRow?.value && typeof overrideRow.value === 'object' ? overrideRow.value : {}) as Record<string, { total_seconds?: number; total_plays?: number }>;
      for (const [uid, ov] of Object.entries(overrides)) { if (!ov || typeof ov !== 'object') continue; const ovSec = Number(ov.total_seconds); const ovPlay = Number(ov.total_plays); const safeSec = Number.isFinite(ovSec) && ovSec >= 0 ? Math.floor(ovSec) : undefined; const safePlay = Number.isFinite(ovPlay) && ovPlay >= 0 ? Math.floor(ovPlay) : undefined; const prev = byUser.get(uid); if (prev) { byUser.set(uid, { ...prev, total_seconds: safeSec !== undefined ? safeSec : prev.total_seconds, total_plays: safePlay !== undefined ? safePlay : prev.total_plays }); } else if ((safeSec ?? 0) > 0 || (safePlay ?? 0) > 0) { const prof = profMap.get(uid); const authInfo = authMap.get(uid); byUser.set(uid, { user_id: uid, display_name: prof?.display_name || authInfo?.metaName || 'Pengguna NueTify', avatar_url: prof?.avatar_url || authInfo?.customAvatar || authInfo?.metaAvatar || '', total_seconds: safeSec ?? 0, total_plays: safePlay ?? 0, is_verified: uid === 'ebc0b783-4ebd-44b2-89de-990c57cfd297' }); } }
    } catch {
      // ignore if service key unavailable
    }
  }

  const entries = Array.from(byUser.values()).filter((row) => { if (bannedUserIds.has(row.user_id)) return false; const ov = overrides[row.user_id]; const hasOverride = Boolean(ov && typeof ov === 'object' && ((Number(ov.total_seconds) > 0) || (Number(ov.total_plays) > 0))); return row.total_seconds >= 60 || hasOverride; })
    .sort((a, b) => b.total_seconds - a.total_seconds)
    .slice(0, 50)
    .map((row) => { const authInfo = authMap.get(row.user_id); return {
      ...row, display_name: pickLeaderboardName(row.display_name, authInfo), avatar_url:profMap.get(row.user_id)?.avatar_url || authInfo?.customAvatar ||  row.avatar_url || authInfo?.metaAvatar || '',
      is_verified: row.user_id === 'ebc0b783-4ebd-44b2-89de-990c57cfd297',
    }; });

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ ok: false, error: 'Missing Supabase env' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    totalSeconds?: number;
    totalPlays?: number;
    displayName?: string;
    avatarUrl?: string;
  };

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
  }

  const u = userData.user;
  const rawTotalSeconds = Number(body.totalSeconds); const rawTotalPlays = Number(body.totalPlays); if (!Number.isFinite(rawTotalSeconds) || rawTotalSeconds < 0 || !Number.isFinite(rawTotalPlays) || rawTotalPlays < 0) { return NextResponse.json({ ok: false, error: 'Invalid stats' }, { status: 400 }); } let totalSeconds = Math.floor(rawTotalSeconds);
  let totalPlays = Math.floor(rawTotalPlays);
  const emailPrefix = (u.email || '').split('@')[0].trim().toLowerCase();
  const metaName = String(u.user_metadata?.display_name || u.user_metadata?.full_name || u.user_metadata?.name || '').trim();
  const rawBodyName = (body.displayName || '').trim();
  const displayName = rawBodyName && rawBodyName.toLowerCase() !== emailPrefix ? rawBodyName : metaName || 'Pengguna NueTify'; const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; const admin = serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false } }) : null; let hasAdminOverride = false; let existingProfile: { avatar_url?: string | null } | null = null;
  if (admin) { const { data: banRows } = await admin.from('user_bans').select('is_active, expires_at').eq('user_id', u.id).eq('is_active', true); if (Array.isArray(banRows) && banRows.some((b) => b.is_active === true && (!b.expires_at || new Date(b.expires_at).getTime() > Date.now()))) { return NextResponse.json({ error: 'Account banned' }, { status: 403 }); } const [{ data: existing }, { data: prof }, { data: overrideRow }] = await Promise.all([ admin.from('listening_leaderboard').select('total_seconds, total_plays, updated_at').eq('user_id', u.id).maybeSingle(), admin.from('user_profiles').select('avatar_url').eq('id', u.id).maybeSingle(), admin.from('app_config').select('value').eq('key', 'leaderboard_overrides').maybeSingle() ]); existingProfile = prof; const overrides = (overrideRow?.value && typeof overrideRow.value === 'object' ? overrideRow.value : {}) as Record<string, { total_seconds?: number; total_plays?: number }>; const adminOv = overrides[u.id]; if (adminOv && typeof adminOv === 'object') { hasAdminOverride = true; if (Number.isFinite(Number(adminOv.total_seconds)) && Number(adminOv.total_seconds) >= 0) totalSeconds = Math.floor(Number(adminOv.total_seconds)); if (Number.isFinite(Number(adminOv.total_plays)) && Number(adminOv.total_plays) >= 0) totalPlays = Math.floor(Number(adminOv.total_plays)); } else { const prevMs = existing?.updated_at ? new Date(existing.updated_at).getTime() : NaN; const elapsedSec = Number.isFinite(prevMs) ? Math.max(60, Math.floor((Date.now() - prevMs) / 1000)) : 3600; const maxAllowedSeconds = (existing?.total_seconds || 0) + Math.max(900, Math.floor(elapsedSec * 2.5)); const maxAllowedPlays = (existing?.total_plays || 0) + Math.max(15, Math.ceil(elapsedSec / 20)); totalSeconds = Math.min(totalSeconds, maxAllowedSeconds); totalPlays = Math.min(totalPlays, maxAllowedPlays); } }
  if (totalSeconds < 60 && !hasAdminOverride) { return NextResponse.json({ ok: true, skipped: true }); } const avatarUrl =
    String(existingProfile?.avatar_url || '').trim() || (body.avatarUrl || '').trim() ||
    String(u.user_metadata?.custom_avatar_url || u.user_metadata?.avatar_url || u.user_metadata?.picture || '');

  const { error: upsertErr } = await (admin || userClient).from('listening_leaderboard').upsert(
    {
      user_id: u.id,
      display_name: displayName,
      avatar_url: avatarUrl,
      total_seconds: totalSeconds,
      total_plays: totalPlays,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (upsertErr) {
    return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
