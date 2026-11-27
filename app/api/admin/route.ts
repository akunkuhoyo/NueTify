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
    return { error: NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }) };
  }

  const adminClient = serviceKey
    ? createClient(url, serviceKey, { auth: { persistSession: false } })
    : null;

  return { user: u, userClient, adminClient };
}

function parseDurationHours(duration?: string, durationHours?: number | null): number | null {
  if (duration) {
    const d = duration.trim().toLowerCase();
    if (d === 'permanent') return null;
    const match = d.match(/^(\d+)(h|d)$/);
    if (match) {
      const num = Number(match[1]);
      return match[2] === 'd' ? num * 24 : num;
    }
  }
  return typeof durationHours === 'number' ? durationHours : null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdmin(req);
    if ('error' in auth && auth.error) return auth.error;
    const { userClient, adminClient } = auth;
    const db = adminClient || userClient;

    const [configRes, bansRes, logsRes, lbRes, notificationsRes, profilesRes] = await Promise.all([
      db.from('app_config').select('*'),
      db.from('user_bans').select('*').order('created_at', { ascending: false }).limit(100),
      db.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
      db.from('listening_leaderboard').select('*').order('total_seconds', { ascending: false }).limit(50),
      db.from('app_notifications').select('*').order('created_at', { ascending: false }).limit(10),
      db.from('user_profiles').select('id, display_name, avatar_url'),
    ]);

    const profileMap = new Map<string, { display_name?: string | null; avatar_url?: string | null }>();
    for (const p of profilesRes.data || []) {
      if (p.id) profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
    }

    const banMap = new Map<string, any>();
    for (const b of bansRes.data || []) {
      if (b.user_id && !banMap.has(b.user_id)) {
        banMap.set(b.user_id, b);
      }
    }

    const lbMap = new Map<string, { total_seconds?: number; total_plays?: number }>();
    for (const row of lbRes.data || []) {
      if (row.user_id) {
        lbMap.set(row.user_id, {
          total_seconds: row.total_seconds,
          total_plays: row.total_plays,
        });
      }
    }

    const overridesRow = (configRes.data || []).find((c) => c.key === 'leaderboard_overrides');
    const overrides = (overridesRow?.value || {}) as Record<string, { total_seconds?: number; total_plays?: number }>;

    let users: Array<{
      id: string;
      email: string;
      display_name: string;
      provider: string;
      created_at: string;
      last_sign_in_at: string | null;
      is_banned: boolean;
      ban_reason: string | null;
      banned_until: string | null;
      total_seconds: number;
      total_plays: number;
      has_stat_override: boolean;
    }> = [];

    if (adminClient) {
      const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 200 });
      const authUsers = usersData?.users || [];
      users = authUsers.map((usr) => {
        const ban = banMap.get(usr.id);
        const isActiveBan = Boolean(
          ban && ban.is_active && (!ban.banned_until || new Date(ban.banned_until).getTime() > Date.now())
        );
        const lb = lbMap.get(usr.id);
        const ov = overrides[usr.id];

        return {
          id: usr.id,
          email: usr.email || '',
          display_name:
            profileMap.get(usr.id)?.display_name ||
            usr.user_metadata?.custom_display_name ||
            usr.user_metadata?.display_name ||
            usr.user_metadata?.full_name ||
            usr.user_metadata?.name ||
            'Pengguna NueTify',
          provider: String(usr.app_metadata?.provider || 'email'),
          created_at: usr.created_at,
          last_sign_in_at: usr.last_sign_in_at || null,
          is_banned: isActiveBan,
          ban_reason: isActiveBan ? (ban?.reason || '') : null,
          banned_until: isActiveBan ? (ban?.banned_until || null) : null,
          total_seconds: typeof ov?.total_seconds === 'number' ? ov.total_seconds : Number(lb?.total_seconds || 0),
          total_plays: typeof ov?.total_plays === 'number' ? ov.total_plays : Number(lb?.total_plays || 0),
          has_stat_override: Boolean(ov),
        };
      });
    }

    const maintenanceRow = (configRes.data || []).find((c) => c.key === 'maintenance');
    const maintenance = maintenanceRow?.value || {
      enabled: false,
      message: 'Aplikasi sedang dalam pemeliharaan. Silakan coba lagi nanti.',
    };

    return NextResponse.json({
      ok: true,
      maintenance,
      users,
      auditLogs: logsRes.data || [],
      notifications: notificationsRes.data || [],
      config: configRes.data || [],
      bans: bansRes.data || [],
      logs: logsRes.data || [],
      leaderboard: lbRes.data || [],
    });
  } catch (err: any) {
    console.error('Admin GET error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Internal error' }, { status: 500 });
  }
}

interface PostBody {
  action?: string;
  key?: string;
  value?: unknown;
  enabled?: boolean;
  reason?: string;
  message?: string;
  title?: string;
  body?: string;
  user_id?: string;
  email?: string;
  display_name?: string;
  targetUserId?: string;
  targetEmail?: string;
  targetDisplayName?: string;
  duration?: string;
  duration_hours?: number | null;
  total_seconds?: number;
  total_plays?: number;
  totalHours?: number;
  totalMinutes?: number;
  totalPlays?: number;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdmin(req);
    if ('error' in auth && auth.error) return auth.error;
    const { user, userClient, adminClient } = auth;
    const db = adminClient || userClient;

    const body = (await req.json()) as PostBody;
    const action = body.action;

    if (!action) {
      return NextResponse.json({ ok: false, error: 'Missing action' }, { status: 400 });
    }

    if (action === 'toggle_maintenance') {
      const enabled = Boolean(body.enabled);
      const message = body.message || 'Aplikasi sedang dalam pemeliharaan. Silakan coba lagi nanti.';
      const { error } = await db
        .from('app_config')
        .upsert(
          { key: 'maintenance', value: { enabled, message }, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

      await db.from('admin_audit_logs').insert({
        action: enabled ? 'ENABLE_MAINTENANCE' : 'DISABLE_MAINTENANCE',
        details: { enabled, message },
        admin_email: user.email || ADMIN_EMAIL,
      });

      return NextResponse.json({ ok: true, maintenance: { enabled, message } });
    }

    if (action === 'update_config') {
      if (!body.key) return NextResponse.json({ ok: false, error: 'Missing key' }, { status: 400 });
      const { error } = await db
        .from('app_config')
        .upsert(
          { key: body.key, value: body.value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

      await db.from('admin_audit_logs').insert({
        action: 'UPDATE_CONFIG',
        details: { key: body.key, value: body.value },
        admin_email: user.email || ADMIN_EMAIL,
      });

      return NextResponse.json({ ok: true });
    }

    if (action === 'ban_user') {
      const targetId = body.targetUserId || body.user_id;
      if (!targetId) {
        return NextResponse.json({ ok: false, error: 'Missing target user ID' }, { status: 400 });
      }
      const targetEmail = body.targetEmail || body.email || '';
      const targetDisplayName = body.targetDisplayName || body.display_name || 'Pengguna NueTify';
      const hours = parseDurationHours(body.duration, body.duration_hours);
      const bannedUntil = hours !== null ? new Date(Date.now() + hours * 3600 * 1000).toISOString() : null;
      const reason = body.reason || 'Melanggar ketentuan NueTify';

      const { error } = await db.from('user_bans').upsert(
        {
          user_id: targetId,
          email: targetEmail,
          display_name: targetDisplayName,
          reason,
          banned_until: bannedUntil,
          is_active: true,
          banned_by: user.email || ADMIN_EMAIL,
        },
        { onConflict: 'user_id' }
      );
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

      await db.from('listening_leaderboard').delete().eq('user_id', targetId);

      await db.from('admin_audit_logs').insert({
        action: 'BAN_USER',
        target_user_id: targetId,
        target_email: targetEmail,
        details: { reason, duration: body.duration || null, banned_until: bannedUntil },
        admin_email: user.email || ADMIN_EMAIL,
      });

      return NextResponse.json({ ok: true, banned_until: bannedUntil });
    }

    if (action === 'unban_user') {
      const targetId = body.targetUserId || body.user_id;
      if (!targetId) {
        return NextResponse.json({ ok: false, error: 'Missing target user ID' }, { status: 400 });
      }
      const targetEmail = body.targetEmail || body.email || '';

      const { error } = await db
        .from('user_bans')
        .update({ is_active: false })
        .eq('user_id', targetId);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

      await db.from('admin_audit_logs').insert({
        action: 'UNBAN_USER',
        target_user_id: targetId,
        target_email: targetEmail,
        details: {},
        admin_email: user.email || ADMIN_EMAIL,
      });

      return NextResponse.json({ ok: true });
    }

    if (action === 'update_leaderboard_stats') {
      const targetId = body.targetUserId || body.user_id;
      if (!targetId) {
        return NextResponse.json({ ok: false, error: 'Missing target user ID' }, { status: 400 });
      }

      const totalSeconds =
        typeof body.total_seconds === 'number'
          ? Math.max(0, Math.floor(body.total_seconds))
          : Math.max(0, Math.floor(Number(body.totalHours || 0) * 3600 + Number(body.totalMinutes || 0) * 60));
      const safePlays = Math.max(0, Math.floor(Number(body.totalPlays ?? body.total_plays ?? 0)));

      const { data: existingCfg } = await db
        .from('app_config')
        .select('value')
        .eq('key', 'leaderboard_overrides')
        .maybeSingle();

      const currentOverrides = ((existingCfg?.value || {}) as Record<
        string,
        { total_seconds?: number; total_plays?: number }
      >);
      const nextOverrides = {
        ...currentOverrides,
        [targetId]: { total_seconds: totalSeconds, total_plays: safePlays },
      };

      const { error: cfgErr } = await db
        .from('app_config')
        .upsert(
          {
            key: 'leaderboard_overrides',
            value: nextOverrides,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );
      if (cfgErr) return NextResponse.json({ ok: false, error: cfgErr.message }, { status: 500 });

      const { data: profileRow } = await db
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('id', targetId)
        .maybeSingle();

      const { error: lbErr } = await db.from('listening_leaderboard').upsert(
        {
          user_id: targetId,
          display_name: profileRow?.display_name || body.targetDisplayName || body.display_name || 'Pengguna NueTify',
          avatar_url: profileRow?.avatar_url || null,
          total_seconds: totalSeconds,
          total_plays: safePlays,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (lbErr) return NextResponse.json({ ok: false, error: lbErr.message }, { status: 500 });

      await db.from('admin_audit_logs').insert({
        action: 'UPDATE_LEADERBOARD_STATS',
        target_user_id: targetId,
        target_email: body.targetEmail || body.email || '',
        details: {
          total_seconds: totalSeconds,
          total_plays: safePlays,
          reason: body.reason || null,
        },
        admin_email: user.email || ADMIN_EMAIL,
      });

      return NextResponse.json({ ok: true, total_seconds: totalSeconds, total_plays: safePlays });
    }

    if (action === 'reset_leaderboard_override') {
      const targetId = body.targetUserId || body.user_id;
      if (!targetId) {
        return NextResponse.json({ ok: false, error: 'Missing target user ID' }, { status: 400 });
      }

      const { data: existingCfg } = await db
        .from('app_config')
        .select('value')
        .eq('key', 'leaderboard_overrides')
        .maybeSingle();

      const nextOverrides = {
        ...((existingCfg?.value || {}) as Record<string, { total_seconds?: number; total_plays?: number }>),
      };
      delete nextOverrides[targetId];

      const { error: cfgErr } = await db
        .from('app_config')
        .upsert(
          {
            key: 'leaderboard_overrides',
            value: nextOverrides,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );
      if (cfgErr) return NextResponse.json({ ok: false, error: cfgErr.message }, { status: 500 });

      await db.from('admin_audit_logs').insert({
        action: 'RESET_LEADERBOARD_OVERRIDE',
        target_user_id: targetId,
        target_email: body.targetEmail || body.email || '',
        details: {},
        admin_email: user.email || ADMIN_EMAIL,
      });

      return NextResponse.json({ ok: true });
    }

    if (action === 'broadcast_app_update') {
      const broadcast = {
        broadcast_id: crypto.randomUUID(),
        message: body.message || 'Pembaruan baru NueTify tersedia! Silakan update aplikasi sekarang.',
        broadcast_at: new Date().toISOString(),
        triggered_by: user.email || ADMIN_EMAIL,
      };

      const { error } = await db
        .from('app_config')
        .upsert(
          {
            key: 'app_update_broadcast',
            value: broadcast,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

      await db.from('admin_audit_logs').insert({
        action: 'BROADCAST_APP_UPDATE',
        details: broadcast,
        admin_email: user.email || ADMIN_EMAIL,
      });

      return NextResponse.json({ ok: true, broadcast });
    }

    if (action === 'send_broadcast_notification') {
      const title = (body.title || '').trim();
      const notifBody = (body.body || '').trim();

      if (!title || !notifBody) {
        return NextResponse.json(
          { ok: false, error: 'Judul dan isi notifikasi wajib diisi.' },
          { status: 400 }
        );
      }

      const { data: notifData, error: notifErr } = await db
        .from('app_notifications')
        .insert({
          title,
          body: notifBody,
          sent_by: user.email || ADMIN_EMAIL,
        })
        .select()
        .single();

      if (notifErr) {
        return NextResponse.json({ ok: false, error: notifErr.message }, { status: 500 });
      }

      await db.from('admin_audit_logs').insert({
        action: 'SEND_BROADCAST_NOTIFICATION',
        details: { title, body: notifBody, notification_id: notifData?.id },
        admin_email: user.email || ADMIN_EMAIL,
      });

      return NextResponse.json({ ok: true, notification: notifData });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Admin POST error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Internal error' }, { status: 500 });
  }
}
