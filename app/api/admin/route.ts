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
    return { error: NextResponse.json({ ok: false, error: 'Forbidden: Admin access only' }, { status: 403 }) };
  }

  const adminClient = serviceKey
    ? createClient(url, serviceKey, { auth: { persistSession: false } })
    : null;

  return { user: u, userClient, adminClient };
}

export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if ('error' in auth && auth.error) return auth.error;
  const { userClient, adminClient } = auth;
  const db = adminClient || userClient;

  const [configRes, bansRes, logsRes, lbRes, notificationsRes] = await Promise.all([
    db.from('app_config').select('*'),
    db.from('user_bans').select('*').order('created_at', { ascending: false }).limit(100),
    db.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
    db.from('listening_leaderboard').select('*').order('total_seconds', { ascending: false }).limit(50),
    db.from('app_notifications').select('*').order('created_at', { ascending: false }).limit(10),
  ]);

  let users: Array<{ id: string; email?: string; display_name?: string; created_at?: string; last_sign_in_at?: string }> = [];
  if (adminClient) {
    try {
      const { data: listData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 100 });
      if (listData?.users) {
        users = listData.users.map((usr) => ({
          id: usr.id,
          email: usr.email,
          display_name: (usr.user_metadata?.full_name || usr.user_metadata?.name || usr.email?.split('@')[0] || 'Pengguna') as string,
          created_at: usr.created_at,
          last_sign_in_at: usr.last_sign_in_at,
        }));
      }
    } catch {
      // ignore
    }
  }
  const maintRow = (configRes.data || []).find((c: { key?: string }) => c.key === 'maintenance');
  const maintVal = (maintRow?.value || {}) as { enabled?: boolean; message?: string };
  const maintenance = {
    enabled: Boolean(maintVal.enabled),
    message: String(maintVal.message || ''),
  };

  return NextResponse.json({
    ok: true,
    config: configRes.data || [],
    bans: bansRes.data || [],
    logs: logsRes.data || [],
    leaderboard: lbRes.data || [],
    notifications: notificationsRes.data || [],
    users,
maintenance,
auditLogs: logsRes.data || [],
  });
}

interface PostBody {
  action?: string;
  key?: string;
  value?: unknown;
  user_id?: string;
  email?: string;
  display_name?: string;
  reason?: string;
  duration_hours?: number | null;
  total_seconds?: number;
  total_plays?: number;
  title?: string;
  body?: string;
  enabled?: boolean;
  message?: string;
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if ('error' in auth && auth.error) return auth.error;
  const { user, userClient, adminClient } = auth;
  const db = adminClient || userClient;

  let body: PostBody = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  if (body.action === 'toggle_maintenance') {
    const nextEnabled = Boolean(body.enabled);
    const nextMessage =
      String(body.message || '').trim() ||
      'NueTify sedang dalam pemeliharaan sistem. Silakan kembali beberapa saat lagi.';
    const { error } = await db.from('app_config').upsert(
      {
        key: 'maintenance',
        value: { enabled: nextEnabled, message: nextMessage },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    try { await db.from('admin_audit_logs').insert({
      admin_email: user.email || ADMIN_EMAIL,
      action: nextEnabled ? 'ENABLE_MAINTENANCE' : 'DISABLE_MAINTENANCE',
      details: { enabled: nextEnabled, message: nextMessage },
    }); } catch {}
    return NextResponse.json({
      ok: true,
      maintenance: { enabled: nextEnabled, message: nextMessage },
    });
  }

  if (body.action === 'update_config') {
    if (!body.key) {
      return NextResponse.json({ ok: false, error: 'Key required' }, { status: 400 });
    }
      const { error } = await db.from('app_config').upsert({ key: body.key, value: body.value ?? {}, updated_at: new Date().toISOString() },     { onConflict: 'key' }
    );
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    await db.from('admin_audit_logs').insert({
      admin_email: user.email || ADMIN_EMAIL,
      action: 'UPDATE_CONFIG',
      details: { key: body.key, value: body.value },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'ban_user') {
    if (!body.user_id) {
      return NextResponse.json({ ok: false, error: 'user_id required' }, { status: 400 });
    }
    if (body.user_id === ADMIN_UID || (body.email || '').toLowerCase() === ADMIN_EMAIL) {
      return NextResponse.json({ ok: false, error: 'Cannot ban primary administrator' }, { status: 400 });
    }
    const bannedUntil =
      body.duration_hours && body.duration_hours > 0
        ? new Date(Date.now() + body.duration_hours * 3600_000).toISOString()
        : null;

    const { error } = await db.from('user_bans').upsert(
      {
        user_id: body.user_id,
        email: body.email || '',
        display_name: body.display_name || 'Pengguna',
        reason: body.reason || 'Melanggar kebijakan penggunaan NueTify',
        banned_by: user.email || ADMIN_EMAIL,
        banned_until: bannedUntil,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    await db.from('listening_leaderboard').delete().eq('user_id', body.user_id);

    await db.from('admin_audit_logs').insert({
      admin_email: user.email || ADMIN_EMAIL,
      action: 'BAN_USER',
      target_user_id: body.user_id,
      target_email: body.email || '',
      details: { reason: body.reason, duration_hours: body.duration_hours },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'unban_user') {
    if (!body.user_id) {
      return NextResponse.json({ ok: false, error: 'user_id required' }, { status: 400 });
    }
    const { error } = await db
      .from('user_bans')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', body.user_id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    await db.from('admin_audit_logs').insert({
      admin_email: user.email || ADMIN_EMAIL,
      action: 'UNBAN_USER',
      target_user_id: body.user_id,
      target_email: body.email || '',
      details: {},
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'delete_leaderboard_entry') {
    if (!body.user_id) {
      return NextResponse.json({ ok: false, error: 'user_id required' }, { status: 400 });
    }
    const { error } = await db.from('listening_leaderboard').delete().eq('user_id', body.user_id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    await db.from('admin_audit_logs').insert({
      admin_email: user.email || ADMIN_EMAIL,
      action: 'DELETE_LEADERBOARD_ENTRY',
      target_user_id: body.user_id,
      details: {},
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'update_leaderboard_stats') {
    if (!body.user_id) {
      return NextResponse.json({ ok: false, error: 'user_id required' }, { status: 400 });
    }
    const totalSeconds = Math.max(0, Math.round(Number(body.total_seconds ?? 0)));
    const totalPlays = Math.max(0, Math.round(Number(body.total_plays ?? 0)));
    const { error } = await db
      .from('listening_leaderboard')
      .update({ total_seconds: totalSeconds, total_plays: totalPlays, updated_at: new Date().toISOString() })
      .eq('user_id', body.user_id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    await db.from('admin_audit_logs').insert({
      admin_email: user.email || ADMIN_EMAIL,
      action: 'UPDATE_LEADERBOARD_STATS',
      target_user_id: body.user_id,
      details: { total_seconds: totalSeconds, total_plays: totalPlays },
    });
    return NextResponse.json({ ok: true, total_seconds: totalSeconds, total_plays: totalPlays });
  }

  if (body.action === 'reset_leaderboard_override') {
    const targetUid = body.user_id || user.id;
    const targetHours = Number((body as { hours?: number }).hours ?? 12);
    const totalSeconds = Math.max(0, Math.round(targetHours * 3600));
    const totalPlays = Math.max(0, Math.round(Number(body.total_plays ?? Math.round(totalSeconds / 210))));
    const { error } = await db
      .from('listening_leaderboard')
      .upsert(
        {
          user_id: targetUid,
          display_name: body.display_name || 'Developer NueTify',
          total_seconds: totalSeconds,
          total_plays: totalPlays,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    await db.from('admin_audit_logs').insert({
      admin_email: user.email || ADMIN_EMAIL,
      action: 'RESET_LEADERBOARD_OVERRIDE',
      target_user_id: targetUid,
      details: { hours: targetHours, total_seconds: totalSeconds, total_plays: totalPlays },
    });
    return NextResponse.json({ ok: true, total_seconds: totalSeconds, total_plays: totalPlays });
  }

  if (body.action === 'send_broadcast_notification') {
    const title = (body.title || '').trim();
    const messageBody = (body.body || '').trim();
    if (!title || !messageBody) {
      return NextResponse.json({ ok: false, error: 'Judul dan isi notifikasi wajib diisi' }, { status: 400 });
    }
    const { data: notification, error: notifErr } = await db
      .from('app_notifications')
      .insert({
        title,
        body: messageBody,
        sent_by: auth.user.email || ADMIN_EMAIL,
      })
      .select()
      .single();
    if (notifErr) {
      return NextResponse.json({ ok: false, error: notifErr.message }, { status: 400 });
    }
    await db.from('admin_audit_logs').insert({
      admin_email: auth.user.email || ADMIN_EMAIL,
      action: 'BROADCAST_NOTIFICATION',
      details: { title, body: messageBody, notification_id: notification?.id },
    });
    return NextResponse.json({ ok: true, notification });
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
