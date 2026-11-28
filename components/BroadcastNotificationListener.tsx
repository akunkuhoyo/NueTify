'use client';

import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/cloud/supabaseClient';

type BroadcastNotification = {
  id: string;
  title: string;
  body: string;
};

const LAST_KEY = 'nuetify_last_broadcast_notif_id';

export function BroadcastNotificationListener() {
  const [notification, setNotification] = useState<BroadcastNotification | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    const deliver = (id: string, title: string, body: string, createdAt?: string) => {
      if (!id) return;
      try {
        if (typeof window !== 'undefined' && window.localStorage.getItem(LAST_KEY) === id) {
          return;
        }
        if (createdAt) {
          const ageMs = Date.now() - new Date(createdAt).getTime();
          if (!Number.isNaN(ageMs) && ageMs > 24 * 60 * 60 * 1000) {
            window.localStorage.setItem(LAST_KEY, id);
            return;
          }
        }
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(LAST_KEY, id);
        }
      } catch {
        // ignore storage errors
      }

      if (typeof window !== 'undefined') {
        const nativeBridge = (
          window as unknown as {
            NueTifyNative?: {
              showPushNotification?: (id: string, title: string, body: string) => void;
            };
          }
        ).NueTifyNative;
        nativeBridge?.showPushNotification?.(id, title, body);
      }

      setNotification({ id, title, body });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setNotification(null);
      }, 8000);
    };

    const pollLatest = async () => {
      try {
        const res = await fetch('/api/notifications/latest', { cache: 'no-store' });
        if (!res.ok || !active) return;
        const data = (await res.json()) as {
          notification?: {
            id?: string | number;
            title?: string;
            body?: string;
            created_at?: string;
          } | null;
          id?: string | number;
          title?: string;
          body?: string;
          created_at?: string;
        } | null;
        const item = data?.notification ?? data;
        if (!item || item.id == null) return;

        const id = String(item.id);
        const title = item.title?.trim() || 'Notifikasi Baru';
        const body = item.body?.trim() || '';
        deliver(id, title, body, item.created_at);
      } catch {
        // ignore polling errors
      }
    };

    const supabase = getSupabaseClient();
    const channel = supabase
      ? supabase
          .channel('public-app-notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'app_notifications',
            },
            (payload) => {
              const row = payload.new as {
                id?: string | number;
                title?: string;
                body?: string;
                created_at?: string;
              } | null;
              if (!row) return;

              const id = String(row.id ?? Date.now());
              const title = row.title?.trim() || 'Notifikasi Baru';
              const body = row.body?.trim() || '';
              deliver(id, title, body, row.created_at);
            }
          )
          .subscribe()
      : null;

    void pollLatest();
    const intervalId = setInterval(() => {
      void pollLatest();
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void pollLatest();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!notification) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 z-[9999] max-w-sm rounded-2xl border border-white/15 bg-[#0B0B0C]/95 p-4 text-white shadow-[0_14px_40px_rgba(0,0,0,0.65)] backdrop-blur-xl"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-black"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg></div>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">NUETIFY</p>
          <p className="text-sm font-semibold text-white">{notification.title}</p>
          {notification.body ? (
            <p className="mt-1 text-xs leading-relaxed text-white/75">
              {notification.body}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setNotification(null)}
          className="rounded-lg px-2 py-1 text-xs text-white/50 hover:bg-white/10 hover:text-white"
          aria-label="Tutup notifikasi"
        >
          &#10005;
        </button>
      </div>
    </div>
  );
}
