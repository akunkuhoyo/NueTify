'use client';

import { useEffect, useState } from 'react';
import { Download, FolderOpen, Sparkles, X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/cloud/supabaseClient';

interface ReleaseInfo {
  version: string;
  downloadUrl: string;
  fileSizeMb: string | null;
  publishedAt: string | null;
}

type DownloadState = 'idle' | 'downloading' | 'installing' | 'completed' | 'error';

type NativeBridge = {
  getAppVersionName?: () => string;
  downloadAndInstallApk?: (apkUrl: string, version: string) => void;
  openDownloadsFolder?: () => void;
};

const FALLBACK_RELEASE: ReleaseInfo = {
  version: 'Terbaru',
  downloadUrl: ['https:', '', 'github.com', 'akunkuhoyo', 'NueTify', 'releases', 'latest', 'download', 'NueTify.apk'].join('/'),
  fileSizeMb: null,
  publishedAt: null,
};

function normalizeVersion(v: string | null | undefined): string {
  if (!v) return '';
  return v.trim().toLowerCase().replace(/^v/, '');
}

function extractBroadcastId(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val) as { broadcast_id?: unknown };
      if (typeof parsed?.broadcast_id === 'string' && parsed.broadcast_id.trim()) {
        return parsed.broadcast_id.trim();
      }
      return val.trim() || null;
    } catch {
      return val.trim() || null;
    }
  }
  if (typeof val === 'object' && 'broadcast_id' in (val as Record<string, unknown>)) {
    const id = (val as { broadcast_id?: unknown }).broadcast_id;
    return typeof id === 'string' && id.trim() ? id.trim() : null;
  }
  return null;
}

export function AppDownloadModal() {
  const [open, setOpen] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [release, setRelease] = useState<ReleaseInfo>(FALLBACK_RELEASE);
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const [downloadPercent, setDownloadPercent] = useState<number>(0);
  const [downloadFileName, setDownloadFileName] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent || '';
    const nativeBridge = (
      window as unknown as {
        NueTifyNative?: NativeBridge;
      }
    ).NueTifyNative;
    const isNativeApp = ua.includes('NueTifyAndroid') || Boolean(nativeBridge);
    setIsNative(isNativeApp);

    // Khusus Aplikasi Android saja; jangan tampilkan di web browser biasa
    if (!isNativeApp) return;

    let cancelled = false;

    // Daftarkan handler global untuk menerima progres unduhan dari NativeBridge Android
    (window as unknown as Record<string, unknown>).__nuetifyUpdateProgress = (
      percent: number,
      status: string,
      fileName?: string,
    ) => {
      if (cancelled) return;
      const safePct = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
      setDownloadPercent(safePct);
      if (
        status === 'downloading' ||
        status === 'installing' ||
        status === 'completed' ||
        status === 'error'
      ) {
        setDownloadState(status);
      }
      if (typeof fileName === 'string' && fileName) {
        setDownloadFileName(fileName);
      }
    };

    const fetchLatestRelease = async (): Promise<ReleaseInfo | null> => {
      try {
        const res = await fetch('/api/app-release', { cache: 'no-store' });
        if (!res.ok) return null;
        const data = (await res.json()) as ReleaseInfo;
        if (!cancelled && data?.downloadUrl) {
          setRelease(data);
        }
        return data;
      } catch {
        return null;
      }
    };

    const checkRelease = async (forceOpen = false) => {
      const data = await fetchLatestRelease();
      if (cancelled || !data) return;

      const latestVersion = normalizeVersion(data.version);
      const installedVersion = normalizeVersion(nativeBridge?.getAppVersionName?.());

      if (forceOpen) {
        setDownloadState('idle');
        setDownloadPercent(0);
        setOpen(true);
        return;
      }

      if (installedVersion && latestVersion && installedVersion === latestVersion) {
        return;
      }

      const dismissedVersion = localStorage.getItem('nuetify_dismissed_update_version');
      if (dismissedVersion && dismissedVersion === latestVersion) {
        return;
      }

      setOpen(true);
    };

    void checkRelease(false);

    const onManualCheck = () => {
      void checkRelease(true);
    };
    window.addEventListener('nuetify-check-update', onManualCheck);

    // Cek awal & dengarkan Supabase Realtime pada public.app_config untuk broadcast update
    const supabase = getSupabaseClient();
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

    const handleBroadcastValue = async (rawValue: unknown) => {
      const broadcastId = extractBroadcastId(rawValue);
      if (!broadcastId || cancelled) return;
      const lastSeen = localStorage.getItem('nuetify_last_update_broadcast');
      if (broadcastId !== lastSeen) {
        localStorage.setItem('nuetify_last_update_broadcast', broadcastId);
        await fetchLatestRelease();
        if (!cancelled) {
          setDownloadState('idle');
          setDownloadPercent(0);
          setDownloadFileName('');
          setOpen(true);
        }
      }
    };

    if (supabase) {
      void supabase
        .from('app_config')
        .select('value')
        .eq('key', 'app_update_broadcast')
        .maybeSingle()
        .then(({ data }) => {
          if (data?.value) {
            void handleBroadcastValue(data.value);
          }
        });

      channel = supabase
        .channel('nuetify-app-update-broadcast')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'app_config',
            filter: 'key=eq.app_update_broadcast',
          },
          (payload) => {
            const newRow = payload.new as { key?: string; value?: unknown } | null;
            if (newRow?.value !== undefined) {
              void handleBroadcastValue(newRow.value);
            }
          },
        )
        .subscribe();
    }

    return () => {
      cancelled = true;
      window.removeEventListener('nuetify-check-update', onManualCheck);
      delete (window as unknown as Record<string, unknown>).__nuetifyUpdateProgress;
      if (channel && supabase) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  const handleDismiss = () => {
    const latestVersion = normalizeVersion(release.version);
    if (latestVersion) {
      localStorage.setItem('nuetify_dismissed_update_version', latestVersion);
    }
    setOpen(false);
  };

  const handleDownload = () => {
    const native = (
      window as unknown as {
        NueTifyNative?: NativeBridge;
      }
    ).NueTifyNative;

    setDownloadState('downloading');
    setDownloadPercent(0);

    if (native?.downloadAndInstallApk) {
      native.downloadAndInstallApk(release.downloadUrl, release.version);
    } else {
      window.open(release.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenDownloads = () => {
    const native = (
      window as unknown as {
        NueTifyNative?: NativeBridge;
      }
    ).NueTifyNative;
    native?.openDownloadsFolder?.();
  };

  if (!isNative || !open) return null;

  const isBusy = downloadState === 'downloading' || downloadState === 'installing';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-[#C0C0C0]/25 bg-[#121212] p-6 shadow-2xl text-white">
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Tutup"
          className="absolute right-4 top-4 rounded-full p-1.5 text-[#A7A7A7] hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-[#C0C0C0]/15 border border-[#C0C0C0]/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#C0C0C0]" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Pembaruan Aplikasi NueTify</h2>
            <p className="text-xs text-[#A7A7A7]">
              Versi {release.version}
              {release.fileSizeMb ? ` • ${release.fileSizeMb} MB` : ''}
            </p>
          </div>
        </div>

        <p className="text-sm text-[#D4D4D4] leading-relaxed mb-4">
          Versi terbaru aplikasi Android NueTify telah tersedia. Perbarui sekarang untuk mendapatkan perbaikan dan fitur terkini.
        </p>

        {downloadState !== 'idle' && (
          <div className="mb-4 space-y-2 rounded-xl bg-[#181818] border border-[#C0C0C0]/15 p-3">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-[#E5E5E5] font-medium">
                {downloadState === 'downloading' && 'Mengunduh pembaruan...'}
                {downloadState === 'installing' && 'Membuka layar instalasi...'}
                {downloadState === 'completed' && 'Tersimpan di folder Download perangkat'}
                {downloadState === 'error' && 'Gagal mengunduh pembaruan. Silakan coba lagi.'}
              </span>
              <span className="font-mono font-bold text-[#C0C0C0] shrink-0">
                {downloadPercent}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#242424] overflow-hidden">
              <div
                className="h-full bg-[#C0C0C0] transition-all duration-200"
                style={{ width: `${downloadPercent}%` }}
              />
            </div>
            {downloadFileName && (
              <p className="text-[11px] text-[#7A7A7A] truncate">{downloadFileName}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={isBusy}
            onClick={handleDownload}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#C0C0C0] text-black font-bold text-sm py-2.5 px-4 hover:bg-white transition-colors disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            <span>
              {downloadState === 'downloading'
                ? `Mengunduh (${downloadPercent}%)...`
                : downloadState === 'installing'
                  ? 'Membuka Installer...'
                  : 'Update Sekarang'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleOpenDownloads}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-[#C0C0C0]/30 bg-transparent text-[#E5E5E5] font-semibold text-xs py-2.5 px-4 hover:bg-white/10 transition-colors"
          >
            <FolderOpen className="w-4 h-4 text-[#C0C0C0]" />
            <span>Buka Folder Download</span>
          </button>
        </div>
      </div>
    </div>
  );
}
