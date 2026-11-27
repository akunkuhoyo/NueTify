'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FolderOpen, X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/cloud/supabaseClient';

interface ReleaseInfo {
  version: string;
  downloadUrl: string;
  fileSizeMb: string | null;
  publishedAt: string | null;
}

type DownloadState = 'idle' | 'downloading' | 'installing' | 'completed' | 'error';

type NativeBridge = {
  getAppVersion?: () => string;
  getAppVersionName?: () => string;
  downloadAndInstallApk?: (apkUrl: string, version: string) => void;
  openDownloadsFolder?: () => void;
  openExternalAuth?: (url: string) => void;
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

function compareVersions(a: string, b: string): number {
  const pa = a.trim().replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.trim().replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  return 0;
}

function getInstalledAndroidVersion(): string {
  try {
    const native = (window as unknown as { NueTifyNative?: NativeBridge }).NueTifyNative;
    const nativeVer = native?.getAppVersion?.()?.trim();
    if (nativeVer) return nativeVer;
  } catch {
    // ignore
  }
  if (typeof navigator !== 'undefined') {
    const match = navigator.userAgent.match(/NueTifyAppVer\/([0-9.]+)/i);
    if (match?.[1]) return match[1];
  }
  return '1.0.0';
}

export function AppDownloadModal() {
  const [open, setOpen] = useState(false);
  const [installedVersion, setInstalledVersion] = useState<string>('1.0.0');
  const [isForceUpdate, setIsForceUpdate] = useState<boolean>(false);
  const [isNative, setIsNative] = useState(false);
  const [release, setRelease] = useState<ReleaseInfo>(FALLBACK_RELEASE);
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const [downloadPercent, setDownloadPercent] = useState<number>(0);
  const [downloadFileName, setDownloadFileName] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
const nativeProgressRef = useRef(false);
  const fallbackTimerRef = useRef<number | null>(null);
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
      if (cancelled) return; nativeProgressRef.current = true;
      if (fallbackTimerRef.current !== null) { window.clearInterval(fallbackTimerRef.current); fallbackTimerRef.current = null; }
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
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsForceUpdate(false);
        delete (window as unknown as { __nuetifyForceUpdateActive?: boolean }).__nuetifyForceUpdateActive;
        return;
      }
      const data = await fetchLatestRelease();
      if (cancelled || !data) return;

      const latestVersion = normalizeVersion(data.version);
      const curVer = getInstalledAndroidVersion();
      setInstalledVersion(curVer);
      const outdated = Boolean(data?.version) && compareVersions(curVer, data.version) < 0;
      if (outdated) {
        setIsForceUpdate(true);
        setOpen(true);
        (window as unknown as { __nuetifyForceUpdateActive?: boolean }).__nuetifyForceUpdateActive = true;
        return;
      }
      setIsForceUpdate(false);
      delete (window as unknown as { __nuetifyForceUpdateActive?: boolean }).__nuetifyForceUpdateActive;

      if (forceOpen) {
        setDownloadState('idle');
        setDownloadPercent(0);
        setOpen(true);
        return;
      }

      if (!outdated) {
        setOpen(false);
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
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkRelease(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    const onFocus = () => {
        void checkRelease(false);
      };
    window.addEventListener('focus', onFocus);
    const pollInterval = window.setInterval(() => { if (navigator.onLine) void checkRelease(false); }, 15_000);
    // Cek awal & dengarkan Supabase Realtime pada public.app_config untuk broadcast update
    const supabase = getSupabaseClient();
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

    const handleBroadcastValue = async (rawValue: unknown) => {
      const broadcastId = extractBroadcastId(rawValue);
      if (!broadcastId || cancelled) return;
      const lastSeen = localStorage.getItem('nuetify_last_update_broadcast');
      if (broadcastId !== lastSeen) {
        localStorage.setItem('nuetify_last_update_broadcast', broadcastId);
          await checkRelease(true);
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
      cancelled = true; if (fallbackTimerRef.current !== null) { window.clearInterval(fallbackTimerRef.current); fallbackTimerRef.current = null; }
      window.removeEventListener('nuetify-check-update', onManualCheck);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      window.clearInterval(pollInterval);
      delete (window as unknown as { __nuetifyForceUpdateActive?: boolean }).__nuetifyForceUpdateActive;
      delete (window as unknown as Record<string, unknown>).__nuetifyUpdateProgress;
      if (channel && supabase) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);
  useEffect(() => {
    if (!isForceUpdate) return;
    const stopAllMusic = () => {
      window.dispatchEvent(new Event('nuetify-force-stop'));
      };
    stopAllMusic();
    const guardInterval = window.setInterval(stopAllMusic, 2000);
    return () => window.clearInterval(guardInterval);
    }, [isForceUpdate]);
  const handleDismiss = () => {
    if (isForceUpdate) return;
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

    nativeProgressRef.current = false; if (fallbackTimerRef.current !== null) { window.clearInterval(fallbackTimerRef.current); fallbackTimerRef.current = null; } setDownloadState('downloading');
    setDownloadPercent(5);

    if (native?.downloadAndInstallApk) {
      native.downloadAndInstallApk(release.downloadUrl, release.version); let pct = 5; fallbackTimerRef.current = window.setInterval(() => { if (nativeProgressRef.current) { if (fallbackTimerRef.current !== null) { window.clearInterval(fallbackTimerRef.current); fallbackTimerRef.current = null; } return; } if (pct >= 95) { if (fallbackTimerRef.current !== null) { window.clearInterval(fallbackTimerRef.current); fallbackTimerRef.current = null; } setDownloadPercent(100); setDownloadState('completed'); return; } pct = Math.min(95, pct + 6); setDownloadPercent(pct); }, 450);
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

  const handleBrowserFallbackDownload = () => {
    if (!release?.downloadUrl) return;
    const native = (window as unknown as { NueTifyNative?: NativeBridge }).NueTifyNative;
    if (native?.openExternalAuth) {
      native.openExternalAuth(release.downloadUrl);
      return;
    }
    window.location.href = release.downloadUrl;
  };

  const handleCopyDownloadUrl = async () => {
    if (!release?.downloadUrl) return;
    try {
      await navigator.clipboard.writeText(release.downloadUrl);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = release.downloadUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedUrl(true);
    window.setTimeout(() => setCopiedUrl(false), 2500);
  };

  if (!isNative || !open) return null;

  const isBusy = downloadState === 'downloading' || downloadState === 'installing';

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-[#C0C0C0]/25 bg-[#121212] p-6 shadow-2xl text-white">
        {!isForceUpdate && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Tutup"
          className="absolute right-4 top-4 rounded-full p-1.5 text-[#A7A7A7] hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        )}

        <div className="flex items-center gap-3 mb-4">
    <img src="/icon" alt="NueTify" className="w-11 h-11 rounded-2xl object-cover border border-[#C0C0C0]/25 shrink-0" />
          <div>
            <h2 className="text-lg font-bold tracking-tight">{isForceUpdate ? 'Pembaruan Wajib' : 'Pembaruan Aplikasi NueTify'}</h2>
            <p className="text-xs text-[#A7A7A7]">
              {isForceUpdate ? `Versi Anda: v${installedVersion.replace(/^v/i, '')} → Terbaru: ${release.version}` : `Versi ${release.version}`}
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
              {downloadState === 'error' && (
              <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                Gagal mengunduh update secara langsung. Silakan tekan <strong>Update Sekarang</strong> untuk mencoba lagi atau gunakan tombol <strong>Gagal / Macet? Unduh via Browser</strong> di bawah.
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
<button
        type="button"
        onClick={handleBrowserFallbackDownload}
  className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-[#C0C0C0]/20 bg-[#1A1A1A] text-[#C0C0C0] font-medium text-xs py-2.5 px-4 hover:bg-[#242424] hover:text-white transition-colors"
>
  <span>Gagal / Macet? Unduh via Browser</span>
</button>
            <button
              type="button"
              onClick={() => void handleCopyDownloadUrl()}
              className="w-full text-center text-[11px] text-[#7A7A7A] hover:text-[#C0C0C0] py-1 transition-colors"
            >
              {copiedUrl ? 'Link Disalin! Tempel di Chrome' : 'Salin Link Download APK'}
            </button>
        </div>
        {isForceUpdate && (
          <p className="mt-3 text-center text-xs text-[#A7A7A7]">
            Perbarui aplikasi ke versi terbaru untuk melanjutkan penggunaan NueTify.
          </p>
        )}
      </div>
    </div>
  );
}
