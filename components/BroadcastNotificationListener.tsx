'use client';

import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

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
      className="fixed top-4 right-4 z-[9999] max-w-sm rounded-2xl border border-emerald-400/30 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{notification.title}</p>
          {notification.body ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              {notification.body}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setNotification(null)}
          className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label="Tutup notifikasi"
        >
          &#10005;
        </button>
      </div>
    </div>
  );
}
