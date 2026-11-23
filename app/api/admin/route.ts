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
      banned_until: activeBan && b?.banned_until ? String(b.banned_until) : null,
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
  const { user, userClient } = auth;

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    enabled?: boolean;
    message?: string;
    targetUserId?: string;
    targetEmail?: string;
    targetDisplayName?: string;
    duration?: string;
    reason?: string;
  };

  if (body.action === 'toggle_maintenance') {
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

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
