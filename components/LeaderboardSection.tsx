'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, ChevronRight, Clock } from 'lucide-react';
import { getSupabaseClient } from '@/lib/cloud/supabaseClient';
import { UserAvatar } from './UserAvatar';

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string;
  total_seconds: number;
  total_plays: number;
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
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const fetchTop3 = async () => {
      try {
        const { data } = await supabase
          .from('listening_leaderboard')
          .select('user_id, display_name, avatar_url, total_seconds, total_plays')
          .gt('total_seconds', 0)
          .order('total_seconds', { ascending: false })
          .limit(3);
        if (mounted && Array.isArray(data)) {
          setEntries(data as LeaderboardEntry[]);
        }
      } catch {
        // ignore fetch errors
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchTop3();

    const channel = supabase
      .channel('nuetify-leaderboard-top3')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listening_leaderboard' },
        () => {
          void fetchTop3();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <section className="rounded-[26px] bg-[#181818] border border-[#C0C0C0]/15 p-4 sm:p-5 space-y-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-[#242424] border border-[#C0C0C0]/20 flex items-center justify-center text-[#C0C0C0] shrink-0">
            <Trophy className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[16px] font-bold text-white tracking-tight truncate">
              Leaderboard Pendengar Terlama
            </h3>
            <p className="text-[11.5px] text-[#8E8E93] truncate">
              Top 3 saat ini · Minimal masuk Top 50
            </p>
          </div>
        </div>

        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#242424] border border-[#C0C0C0]/20 text-[12px] font-semibold text-[#E5E5E5] hover:bg-[#2E2E2E] transition-colors shrink-0"
        >
          <span>Lihat seluruhnya</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#C0C0C0]" />
        </Link>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-[#121212] border border-[#C0C0C0]/10 p-4 text-center text-xs text-[#8E8E93]">
          Memuat peringkat pendengar...
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl bg-[#121212] border border-[#C0C0C0]/10 p-4 text-center text-xs text-[#A7A7A7]">
          Belum ada data peringkat. Login dan putar lagu untuk masuk Top 50!
        </div>
      ) : (
        <div className="rounded-2xl bg-[#121212] border border-[#C0C0C0]/10 divide-y divide-[#C0C0C0]/10 overflow-hidden">
          {entries.map((entry, idx) => {
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
                  <p className="text-[13.5px] font-bold text-white truncate">
                    {entry.display_name || 'Pengguna NueTify'}
                  </p>
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
  );
}
