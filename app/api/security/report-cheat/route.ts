import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const DEVELOPER_USER_ID = 'ebc0b783-4ebd-44b2-89de-990c57cfd297';
const DEVELOPER_EMAIL = 'drevviann@gmail.com';

function isDeveloperUser(u: { id?: string; email?: string | null }): boolean {
  return (
    u.id === DEVELOPER_USER_ID ||
    u.email?.toLowerCase() === DEVELOPER_EMAIL
  );
}

export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const u = userData.user;

    if (isDeveloperUser(u)) {
      return NextResponse.json({ ok: true, exempted: true });
    }

    let body: { trigger?: string; clicksInWindow?: number; windowSeconds?: number } = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const trigger = typeof body.trigger === 'string' ? body.trigger : 'unknown';
    const clicksInWindow = Number(body.clicksInWindow || 0);
    const windowSeconds = Number(body.windowSeconds || 0);

    if (!Number.isFinite(clicksInWindow) || clicksInWindow < 25 || windowSeconds > 10) {
      return NextResponse.json({ error: 'Threshold not met' }, { status: 400 });
    }

    const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });

    const bannedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const reason =
      'Auto-Ban 24 Jam (Sistem Anti-Cheat NueTify): Terdeteksi penggunaan auto-clicker pada tombol skip atau manipulasi cepat statistik Leaderboard. Akun ditangguhkan otomatis selama 24 jam.';

    const { data: profileData } = await adminClient
      .from('user_profiles')
      .select('display_name')
      .eq('user_id', u.id)
      .maybeSingle();

    const display_name =
      (profileData?.display_name && String(profileData.display_name).trim()) ||
      'Pengguna NueTify';

    const { error: banErr } = await adminClient.from('user_bans').upsert(
      {
        user_id: u.id,
        email: u.email || '',
        display_name,
        reason,
        banned_until: bannedUntil,
        is_active: true,
        banned_by: 'SYSTEM_ANTI_CHEAT',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (banErr) {
      return NextResponse.json({ error: banErr.message }, { status: 500 });
    }

    await adminClient.from('listening_leaderboard').delete().eq('user_id', u.id);

    await adminClient.from('admin_audit_logs').insert({
      admin_email: 'SYSTEM_ANTI_CHEAT',
      action: 'AUTO_BAN_CHEAT_24H',
      target_user_id: u.id,
      target_email: u.email || '',
      details: {
        trigger,
        clicksInWindow,
        windowSeconds,
        banned_until: bannedUntil,
        reason,
      },
    });

    return NextResponse.json({
      ok: true,
      banned: true,
      banned_until: bannedUntil,
      reason,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
