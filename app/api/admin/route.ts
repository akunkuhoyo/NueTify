import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const ADMIN_UID = 'ebc0b783-4ebd-44b2-89de-990c57cfd297';
const ADMIN_EMAIL = 'drevviann@gmail.com';

async function verifyAdmin(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey) {
    return { error: NextResponse.json({ ok: false, error: 'Server config missing' }, { status: 500 }) };
  }

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { error: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }) };
  }

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await userClient.auth.getUser(token);
  const u = data?.user;
  if (error || !u) {
    return { error: NextResponse.json({ ok: false, error: 'Invalid token' }, { status: 401 }) };
  }

  const isAllowed =
    u.id === ADMIN_UID || (u.email || '').trim().toLowerCase() === ADMIN_EMAIL;
  if (!isAllowed) {
    return { error: NextResponse.json({ ok: false, error: 'Forbidden: Admin only' }, { status: 403 }) };
  }

  const adminClient = serviceKey
    ? createClient(url, serviceKey, { auth: { persistSession: false } })
    : userClient;

  return { user: u, adminClient, userClient };
}
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if ('error' in auth && auth.error) return auth.error;
  const { adminClient, userClient } = auth;

  // 1. Maintenance config
  const { data: cfgRow } = await userClient
    .from('app_config')
    .select('value, updated_at')
    .eq('key', 'maintenance')
    .maybeSingle();

  const maintVal = (cfgRow?.value as { enabled?: boolean; message?: string } | null) || {};

  // 2. Bans & Audit logs
  const [{ data: banRows }, { data: logRows }] = await Promise.all([
    userClient.from('user_bans').select('*').order('updated_at', { ascending: false }).limit(200),
    userClient.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
  ]);
  // 2b. Leaderboard stats & overrides
  const [{ data: lbStatRows }, { data: overrideCfgRow }] = await Promise.all([
    userClient.from('listening_leaderboard').select('user_id, total_seconds, total_plays').limit(500),
    userClient.from('app_config').select('value').eq('key', 'leaderboard_overrides').maybeSingle(),
    ]);
  
  // 3. Users list (try auth.admin.listUsers via service role, fallback to profiles + leaderboard)
  const usersMap = new Map<string, { id: string; email: string; display_name: string; provider: string; created_at: string }>();

  try {
    const { data: authUsersData } = await adminClient.auth.admin.listUsers({ perPage: 200 });
    if (authUsersData?.users) {
      for (const au of authUsersData.users) {
        usersMap.set(au.id, {
          id: au.id,
          email: au.email || '',
          display_name: String(
            au.user_metadata?.display_name ||
              au.user_metadata?.full_name ||
              au.user_metadata?.name ||
              au.email?.split('@')[0] ||
              'Pengguna NueTify'
          ),
          provider: String(au.app_metadata?.provider || 'email'),
          created_at: au.created_at || '',
        });
      }
    }
  } catch {
    // Fallback to leaderboard/profiles
  }

  if (usersMap.size === 0) {
    const { data: lbRows } = await userClient
      .from('listening_leaderboard')
      .select('user_id, display_name, updated_at')
      .limit(200);
    if (Array.isArray(lbRows)) {
      for (const r of lbRows as Array<{ user_id: string; display_name?: string; updated_at?: string }>) {
        usersMap.set(r.user_id, {
          id: r.user_id,
          email: '',
          display_name: r.display_name || 'Pengguna NueTify',
          provider: 'user',
          created_at: r.updated_at || '',
        });
      }
    }
  }

  const banMap = new Map<string, Record<string, unknown>>();
  if (Array.isArray(banRows)) {
    for (const b of banRows as Array<Record<string, unknown>>) {
      banMap.set(String(b.user_id), b);
    }
  }  
  const overrides = (overrideCfgRow?.value as Record<string, { total_seconds?: number; total_plays?: number }> | null) || {};
    const lbStatsMap = new Map<string, { total_seconds: number; total_plays: number }>();
  if (Array.isArray(lbStatRows)) {
    for (const r of lbStatRows as Array<{ user_id: string; total_seconds?: number; total_plays?: number }>) {
      lbStatsMap.set(String(r.user_id), { total_seconds: Number(r.total_seconds || 0), total_plays: Number(r.total_plays || 0) });
      } }

  const users = Array.from(usersMap.values()).map((u) => {
    const b = banMap.get(u.id);
    const activeBan =
      b &&
      b.is_active === true &&
      (!b.banned_until || new Date(String(b.banned_until)).getTime() > Date.now());
    return {
      ...u,
      is_banned: Boolean(activeBan),
      ban_reason: activeBan ? String(b?.reason || '') : '',
      banned_until: activeBan && b?.banned_until ? String(b.banned_until) : null, total_seconds: Number(overrides[u.id]?.total_seconds ?? lbStatsMap.get(u.id)?.total_seconds ?? 0),
      total_plays: Number(overrides[u.id]?.total_plays ?? lbStatsMap.get(u.id)?.total_plays ?? 0),
      has_stat_override: Boolean(overrides[u.id]),
    };
  });

  return NextResponse.json({
    ok: true,
    maintenance: {
      enabled: Boolean(maintVal.enabled),
      message:
        maintVal.message ||
        'NueTify sedang dalam pemeliharaan sistem. Silakan kembali beberapa saat lagi.',
    },
    users,
    auditLogs: Array.isArray(logRows) ? logRows : [],
  });
}
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if ('error' in auth && auth.error) return auth.error;
  const { user, userClient } = auth; const adminClient = auth.adminClient;

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    enabled?: boolean;
    message?: string;
    targetUserId?: string;
    targetEmail?: string;
    targetDisplayName?: string; totalHours?: number; totalMinutes?: number; totalPlays?: number;
    duration?: string;
    reason?: string;
  };

  if (body.action === 'broadcast_app_update') { const message = (body.message || '').trim() || 'Pembaruan baru NueTify tersedia! Silakan update aplikasi sekarang.'; const payload = { broadcast_id: crypto.randomUUID(), message, broadcast_at: new Date().toISOString(), triggered_by: auth.user.email }; const { error } = await userClient.from('app_config').upsert({ key: 'app_update_broadcast', value: payload, updated_at: new Date().toISOString() }, { onConflict: 'key' }); if (error) { return NextResponse.json({ ok: false, error: error.message }, { status: 400 }); } await userClient.from('admin_audit_logs').insert({ admin_email: user.email || ADMIN_EMAIL, action: 'BROADCAST_APP_UPDATE', details: { message, broadcast_id: payload.broadcast_id } }); return NextResponse.json({ ok: true, broadcast: payload }); } if (body.action === 'toggle_maintenance') {
    const enabled = Boolean(body.enabled);
    const message =
      (body.message || '').trim() ||
      'NueTify sedang dalam pemeliharaan sistem. Silakan kembali beberapa saat lagi.';
    const payload = {
      enabled,
      message,
      updated_at: new Date().toISOString(),
    };
    const { error } = await userClient
      .from('app_config')
      .upsert({ key: 'maintenance', value: payload, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    await userClient.from('admin_audit_logs').insert({
      admin_email: user.email || ADMIN_EMAIL,
      action: enabled ? 'MAINTENANCE_ON' : 'MAINTENANCE_OFF',
      details: { message },
    });
    return NextResponse.json({ ok: true, maintenance: payload });
  }

  if (body.action === 'ban_user') {
    const targetId = (body.targetUserId || '').trim();
    if (!targetId) {
      return NextResponse.json({ ok: false, error: 'Target user ID kosong' }, { status: 400 });
    }
    if (targetId === ADMIN_UID) {
      return NextResponse.json({ ok: false, error: 'Tidak dapat mem-ban akun Administrator utama' }, { status: 400 });
    }
    const reason = (body.reason || '').trim() || 'Melanggar ketentuan NueTify';
    let bannedUntil: string | null = null;
    const now = Date.now();
    switch (body.duration) {
      case '1h':
        bannedUntil = new Date(now + 3600 * 1000).toISOString();
        break;
      case '24h':
        bannedUntil = new Date(now + 24 * 3600 * 1000).toISOString();
        break;
      case '7d':
        bannedUntil = new Date(now + 7 * 24 * 3600 * 1000).toISOString();
        break;
      case '30d':
        bannedUntil = new Date(now + 30 * 24 * 3600 * 1000).toISOString();
        break;
      default:
        bannedUntil = null;
    }

    const { error } = await userClient.from('user_bans').upsert(
      {
        user_id: targetId,
        email: body.targetEmail || '',
        display_name: body.targetDisplayName || '',
        reason,
        banned_until: bannedUntil,
        is_active: true,
        banned_by: user.email || ADMIN_EMAIL,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    await userClient.from('admin_audit_logs').insert({
      admin_email: user.email || ADMIN_EMAIL,
      action: 'BAN_USER',
      target_user_id: targetId,
      target_email: body.targetEmail || '',
      details: { reason, duration: body.duration || 'permanent', banned_until: bannedUntil },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'unban_user') {
    const targetId = (body.targetUserId || '').trim();
    if (!targetId) {
      return NextResponse.json({ ok: false, error: 'Target user ID kosong' }, { status: 400 });
    }
    const { error } = await userClient
      .from('user_bans')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', targetId);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    await userClient.from('admin_audit_logs').insert({
      admin_email: user.email || ADMIN_EMAIL,
      action: 'UNBAN_USER',
      target_user_id: targetId,
      target_email: body.targetEmail || '',
      details: {},
    });
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'update_leaderboard_stats') {
    const targetUserId = (body.targetUserId || '').trim(); if (!targetUserId) { return NextResponse.json({ ok: false, error: 'Target user ID kosong' }, { status: 400 }); }
    const totalHours = Number(body.totalHours || 0); const totalMinutes = Number(body.totalMinutes || 0); const totalPlays = Number(body.totalPlays || 0);
    if (!Number.isFinite(totalHours) || totalHours < 0 || !Number.isFinite(totalMinutes) || totalMinutes < 0 || !Number.isFinite(totalPlays) || totalPlays < 0) { return NextResponse.json({ ok: false, error: 'Angka statistik tidak valid' }, { status: 400 }); }
    const reason = (body.reason || '').trim(); const totalSeconds = Math.max(0, Math.floor(totalHours * 3600 + totalMinutes * 60)); const safePlays = Math.max(0, Math.floor(totalPlays)); const nowIso = new Date().toISOString();
    const { data: cfgRow, error: cfgErr } = await userClient.from('app_config').select('value').eq('key', 'leaderboard_overrides').maybeSingle(); if (cfgErr) { return NextResponse.json({ ok: false, error: cfgErr.message }, { status: 400 }); }
    const currentOverrides = (cfgRow?.value && typeof cfgRow.value === 'object' && !Array.isArray(cfgRow.value) ? cfgRow.value : {}) as Record<string, unknown>; const nextOverrides: Record<string, unknown> = { ...currentOverrides, [targetUserId]: { total_seconds: totalSeconds, total_plays: safePlays, updated_at: nowIso, updated_by: user.email || ADMIN_EMAIL } };
    const { error: cfgUpsertErr } = await userClient.from('app_config').upsert({ key: 'leaderboard_overrides', value: nextOverrides, updated_at: nowIso }, { onConflict: 'key' }); if (cfgUpsertErr) { return NextResponse.json({ ok: false, error: cfgUpsertErr.message }, { status: 400 }); }
    const { data: profRow } = await adminClient.from('user_profiles').select('display_name, avatar_url').eq('id', targetUserId).maybeSingle(); const displayName = String(profRow?.display_name || '').trim() || 'Pengguna NueTify'; const avatarUrl = String(profRow?.avatar_url || '');
    const { error: lbUpsertErr } = await adminClient.from('listening_leaderboard').upsert({ user_id: targetUserId, display_name: displayName, avatar_url: avatarUrl, total_seconds: totalSeconds, total_plays: safePlays, updated_at: nowIso }, { onConflict: 'user_id' }); if (lbUpsertErr) { return NextResponse.json({ ok: false, error: lbUpsertErr.message }, { status: 400 }); }
    await userClient.from('admin_audit_logs').insert({ admin_email: user.email || ADMIN_EMAIL, action: 'UPDATE_LEADERBOARD_STATS', target_user_id: targetUserId, details: { total_hours: totalHours, total_minutes: totalMinutes, total_plays: safePlays, total_seconds: totalSeconds, reason } }); return NextResponse.json({ ok: true, total_seconds: totalSeconds, total_plays: safePlays }); }
  if (body.action === 'reset_leaderboard_override') {
    const targetUserId = (body.targetUserId || '').trim(); if (!targetUserId) { return NextResponse.json({ ok: false, error: 'Target user ID kosong' }, { status: 400 }); }
    const { data: cfgRow, error: cfgErr } = await userClient.from('app_config').select('value').eq('key', 'leaderboard_overrides').maybeSingle(); if (cfgErr) { return NextResponse.json({ ok: false, error: cfgErr.message }, { status: 400 }); }
    const currentOverrides = (cfgRow?.value && typeof cfgRow.value === 'object' && !Array.isArray(cfgRow.value) ? cfgRow.value : {}) as Record<string, unknown>; const nextOverrides: Record<string, unknown> = { ...currentOverrides }; delete nextOverrides[targetUserId];
    const { error: cfgUpsertErr } = await userClient.from('app_config').upsert({ key: 'leaderboard_overrides', value: nextOverrides, updated_at: new Date().toISOString() }, { onConflict: 'key' }); if (cfgUpsertErr) { return NextResponse.json({ ok: false, error: cfgUpsertErr.message }, { status: 400 }); } await userClient.from('admin_audit_logs').insert({ admin_email: user.email || ADMIN_EMAIL, action: 'RESET_LEADERBOARD_OVERRIDE', target_user_id: targetUserId, details: {} }); return NextResponse.json({ ok: true }); }
  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
