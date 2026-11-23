'use client';

import { useEffect, useState } from 'react';
import { Download, X, Smartphone, Music2 } from 'lucide-react';

interface ReleaseInfo {
  version: string;
  downloadUrl: string;
  fileSizeMb: string | null;
  publishedAt: string | null;
}

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

export function AppDownloadModal() {
  const [open, setOpen] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [release, setRelease] = useState<ReleaseInfo>(FALLBACK_RELEASE);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent || '';
    const nativeBridge = (
      window as unknown as {
        NueTifyNative?: { getAppVersionName?: () => string };
      }
    ).NueTifyNative;
    const isNativeApp = ua.includes('NueTifyAndroid') || Boolean(nativeBridge);
    setIsNative(isNativeApp);

    const installedRaw = nativeBridge?.getAppVersionName?.() || '';
    const installedVer = normalizeVersion(installedRaw);

    const checkAndShow = (info: ReleaseInfo) => {
      const resolved: ReleaseInfo = {
        version: info?.version || 'Terbaru',
        downloadUrl: info?.downloadUrl || FALLBACK_RELEASE.downloadUrl,
        fileSizeMb: info?.fileSizeMb || null,
        publishedAt: info?.publishedAt || null,
      };
      setRelease(resolved);

      const latestVer = normalizeVersion(resolved.version);

      try {
        if (isNativeApp) {
          if (!latestVer || latestVer === 'terbaru') {
            setOpen(false);
            return;
          }
          if (installedVer && installedVer === latestVer) {
            setOpen(false);
            return;
          }
          const seenKey = `nuetify_apk_seen_v3_${latestVer}`;
          if (!window.localStorage.getItem(seenKey)) {
            setOpen(true);
          }
        } else {
          const sessionKey = `nuetify_web_popup_v3_${latestVer || 'latest'}`;
          if (!window.sessionStorage.getItem(sessionKey)) {
            setOpen(true);
          }
        }
      } catch {
        if (!isNativeApp) setOpen(true);
      }
    };

    let cancelled = false;
    const checkRelease = () => {
      fetch('/api/app-release', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : FALLBACK_RELEASE))
        .then((info: ReleaseInfo) => {
          if (!cancelled) checkAndShow(info);
        })
        .catch(() => {
          if (!cancelled && !isNativeApp) checkAndShow(FALLBACK_RELEASE);
        });
    };

    checkRelease();
    const intervalId = window.setInterval(checkRelease, 60000);
    const onFocus = () => checkRelease();
    const onVis = () => {
      if (document.visibilityState === 'visible') checkRelease();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('nuetify-check-update', checkRelease);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('nuetify-check-update', checkRelease);
    };
  }, []);

  const handleDismiss = () => {
    try {
      const latestVer = normalizeVersion(release.version) || 'latest';
      if (isNative) {
        window.localStorage.setItem(`nuetify_apk_seen_v3_${latestVer}`, '1');
      } else {
        window.sessionStorage.setItem(`nuetify_web_popup_v3_${latestVer}`, '1');
      }
    } catch {
      // ignore storage errors
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Download Aplikasi NueTify"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-[#181818] border border-[#C0C0C0]/20 p-6 text-[#E5E5E5] shadow-2xl">
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Tutup"
          className="absolute right-4 top-4 rounded-full p-2 text-[#A7A7A7] hover:bg-[#242424] hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3.5">
          <img
            src="/icon"
            alt="NueTify"
            className="h-14 w-14 rounded-2xl object-cover shrink-0 border border-[#C0C0C0]/25"
          />
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-white">
              {isNative ? 'Update NueTify Tersedia' : 'NueTify Android'}
            </h2>
            <p className="text-xs text-[#C0C0C0] mt-0.5">
              Versi {release.version}
              {release.fileSizeMb ? ` · ${release.fileSizeMb} MB` : ''} · Real-Time Update
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-[#B3B3B3]">
          {isNative ? (
            <>
              Versi terbaru aplikasi Android <span className="font-semibold text-white">NueTify</span> sudah tersedia. Unduh dan instal langsung untuk memperbarui tanpa menghapus playlist Anda:
            </>
          ) : (
            <>
              Pasang aplikasi native Android <span className="font-semibold text-white">NueTify</span> untuk pengalaman streaming 24 jam tanpa henti:
            </>
          )}
        </p>

        <ul className="mt-3 space-y-2 text-xs text-[#D4D4D8]">
          <li className="flex items-center gap-2">
            <Music2 className="h-3.5 w-3.5 text-[#C0C0C0] shrink-0" />
            <span>Musik tetap terputar 24 jam saat keluar aplikasi atau layar mati</span>
          </li>
          <li className="flex items-center gap-2">
            <Smartphone className="h-3.5 w-3.5 text-[#C0C0C0] shrink-0" />
            <span>Notifikasi lockscreen lengkap (Shuffle, Prev, Play/Pause, Next, Repeat)</span>
          </li>
        </ul>

        <div className="mt-5 flex flex-col gap-2.5">
          <a
            href={release.downloadUrl}
            download="NueTify.apk"
            onClick={(e) => {
              const native = (window as unknown as { NueTifyNative?: { downloadAndInstallApk?: (u: string, v: string) => void } }).NueTifyNative;
              if (isNative && native?.downloadAndInstallApk) {
                e.preventDefault();
                native.downloadAndInstallApk(release.downloadUrl, release.version);
              }
              handleDismiss();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#C0C0C0] px-4 py-3 text-sm font-bold text-black hover:bg-[#D4D4D8] transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>
              {isNative ? `Update ke ${release.version}` : 'Download NueTify APK'}
            </span>
          </a>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full rounded-full bg-[#242424] px-4 py-2.5 text-sm font-medium text-[#E5E5E5] hover:bg-[#2E2E2E] transition-colors"
          >
            {isNative ? 'Nanti Saja' : 'Lanjut di Web'}
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] text-[#8E8E93]">
          Dikembangkan oleh Tim PT Nueva Group
        </p>
      </div>
    </div>
  );
}
