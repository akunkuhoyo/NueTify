'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Wrench, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { isVerifiedDeveloper } from './VerifiedBadge';
import { getSupabaseClient } from '@/lib/cloud/supabaseClient';

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [maintenance, setMaintenance] = useState(false);
  const [message, setMessage] = useState(
    'NueTify sedang dalam tahap pembaruan sistem dan peningkatan fitur. Silakan kembali beberapa saat lagi.'
  );
  const [bypassed, setBypassed] = useState(false);
  const prevMaintenanceRef = useRef(false);

  const isDev = isVerifiedDeveloper({ userId: user?.id, email: user?.email });

  useEffect(() => {
    let cancelled = false;

    const applyStatus = (nextEnabled: boolean, nextMessage?: string) => {
      if (cancelled) return;
      const wasMaintenance = prevMaintenanceRef.current;
      prevMaintenanceRef.current = nextEnabled;
      setMaintenance(nextEnabled);
      if (nextMessage) setMessage(nextMessage);

      if (!wasMaintenance && nextEnabled && !isDev) {
        window.dispatchEvent(new CustomEvent('nuetify-force-stop'));
      }
      if (wasMaintenance && !nextEnabled) {
        setBypassed(false);
        window.dispatchEvent(new CustomEvent('nuetify-check-update'));
      }
    };

    const check = () => {
      fetch('/api/maintenance', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { maintenance?: boolean; message?: string } | null) => {
          if (cancelled || !data) return;
          applyStatus(Boolean(data.maintenance), data.message);
        })
        .catch(() => {});
    };

    check();
    const id = window.setInterval(check, 5000);
    const onFocus = () => check();
    const onVis = () => {
      if (document.visibilityState === 'visible') check();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);

    const supabase = getSupabaseClient();
    const channel = supabase
      ? supabase
          .channel('nuetify-maintenance-instant')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'app_config' },
            (payload) => {
              const row = (payload.new || payload.old) as {
                key?: string;
                value?: { enabled?: boolean; message?: string };
              } | null;
              if (row?.key === 'maintenance' && row.value) {
                applyStatus(Boolean(row.value.enabled), row.value.message);
              } else {
                check();
              }
            }
          )
          .subscribe()
      : null;

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [isDev]);

  if (!maintenance || bypassed) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[200] min-h-screen w-full bg-[#121212] text-[#E5E5E5] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl bg-[#181818] border border-[#C0C0C0]/20 p-7 text-center space-y-5 shadow-2xl">
        <div className="flex justify-center">
          <div className="relative">
            <img
              src="/icon"
              alt="NueTify"
              className="w-16 h-16 rounded-2xl object-cover border border-[#C0C0C0]/30"
            />
            <span className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#C0C0C0] text-black flex items-center justify-center">
              <Wrench className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="inline-block px-3 py-1 rounded-full bg-[#242424] border border-[#C0C0C0]/20 text-[11px] font-bold uppercase tracking-wider text-[#C0C0C0]">
            Mode Pemeliharaan
          </span>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            NueTify Sedang Diperbarui
          </h1>
          <p className="text-sm text-[#A7A7A7] leading-relaxed">{message}</p>
        </div>

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full rounded-full bg-[#C0C0C0] text-black font-bold text-sm py-3 hover:bg-[#D4D4D8] transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Cek Status Lagi</span>
          </button>

          {isDev && (
            <button
              type="button"
              onClick={() => setBypassed(true)}
              className="w-full rounded-full bg-[#242424] border border-[#E11D48]/40 text-white font-semibold text-xs py-2.5 hover:bg-[#2E2E2E] transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-[#E11D48]" />
              <span>Akses Developer (Bypass Maintenance)</span>
            </button>
          )}
        </div>

        <p className="text-[11px] text-[#8E8E93]">
          Dikembangkan oleh Tim PT Nueva Group
        </p>
      </div>
    </div>
  );
}
