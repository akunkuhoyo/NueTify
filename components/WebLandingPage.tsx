'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import {
  ArrowDown,
  CheckCircle2,
  Download,
  Headphones,
  MessageSquareText,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Trophy,
  WifiOff,
  Wrench,
} from 'lucide-react';

interface AppReleaseData {
  maintenance: boolean;
  version: string;
  downloadUrl: string;
  fileSizeMb: number | string;
  publishedAt?: string | null;
}

const DIAGONAL_HATCH_CLASS =
  'bg-[repeating-linear-gradient(315deg,rgba(255,255,255,0.055)_0,rgba(255,255,255,0.055)_1px,transparent_0,transparent_50%)] bg-[length:10px_10px]';

type PreviewTabKey = 'audio' | 'equalizer' | 'chat' | 'offline';

interface PreviewTab {
  key: PreviewTabKey;
  label: string;
  fileName: string;
  badge: string;
  title: string;
  description: string;
  highlights: string[];
  metricLabel: string;
  metricValue: string;
  metricSub: string;
  statusTag: string;
}

const PREVIEW_TABS: PreviewTab[] = [
  {
    key: 'audio',
    label: 'Audio 24/7',
    fileName: 'audio-engine.kt',
    badge: 'BACKGROUND SERVICE',
    title: 'Pemutaran Audio Tanpa Jeda 24/7',
    description:
      'Engine native Android menjaga streaming musik tetap stabil di latar belakang meski layar mati atau berpindah aplikasi.',
    highlights: [
      'Foreground service hemat baterai dengan wakelock adaptif',
      'Transisi antar lagu mulus tanpa gap (gapless playback)',
      'Kontrol penuh dari notifikasi & lock screen Android',
    ],
    metricLabel: 'LATENSI BUFFER',
    metricValue: '12 ms',
    metricSub: 'Stabil di jaringan 4G / Wi-Fi',
    statusTag: 'ACTIVE · 320 KBPS',
  },
  {
    key: 'equalizer',
    label: 'Equalizer',
    fileName: 'dsp-equalizer.kt',
    badge: 'CUSTOM DSP',
    title: 'Equalizer 10-Band & Bass Boost',
    description:
      'Sesuaikan karakter suara secara real-time dengan preset studio atau kurva frekuensi manual untuk earphone dan speaker.',
    highlights: [
      '10-band parametric EQ dengan respons instan',
      'Preset Pop, Bass Boost, Vocal, Lo-Fi, dan Flat Studio',
      'Simpan profil audio otomatis per perangkat Bluetooth',
    ],
    metricLabel: 'RENTANG FREKUENSI',
    metricValue: '32Hz–16kHz',
    metricSub: 'Presisi 32-bit floating point',
    statusTag: 'DSP · CALIBRATED',
  },
  {
    key: 'chat',
    label: 'Global Chat',
    fileName: 'global-chat.kt',
    badge: 'REALTIME SOCKET',
    title: 'Ruang Obrolan & Reaksi Pendengar',
    description:
      'Terhubung langsung dengan komunitas pendengar NueTify, bagikan lagu favorit, dan ikuti sesi dengar bersama.',
    highlights: [
      'Pesan real-time dengan latensi rendah & moderasi otomatis',
      'Bagikan kartu lagu langsung ke ruang obrolan global',
      'Lencana pendengar aktif dan papan peringkat mingguan',
    ],
    metricLabel: 'SINKRONISASI',
    metricValue: '< 80 ms',
    metricSub: 'WebSocket terenkripsi TLS',
    statusTag: 'ONLINE · GLOBAL',
  },
  {
    key: 'offline',
    label: 'Mode Offline',
    fileName: 'offline-cache.kt',
    badge: 'LOCAL VAULT',
    title: 'Simpan & Putar Tanpa Kuota',
    description:
      'Unduh daftar putar pilihan langsung ke penyimpanan internal Android untuk didengarkan kapan saja tanpa koneksi internet.',
    highlights: [
      'Cache terenkripsi langsung di perangkat Android Anda',
      'Manajemen ruang penyimpanan cerdas & batas kuota otomatis',
      'Sinkronisasi riwayat putar saat kembali terhubung',
    ],
    metricLabel: 'EFISIENSI STORAGE',
    metricValue: '-45%',
    metricSub: 'Kompresi AAC / Opus adaptif',
    statusTag: 'CACHED · READY',
  },
];

const FEATURES = [
  {
    code: '01 / AUDIO',
    title: 'Streaming 24/7 Non-Stop',
    description:
      'Engine audio latar belakang yang ringan menjaga musik tetap berjalan mulus tanpa terputus saat multitasking.',
    icon: Headphones,
  },
  {
    code: '02 / EQUALIZER',
    title: 'Equalizer Studio 10-Band',
    description:
      'Atur frekuensi bass, mid, dan treble sesuai selera dengan preset instan maupun kustomisasi penuh.',
    icon: Sliders,
  },
  {
    code: '03 / CHAT',
    title: 'Global Chat Komunitas',
    description:
      'Diskusi musik real-time bersama pendengar lain lengkap dengan berbagi trek langsung di ruang obrolan.',
    icon: MessageSquareText,
  },
  {
    code: '04 / OFFLINE',
    title: 'Mode Offline Cepat',
    description:
      'Putar koleksi favorit tanpa koneksi internet dengan manajemen cache lokal yang efisien.',
    icon: WifiOff,
  },
  {
    code: '05 / REWARD',
    title: 'Pencapaian & Badge',
    description:
      'Kumpulkan jam dengar dan buka lencana eksklusif langsung dari profil Android Anda.',
    icon: Trophy,
  },
  {
    code: '06 / AUTO UPDATE',
    title: 'Pembaruan Rilis Otomatis',
    description:
      'Selalu dapatkan versi APK terbaru langsung dari endpoint rilis resmi tanpa perlu mencari tautan manual.',
    icon: Sparkles,
  },
];

const INSTALL_STEPS = [
  {
    step: 'LANGKAH 01',
    title: 'Unduh APK Resmi',
    description:
      'Tekan tombol Unduh untuk Android di halaman ini untuk mengunduh berkas instalasi resmi NueTify.',
  },
  {
    step: 'LANGKAH 02',
    title: 'Izinkan Sumber Tepercaya',
    description:
      'Buka berkas APK lalu aktifkan izin "Instal aplikasi yang tidak dikenal" untuk browser Anda.',
  },
  {
    step: 'LANGKAH 03',
    title: 'Pasang & Dengarkan',
    description:
      'Ketuk Pasang, masuk dengan akun Anda, dan nikmati pengalaman audio penuh di Android 8.0+.',
  },
];

export default function WebLandingPage() {
  const [release, setRelease] = useState<AppReleaseData>({
    maintenance: false,
    version: 'v1.0.0',
    downloadUrl: '#',
    fileSizeMb: '—',
    publishedAt: null,
  });
  const [activeTab, setActiveTab] = useState<PreviewTabKey>('audio');

  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    restDelta: 0.001,
  });

  const heroMouseX = useMotionValue(0);
  const heroMouseY = useMotionValue(0);
  const heroRotateY = useSpring(useTransform(heroMouseX, [-0.5, 0.5], [-10, 10]), {
    stiffness: 160,
    damping: 20,
  });
  const heroRotateX = useSpring(useTransform(heroMouseY, [-0.5, 0.5], [10, -10]), {
    stiffness: 160,
    damping: 20,
  });
  const heroScrollY = useTransform(scrollYProgress, [0, 0.35], [0, -36]);

  const cardMouseX = useMotionValue(0);
  const cardMouseY = useMotionValue(0);
  const cardRotateY = useSpring(useTransform(cardMouseX, [-0.5, 0.5], [-6, 6]), {
    stiffness: 180,
    damping: 22,
  });
  const cardRotateX = useSpring(useTransform(cardMouseY, [-0.5, 0.5], [6, -6]), {
    stiffness: 180,
    damping: 22,
  });

  useEffect(() => {
    let active = true;
    const fetchRelease = async () => {
      try {
        const res = await fetch('/api/app-release', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as Partial<AppReleaseData>;
        if (!active) return;
        setRelease((prev) => ({
          maintenance: Boolean(data.maintenance),
          version: data.version || prev.version,
          downloadUrl: data.downloadUrl || prev.downloadUrl,
          fileSizeMb:
            data.fileSizeMb !== undefined && data.fileSizeMb !== null
              ? data.fileSizeMb
              : prev.fileSizeMb,
          publishedAt: data.publishedAt ?? prev.publishedAt,
        }));
      } catch {
        // Fallback default
      }
    };
    fetchRelease();
    return () => {
      active = false;
    };
  }, []);

  const handleHeroPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    heroMouseX.set(x);
    heroMouseY.set(y);
  };

  const handleHeroPointerLeave = () => {
    heroMouseX.set(0);
    heroMouseY.set(0);
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cardMouseX.set(x);
    cardMouseY.set(y);
  };

  const handleCardPointerLeave = () => {
    cardMouseX.set(0);
    cardMouseY.set(0);
  };

  const currentTab =
    PREVIEW_TABS.find((t) => t.key === activeTab) || PREVIEW_TABS[0];

  const formattedSize =
    typeof release.fileSizeMb === 'number'
      ? `${release.fileSizeMb} MB`
      : String(release.fileSizeMb).includes('MB')
      ? String(release.fileSizeMb)
      : `${release.fileSizeMb} MB`;

  return (
    <div className="min-h-screen bg-[#030712] text-white antialiased selection:bg-sky-500/30 selection:text-sky-200">
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 z-50 h-0.5 origin-left bg-sky-400"
      />

      <header className="sticky top-0 z-40 h-14 border-b border-white/10 bg-[#030712]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between border-x border-white/10 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <img
                src="https://i.ibb.co.com/zVTpRV9L/Proyek-Baru-598-652-F167.png"
                alt="NueTify Logo"
                className="h-7 w-7 rounded-md object-contain"
              />
              <span className="text-sm font-semibold tracking-tight text-white">
                NueTify
              </span>
            </Link>
            <span className="hidden rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-sky-400 sm:inline-block">
              {release.version}
            </span>
          </div>

          <nav className="hidden items-center gap-6 text-xs font-medium text-white/70 md:flex">
            <a href="#preview" className="transition-colors hover:text-white">
              Preview
            </a>
            <a href="#fitur" className="transition-colors hover:text-white">
              Fitur
            </a>
            <a
              href="#cara-pasang"
              className="transition-colors hover:text-white"
            >
              Cara Pasang
            </a>
            <Link
              href="/privacy"
              className="transition-colors hover:text-white"
            >
              Privasi
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {release.maintenance ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3.5 py-1.5 font-mono text-[11px] font-medium text-amber-300">
                <Wrench className="h-3.5 w-3.5" />
                Maintenance
              </span>
            ) : (
              <a
                href={release.downloadUrl}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-gray-950 transition hover:bg-sky-100"
              >
                <Download className="h-3.5 w-3.5" />
                Unduh APK
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl border-x border-white/10">
        <section
          ref={heroRef}
          onPointerMove={handleHeroPointerMove}
          onPointerLeave={handleHeroPointerLeave}
          className="relative overflow-hidden border-b border-white/10 px-6 py-20 sm:px-10 sm:py-28"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 h-80 w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/10 blur-3xl"
          />

          <div className="relative z-10 flex flex-col items-center text-center">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1 font-mono text-xs uppercase tracking-widest text-sky-400">
              <Smartphone className="h-3.5 w-3.5" />
              ANDROID NATIVE · {release.version}
            </span>

            <motion.div
              style={{
                perspective: 1100,
                y: heroScrollY,
              }}
              className="mb-6 select-none"
            >
              <motion.div
                style={{
                  rotateX: heroRotateX,
                  rotateY: heroRotateY,
                  transformStyle: 'preserve-3d',
                }}
                className="relative inline-block"
              >
                <span
                  aria-hidden="true"
                  style={{
                    transform: 'translateZ(-28px)',
                    WebkitTextStroke: '1px rgba(56,189,248,0.28)',
                  }}
                  className="pointer-events-none absolute inset-0 text-6xl font-black tracking-tighter text-transparent sm:text-8xl"
                >
                  NueTify
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    transform: 'translateZ(-14px)',
                    WebkitTextStroke: '1px rgba(56,189,248,0.28)',
                  }}
                  className="pointer-events-none absolute inset-0 text-6xl font-black tracking-tighter text-transparent sm:text-8xl"
                >
                  NueTify
                </span>
                <h1
                  style={{ transform: 'translateZ(12px)' }}
                  className="relative text-6xl font-black tracking-tighter text-white sm:text-8xl"
                >
                  NueTify
                </h1>
              </motion.div>
            </motion.div>

            <p className="max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
              Platform streaming musik &amp; komunitas pendengar berarsitektur
              ringan khusus Android. Stabil 24/7 di latar belakang dengan
              equalizer studio dan mode offline.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
              {release.maintenance ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-6 py-3 text-sm font-medium text-amber-300">
                  <Wrench className="h-4 w-4" />
                  Sedang Maintenance · Coba Lagi Nanti
                </div>
              ) : (
                <a
                  href={release.downloadUrl}
                  className="inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-950 transition hover:bg-sky-100"
                >
                  <Download className="h-4 w-4" />
                  Unduh untuk Android
                  <span className="rounded-full bg-gray-950/10 px-2 py-0.5 font-mono text-[11px] font-medium text-gray-800">
                    {release.version} · {formattedSize}
                  </span>
                </a>
              )}

              <a
                href="#fitur"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/[0.07]"
              >
                Jelajahi Fitur
                <ArrowDown className="h-4 w-4 text-sky-400" />
              </a>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 divide-y divide-white/10 border-b border-white/10 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          <div className="p-5 sm:p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-sky-400">
              Platform
            </p>
            <p className="mt-1.5 text-sm font-medium text-white">
              Android 8.0+ Only
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-sky-400">
              Rilis Otomatis
            </p>
            <p className="mt-1.5 font-mono text-sm font-medium text-white">
              {release.version}
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-sky-400">
              Ukuran APK
            </p>
            <p className="mt-1.5 font-mono text-sm font-medium text-white">
              {formattedSize}
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-sky-400">
              Pengembang
            </p>
            <p className="mt-1.5 text-sm font-medium text-white">
              PT Nueva Group
            </p>
          </div>
        </section>

        <div
          aria-hidden="true"
          className={`h-6 border-b border-white/10 ${DIAGONAL_HATCH_CLASS}`}
        />

        <section
          id="preview"
          className="border-b border-white/10 px-6 py-16 sm:px-10 sm:py-20"
        >
          <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-sky-400">
                01 // STUDIO PREVIEW
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Arsitektur Native Android
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {PREVIEW_TABS.map((tab) => {
                const isActive = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-full border px-4 py-1.5 font-mono text-xs transition ${
                      isActive
                        ? 'border-sky-400 bg-sky-400/15 text-sky-300'
                        : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ perspective: 1200 }}>
            <motion.div
              onPointerMove={handleCardPointerMove}
              onPointerLeave={handleCardPointerLeave}
              style={{
                rotateX: cardRotateX,
                rotateY: cardRotateY,
                transformStyle: 'preserve-3d',
              }}
              className="overflow-hidden rounded-xl border border-white/10 bg-[#050a18] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="ml-2 font-mono text-xs text-white/50">
                    nuetify-android / {currentTab.fileName}
                  </span>
                </div>
                <span className="font-mono text-[11px] uppercase tracking-widest text-sky-400">
                  {currentTab.statusTag}
                </span>
              </div>

              <div className="grid divide-y divide-white/10 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
                <div className="p-6 sm:p-8 lg:col-span-7">
                  <span className="font-mono text-xs uppercase tracking-widest text-sky-400">
                    {currentTab.badge}
                  </span>
                  <h3 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                    {currentTab.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/65">
                    {currentTab.description}
                  </p>

                  <ul className="mt-6 space-y-3">
                    {currentTab.highlights.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-sm text-white/80"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className={`flex flex-col justify-between p-6 sm:p-8 lg:col-span-5 ${DIAGONAL_HATCH_CLASS}`}
                >
                  <div className="rounded-lg border border-white/10 bg-[#030712]/90 p-5 backdrop-blur">
                    <p className="font-mono text-xs uppercase tracking-widest text-sky-400">
                      {currentTab.metricLabel}
                    </p>
                    <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      {currentTab.metricValue}
                    </p>
                    <p className="mt-2 text-xs text-white/55">
                      {currentTab.metricSub}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-xs text-white/50">
                    <span>TARGET SDK</span>
                    <span className="text-white/80">ANDROID 8.0+ (API 26+)</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <div
          aria-hidden="true"
          className={`h-6 border-b border-white/10 ${DIAGONAL_HATCH_CLASS}`}
        />

        <section id="fitur" className="border-b border-white/10">
          <div className="border-b border-white/10 px-6 py-12 sm:px-10">
            <p className="font-mono text-xs uppercase tracking-widest text-sky-400">
              02 // KAPABILITAS INTI
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Dirancang Khusus untuk Kecepatan
            </h2>
          </div>

          <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.code}
                  initial={{ opacity: 0, y: 20, rotateX: 8 }}
                  whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: idx * 0.05 }}
                  className="flex flex-col justify-between bg-[#030712] p-6 sm:p-8"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-widest text-sky-400">
                        {feat.code}
                      </span>
                      <Icon className="h-4 w-4 text-white/40" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-white">
                      {feat.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">
                      {feat.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        <div
          aria-hidden="true"
          className={`h-6 border-b border-white/10 ${DIAGONAL_HATCH_CLASS}`}
        />

        <section id="cara-pasang" className="border-b border-white/10">
          <div className="border-b border-white/10 px-6 py-12 sm:px-10">
            <p className="font-mono text-xs uppercase tracking-widest text-sky-400">
              03 // INSTALASI ANDROID
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Tiga Langkah Mulai Mendengarkan
            </h2>
          </div>

          <div className="grid divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
            {INSTALL_STEPS.map((item) => (
              <div key={item.step} className="p-6 sm:p-8">
                <span className="font-mono text-xs uppercase tracking-widest text-sky-400">
                  {item.step}
                </span>
                <h3 className="mt-3 text-base font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          className={`border-b border-white/10 px-6 py-16 text-center sm:px-10 sm:py-20 ${DIAGONAL_HATCH_CLASS}`}
        >
          <div className="mx-auto max-w-2xl rounded-xl border border-white/10 bg-[#030712] p-8 sm:p-10">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sky-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Siap Pasang NueTify di Android?
            </h2>
            <p className="mt-3 text-sm text-white/65">
              Rilis resmi {release.version} · Ukuran {formattedSize} · Bebas
              iklan mengganggu.
            </p>
            <div className="mt-7 flex justify-center">
              {release.maintenance ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-6 py-3 text-sm font-medium text-amber-300">
                  <Wrench className="h-4 w-4" />
                  Server Rilis Sedang Maintenance
                </span>
              ) : (
                <a
                  href={release.downloadUrl}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-gray-950 transition hover:bg-sky-100"
                >
                  <Download className="h-4 w-4" />
                  Unduh APK {release.version}
                </a>
              )}
            </div>
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-white/50 sm:flex-row sm:px-10">
          <p className="font-mono">
            PT Nueva Group · NueTify (Android Only)
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="transition-colors hover:text-white"
            >
              /privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white">
              /terms
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
