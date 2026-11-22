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

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ entries: [] });
  }

  const byUser = new Map<string, LeaderboardRow>();

  // 1. Coba baca tabel listening_leaderboard menggunakan anonKey (publik RLS)
  try {
    const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data } = await anonClient
      .from('listening_leaderboard')
      .select('user_id, display_name, avatar_url, total_seconds, total_plays')
      .gt('total_seconds', 0)
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
  if (serviceKey) {
    try {
      const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
      const [{ data: musicRows }, { data: profileRows }] = await Promise.all([
        admin.from('user_music_data').select('user_id, data').limit(200),
        admin.from('user_profiles').select('id, display_name, avatar_url').limit(200),
      ]);
      const profMap = new Map<string, { display_name: string; avatar_url: string }>();
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
          if (stats.totalSeconds <= 0) continue;
          const prof = profMap.get(m.user_id);
          const existing = byUser.get(m.user_id);
          if (!existing || stats.totalSeconds > existing.total_seconds) {
            byUser.set(m.user_id, {
              user_id: m.user_id,
              display_name: prof?.display_name || existing?.display_name || 'Pengguna NueTify',
              avatar_url: prof?.avatar_url || existing?.avatar_url || '',
              total_seconds: stats.totalSeconds,
              total_plays: stats.totalPlays,
            });
          }
        }
      }
    } catch {
      // ignore if service key unavailable
    }
  }

  const entries = Array.from(byUser.values())
    .sort((a, b) => b.total_seconds - a.total_seconds)
    .slice(0, 50);

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
  const totalSeconds = Math.max(1, Math.floor(Number(body.totalSeconds || 0)));
  const totalPlays = Math.max(1, Math.floor(Number(body.totalPlays || 0)));
  const displayName =
    (body.displayName || '').trim() ||
    String(u.user_metadata?.display_name || u.user_metadata?.full_name || u.email?.split('@')[0] || 'Pengguna NueTify');
  const avatarUrl =
    (body.avatarUrl || '').trim() ||
    String(u.user_metadata?.avatar_url || u.user_metadata?.picture || '');

  const { error: upsertErr } = await userClient.from('listening_leaderboard').upsert(
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
