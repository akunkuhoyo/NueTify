'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Clock, ShieldCheck } from 'lucide-react';
import { getSupabaseClient } from '@/lib/cloud/supabaseClient';
import { UserAvatar } from '@/components/UserAvatar';
import {
  formatListeningDuration,
  type LeaderboardEntry,
} from '@/components/LeaderboardSection';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const fetchTop50 = async () => {
      try {
        const { data } = await supabase
          .from('listening_leaderboard')
          .select('user_id, display_name, avatar_url, total_seconds, total_plays')
          .gt('total_seconds', 0)
          .order('total_seconds', { ascending: false })
          .limit(50);
        if (mounted && Array.isArray(data)) {
          setEntries(data as LeaderboardEntry[]);
        }
      } catch {
        // ignore errors
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchTop50();

    const channel = supabase
      .channel('nuetify-leaderboard-top50')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listening_leaderboard' },
        () => {
          void fetchTop50();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="min-h-screen w-full bg-[#121212] text-[#E5E5E5] px-4 py-5 sm:py-8">
      <div className="max-w-2xl mx-auto space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              aria-label="Kembali ke Beranda"
              className="w-10 h-10 rounded-full bg-[#181818] border border-[#C0C0C0]/20 flex items-center justify-center text-[#E5E5E5] hover:bg-[#242424] transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight truncate">
                Leaderboard NueTify
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
            Syarat masuk papan peringkat: login dengan akun <span className="text-white font-semibold">NueTify</span> dan raih posisi <span className="text-white font-semibold">minimal Top 50</span> durasi mendengarkan lagu terlama. Peringkat diperbarui otomatis secara real-time.
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
                    <p className="text-sm font-bold text-white truncate">
                      {entry.display_name || 'Pengguna NueTify'}
                    </p>
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
    </main>
  );
}
