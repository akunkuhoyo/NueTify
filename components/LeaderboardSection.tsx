'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, ChevronRight, Clock, ArrowLeft, ShieldCheck } from 'lucide-react';
import { getSupabaseClient } from '@/lib/cloud/supabaseClient';
import { useAuth } from './AuthProvider';
import { useMusic } from './MusicProvider';
import { UserAvatar } from './UserAvatar';
import { VerifiedBadge, isVerifiedDeveloper } from './VerifiedBadge';

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string;
  total_seconds: number;
  total_plays: number;
  is_verified?: boolean;
}

export function formatListeningDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours} jam ${minutes} mnt` : `${hours} jam`;
  }
  if (minutes > 0) return `${minutes} mnt`;
  return safe > 0 ? '< 1 mnt' : '0 mnt';
}

export function LeaderboardSection() {
  const { user, profile } = useAuth();
  const { history } = useMusic();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFull, setShowFull] = useState(false);

useEffect(() => {
if (!showFull) return;
const w = window as unknown as { __nuetifyCloseLeaderboard?: () => boolean };
w.__nuetifyCloseLeaderboard = () => {
setShowFull(false);
return true;
};
try {
window.history.pushState({ nuetifyLeaderboard: true }, '');
} catch {}
const onPopState = () => {
setShowFull(false);
};
window.addEventListener('popstate', onPopState);
return () => {
delete w.__nuetifyCloseLeaderboard;
window.removeEventListener('popstate', onPopState);
};
}, [showFull]);

  const fetchTop50 = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as { entries?: LeaderboardEntry[] };
        if (Array.isArray(data?.entries)) {
          setEntries(data.entries);
          setLoading(false);
          return;
        }
      }
    } catch {
      // fallback ke query Supabase langsung
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('listening_leaderboard')
        .select('user_id, display_name, avatar_url, total_seconds, total_plays')
        .gt('total_seconds', 0)
        .order('total_seconds', { ascending: false })
        .limit(50);
      if (Array.isArray(data)) {
        setEntries(data as LeaderboardEntry[]);
      }
    } catch {
      // ignore fetch errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    void fetchTop50();

    const channel = supabase
      .channel('nuetify-leaderboard-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listening_leaderboard' },
        () => {
          void fetchTop50();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchTop50]);

  // Pastikan riwayat dengar user yang login langsung tersinkron ke tabel leaderboard
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user || !Array.isArray(history) || history.length === 0) return;

    let totalSec = 0;
    for (const ev of history) {
      const rec = ev as unknown as {
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
      totalSec += Number.isFinite(sec) && sec > 0 ? sec : 180;
    }

    const displayName =
      profile?.display_name ||
      String(user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Pengguna NueTify');
    const avatarUrl =
      profile?.avatar_url ||
      String(user.user_metadata?.avatar_url || user.user_metadata?.picture || '');

    let cancelled = false;
    const totalSeconds = Math.max(1, Math.floor(totalSec));
    const totalPlays = history.length;

    void (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token || cancelled) return;

        await fetch('/api/leaderboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            totalSeconds,
            totalPlays,
            displayName,
            avatarUrl,
          }),
        });
      } catch {
        // ignore sync errors
      } finally {
        if (!cancelled) void fetchTop50();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, profile?.display_name, profile?.avatar_url, history, fetchTop50]);

  const top3 = entries.slice(0, 3);

  const fullOverlay =
    showFull && typeof document !== 'undefined'
      ? createPortal(
          <div className="fixed inset-0 z-[95] bg-[#121212] text-[#E5E5E5] overflow-y-auto px-4 pt-5 pb-16">
            <div className="max-w-2xl mx-auto space-y-5">
              <header className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setShowFull(false)}
                    aria-label="Kembali ke Beranda"
                    className="w-10 h-10 rounded-full bg-[#181818] border border-[#C0C0C0]/20 flex items-center justify-center text-[#E5E5E5] hover:bg-[#242424] transition-colors shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight truncate">
                      Leaderboard
                    </h1>
                    <p className="text-xs text-[#A7A7A7]">
                      Top 50 Pendengar Lagu Terlama · Real-Time
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#181818] border border-[#C0C0C0]/20 text-xs font-bold text-[#C0C0C0] shrink-0">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Top 50</span>
                </span>
              </header>

              <div className="rounded-2xl bg-[#181818] border border-[#C0C0C0]/15 p-3.5 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#C0C0C0] shrink-0 mt-0.5" />
                <p className="text-xs text-[#B3B3B3] leading-relaxed">
                  Syarat masuk papan peringkat: login dengan akun <span className="text-white font-semibold">NueTify</span> dan raih posisi <span className="text-white font-semibold">minimal Top 50</span> durasi mendengarkan lagu terlama. Musik tetap berjalan normal saat melihat leaderboard.
                </p>
              </div>

              {loading ? (
                <div className="rounded-3xl bg-[#181818] border border-[#C0C0C0]/15 p-8 text-center text-sm text-[#8E8E93]">
                  Memuat Top 50 Leaderboard...
                </div>
              ) : entries.length === 0 ? (
                <div className="rounded-3xl bg-[#181818] border border-[#C0C0C0]/15 p-8 text-center space-y-2">
                  <Trophy className="w-8 h-8 text-[#C0C0C0] mx-auto" />
                  <p className="text-sm font-semibold text-white">
                    Belum ada pendengar di Top 50
                  </p>
                  <p className="text-xs text-[#A7A7A7]">
                    Login dan mulai dengarkan lagu di NueTify untuk menempati peringkat #1!
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl bg-[#181818] border border-[#C0C0C0]/15 divide-y divide-[#C0C0C0]/10 overflow-hidden">
                  {entries.map((entry, idx) => {
                    const rank = idx + 1;
                    return (
                      <div
                        key={entry.user_id}
                        className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-[#202020] transition-colors"
                      >
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                            rank === 1
                              ? 'bg-[#C0C0C0] text-black'
                              : rank <= 3
                                ? 'bg-[#282828] text-white border border-[#C0C0C0]/35'
                                : 'bg-[#121212] text-[#A7A7A7] border border-[#C0C0C0]/10'
                          }`}
                        >
                          #{rank}
                        </span>
                        <UserAvatar
                          src={entry.avatar_url}
                          name={entry.display_name}
                          size={40}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0 text-sm font-bold text-white"><span className="truncate">
                            {entry.display_name || 'Pengguna NueTify'}</span>
                      {isVerifiedDeveloper({
                        userId: entry.user_id,
                        serverVerified: entry.is_verified,
                      }) && <VerifiedBadge size={15} />}
                          </div>
                          <p className="text-xs text-[#8E8E93]">
                            {entry.total_plays} kali putar
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#C0C0C0] shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatListeningDuration(entry.total_seconds)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <section className="rounded-[26px] bg-[#181818] border border-[#C0C0C0]/15 p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-[#242424] border border-[#C0C0C0]/20 flex items-center justify-center text-[#C0C0C0] shrink-0">
              <Trophy className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-[16px] font-bold text-white tracking-tight truncate">
                Leaderboard
              </h3>
              <p className="text-[11.5px] text-[#8E8E93] truncate">
                Top 3 saat ini · Minimal masuk Top 50
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowFull(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#242424] border border-[#C0C0C0]/20 text-[12px] font-semibold text-[#E5E5E5] hover:bg-[#2E2E2E] transition-colors shrink-0"
          >
            <span>Lihat seluruhnya</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#C0C0C0]" />
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-[#121212] border border-[#C0C0C0]/10 p-4 text-center text-xs text-[#8E8E93]">
            Memuat peringkat pendengar...
          </div>
        ) : top3.length === 0 ? (
          <div className="rounded-2xl bg-[#121212] border border-[#C0C0C0]/10 p-4 text-center text-xs text-[#A7A7A7]">
            Belum ada data peringkat. Login dan putar lagu untuk masuk Top 50!
          </div>
        ) : (
          <div className="rounded-2xl bg-[#121212] border border-[#C0C0C0]/10 divide-y divide-[#C0C0C0]/10 overflow-hidden">
            {top3.map((entry, idx) => {
              const rank = idx + 1;
              return (
                <div
                  key={entry.user_id}
                  className="flex items-center gap-3 px-3.5 py-3"
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                      rank === 1
                        ? 'bg-[#C0C0C0] text-black'
                        : 'bg-[#242424] text-[#E5E5E5] border border-[#C0C0C0]/20'
                    }`}
                  >
                    #{rank}
                  </span>
                  <UserAvatar
                    src={entry.avatar_url}
                    name={entry.display_name}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0 text-[13.5px] font-bold text-white"><span className="truncate">
                      {entry.display_name || 'Pengguna NueTify'}</span>
                      {isVerifiedDeveloper({
                        userId: entry.user_id,
                        serverVerified: entry.is_verified,
                      }) && <VerifiedBadge size={15} />}
                    </div>
                    <p className="text-[11px] text-[#8E8E93]">
                      {entry.total_plays} kali putar
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[12px] font-semibold text-[#C0C0C0] shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatListeningDuration(entry.total_seconds)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {fullOverlay}
    </>
  );
}
