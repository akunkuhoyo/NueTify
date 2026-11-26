'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/cloud/supabaseClient';

interface BroadcastNotification {
  id: string;
  title: string;
  body: string;
}

export function BroadcastNotificationListener() {
  const [notification, setNotification] = useState<BroadcastNotification | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
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
          } | null;
          if (!row) return;

          const id = String(row.id ?? Date.now());
          const title = row.title?.trim() || 'Notifikasi Baru';
          const body = row.body?.trim() || '';

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
        }
      )
      .subscribe();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, []);

  if (!notification) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-white/15 bg-zinc-950/95 p-4 text-white shadow-2xl backdrop-blur-xl"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
          <Bell className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-white">
            {notification.title}
          </p>
          {notification.body ? (
            <p className="mt-1 text-xs leading-relaxed text-zinc-300">
              {notification.body}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            setNotification(null);
          }}
          aria-label="Tutup notifikasi"
          className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default BroadcastNotificationListener;
