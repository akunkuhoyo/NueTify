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

const SHOWCASE_CHIPS = [
  { label: 'Audio 24/7 Latar Belakang', icon: Headphones },
  { label: '5-Band Hardware EQ', icon: Sliders },
  { label: 'Global Chat Real-Time', icon: MessageSquareText },
  { label: 'Mode Offline', icon: WifiOff },
];

const BENTO_FEATURES = [
  {
    title: 'Pemutaran Latar Belakang 24/7',
    description:
      'Dengarkan musik tanpa henti saat layar mati atau berpindah aplikasi dengan mesin audio native berdaya rendah.',
    icon: Headphones,
    tag: 'Native Audio Engine',
  },
  {
    title: 'Equalizer Perangkat Keras',
    description:
      'Kontrol 5-band frekuensi presisi langsung di tingkat sistem Android dengan preset studio dan bass boost.',
    icon: Sliders,
    tag: '5-Band DSP',
  },
  {
    title: 'Global Chat Real-Time',
    description:
      'Terhubung dengan pendengar lain secara langsung di ruang obrolan global dengan pembaruan instan.',
    icon: MessageSquareText,
    tag: 'Live Community',
  },
  {
    title: 'Top 50 Leaderboard',
    description:
      'Pantau peringkat pendengar paling aktif dan lagu paling populer dalam papan peringkat yang diperbarui berkala.',
    icon: Trophy,
    tag: 'Live Ranking',
  },
  {
    title: 'Mode Offline Pintar',
    description:
      'Simpan trek favorit ke penyimpanan lokal terenkripsi untuk diputar kapan saja tanpa koneksi internet.',
    icon: WifiOff,
    tag: 'Offline Cache',
  },
  {
    title: 'Update Otomatis Dalam Aplikasi',
    description:
      'Setiap rilis APK terbaru langsung terdeteksi otomatis sehingga Anda selalu mendapatkan performa terbaik.',
    icon: Sparkles,
    tag: 'Auto Release Sync',
  },
];

const INSTALL_STEPS = [
  {
    step: '01',
    title: 'Unduh APK Terbaru',
    description:
      'Ketuk tombol unduh di halaman ini untuk mendapatkan berkas installer resmi NueTify versi terbaru.',
    icon: Download,
  },
  {
    step: '02',
    title: 'Izinkan Sumber Tidak Dikenal',
    description:
      'Buka pengaturan keamanan browser atau pengelola berkas Android, lalu aktifkan izin instalasi aplikasi.',
    icon: ShieldCheck,
  },
  {
    step: '03',
    title: 'Instal & Nikmati Musik',
    description:
      'Jalankan berkas APK, masuk dengan akun Anda, dan nikmati pengalaman audio Android Native sepenuhnya.',
    icon: CheckCircle2,
  },
];

export default function WebLandingPage() {
  const [release, setRelease] = useState<AppReleaseData | null>(null);
  const [loadingRelease, setLoadingRelease] = useState(true);

  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 24,
    restDelta: 0.001,
  });

  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroRotateX = useTransform(heroScrollProgress, [0, 1], [0, 18]);
  const heroY = useTransform(heroScrollProgress, [0, 1], [0, 72]);
  const heroOpacity = useTransform(heroScrollProgress, [0, 0.85], [1, 0.15]);
  const heroScale = useTransform(heroScrollProgress, [0, 1], [1, 0.94]);

  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const tiltRotateX = useSpring(rawRotateX, { stiffness: 180, damping: 22 });
  const tiltRotateY = useSpring(rawRotateY, { stiffness: 180, damping: 22 });

  const cardRawRotateX = useMotionValue(0);
  const cardRawRotateY = useMotionValue(0);
  const cardTiltX = useSpring(cardRawRotateX, { stiffness: 160, damping: 20 });
  const cardTiltY = useSpring(cardRawRotateY, { stiffness: 160, damping: 20 });

  useEffect(() => {
    let active = true;
    const fetchRelease = async () => {
      try {
        const res = await fetch('/api/app-release', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch release');
        const data = (await res.json()) as AppReleaseData;
        if (active) {
          setRelease(data);
        }
      } catch {
        if (active) {
          setRelease(null);
        }
      } finally {
        if (active) {
          setLoadingRelease(false);
        }
      }
    };
    fetchRelease();
    return () => {
      active = false;
    };
  }, []);

  const handleHeroPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rawRotateX.set(-py * 14);
    rawRotateY.set(px * 16);
  };

  const handleHeroPointerLeave = () => {
    rawRotateX.set(0);
    rawRotateY.set(0);
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    cardRawRotateX.set(-py * 12);
    cardRawRotateY.set(px * 14);
  };

  const handleCardPointerLeave = () => {
    cardRawRotateX.set(0);
    cardRawRotateY.set(0);
  };

  const isMaintenance = Boolean(release?.maintenance);
  const hasDownload = Boolean(release?.downloadUrl) && !isMaintenance;
  const formattedSize = release?.fileSizeMb ? `${release.fileSizeMb} MB` : 'APK';
  const versionLabel = release?.version || 'Terbaru';

  return (
    <div className="min-h-screen bg-[#08080A] text-white selection:bg-white selection:text-black overflow-x-clip">
      {/* Top Scroll Progress Line */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-zinc-600 via-white to-zinc-400 origin-left z-50"
        style={{ scaleX: smoothProgress }}
      />

      {/* Ambient Minimalist Monochrome Grid & Glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[460px] w-[760px] rounded-full bg-white/[0.05] blur-[140px]" />
      </div>

      {/* Sticky Minimalist Navbar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#08080A]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src="https://i.ibb.co.com/zVTpRV9L/Proyek-Baru-598-652-F167.png"
              alt="NueTify"
              className="h-7 w-auto object-contain"
            />
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              {versionLabel} · Android
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex sm:hidden items-center rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-300">
              {versionLabel}
            </span>
            {hasDownload ? (
              <motion.a
                href={release?.downloadUrl}
                download
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
              >
                <Download className="h-3.5 w-3.5" />
                Unduh APK
              </motion.a>
            ) : (
              <a
                href="#download-portal"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
              >
                <Smartphone className="h-3.5 w-3.5" />
                Unduh APK
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section with Full 3D Extruded Text */}
        <section
          id="download-portal"
          ref={heroRef}
          onPointerMove={handleHeroPointerMove}
          onPointerLeave={handleHeroPointerLeave}
          className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24 sm:pb-28"
          style={{ perspective: '1200px' }}
        >
          <motion.div
            style={{
              rotateX: heroRotateX,
              y: heroY,
              opacity: heroOpacity,
              scale: heroScale,
              transformStyle: 'preserve-3d',
            }}
            className="flex w-full flex-col items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-xs font-medium tracking-wide text-zinc-200 backdrop-blur-md"
            >
              <Smartphone className="h-3.5 w-3.5 text-zinc-300" />
              <span>Eksklusif Perangkat Android · Native APK</span>
            </motion.div>

            {/* 3D Interactive Pointer-Tracked Extruded Title */}
            <motion.div
              style={{
                rotateX: tiltRotateX,
                rotateY: tiltRotateY,
                transformStyle: 'preserve-3d',
              }}
              className="relative my-2 select-none py-4"
            >
              {/* Layer 1: Deep Thin Contour */}
              <span
                aria-hidden="true"
                style={{
                  transform: 'translateZ(-24px)',
                  WebkitTextStroke: '1px rgba(255,255,255,0.22)',
                }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center text-[clamp(3.6rem,14vw,9.5rem)] font-black leading-none tracking-[-0.06em] text-transparent"
              >
                NUETIFY
              </span>

              {/* Layer 2: Silver Depth Shadow */}
              <span
                aria-hidden="true"
                style={{ transform: 'translateZ(-12px)' }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center text-[clamp(3.6rem,14vw,9.5rem)] font-black leading-none tracking-[-0.06em] text-zinc-500/45 blur-[0.5px]"
              >
                NUETIFY
              </span>

              {/* Layer 3: Crisp White Front Layer */}
              <h1
                style={{ transform: 'translateZ(24px)' }}
                className="relative text-[clamp(3.6rem,14vw,9.5rem)] font-black leading-none tracking-[-0.06em] text-white drop-shadow-[0_12px_36px_rgba(255,255,255,0.12)]"
              >
                NUETIFY
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base"
            >
              Portal distribusi resmi aplikasi musik Android Native NueTify.
              Ringan, monokrom, dan dirancang khusus untuk pemutaran audio
              resolusi tinggi tanpa kompromi.
            </motion.p>

            {/* Primary Download CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-9 flex flex-col items-center gap-3"
            >
              {isMaintenance ? (
                <div className="inline-flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-6 py-4 text-left">
                  <Wrench className="h-5 w-5 shrink-0 text-amber-300" />
                  <div>
                    <p className="text-sm font-semibold text-amber-200">
                      Portal Unduhan Sedang Pemeliharaan
                    </p>
                    <p className="text-xs text-amber-200/75">
                      Rilis terbaru sedang disiapkan. Silakan coba beberapa saat
                      lagi.
                    </p>
                  </div>
                </div>
              ) : hasDownload ? (
                <motion.a
                  href={release?.downloadUrl}
                  download
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="group inline-flex items-center gap-3.5 rounded-2xl bg-white px-7 py-4 text-black shadow-[0_0_40px_rgba(255,255,255,0.18)] transition-colors hover:bg-zinc-200"
                >
                  <Download className="h-5 w-5 transition-transform group-hover:translate-y-0.5" />
                  <div className="text-left">
                    <div className="text-sm font-bold tracking-tight sm:text-base">
                      Unduh NueTify untuk Android
                    </div>
                    <div className="text-[11px] font-medium text-zinc-600">
                      {versionLabel} · {formattedSize}
                    </div>
                  </div>
                </motion.a>
              ) : (
                <div className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-4 text-sm text-zinc-300">
                  <Smartphone className="h-4 w-4 text-zinc-400" />
                  <span>
                    {loadingRelease
                      ? 'Memeriksa rilis APK terbaru...'
                      : 'Rilis APK belum tersedia saat ini.'}
                  </span>
                </div>
              )}

              <a
                href="#fitur"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-white"
              >
                <span>Jelajahi arsitektur fitur</span>
                <ArrowDown className="h-3.5 w-3.5" />
              </a>
            </motion.div>
          </motion.div>
        </section>

        {/* Interactive 3D Showcase Card */}
        <section
          className="mx-auto max-w-5xl px-4 pb-24 sm:px-6"
          style={{ perspective: '1200px' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 10 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7 }}
            onPointerMove={handleCardPointerMove}
            onPointerLeave={handleCardPointerLeave}
            style={{
              rotateX: cardTiltX,
              rotateY: cardTiltY,
              transformStyle: 'preserve-3d',
            }}
            className="relative rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.75)] sm:p-10"
          >
            <div className="flex flex-col justify-between gap-6 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Arsitektur Native
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Dibangun Khusus untuk Ekosistem Android
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-black/50 px-3.5 py-1.5 text-xs text-zinc-300">
                <span className="h-2 w-2 rounded-full bg-white" />
                <span>Sinkronisasi Rilis Otomatis</span>
              </div>
            </div>

            <div
              className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {SHOWCASE_CHIPS.map((chip) => {
                const Icon = chip.icon;
                return (
                  <div
                    key={chip.label}
                    style={{ transform: 'translateZ(28px)' }}
                    className="flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0D0D11]/90 px-4 py-4 shadow-[0_14px_30px_rgba(0,0,0,0.45)]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06]">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs font-semibold leading-snug text-zinc-100">
                      {chip.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </section>

        {/* 6-Card Minimalist 3D Bento Feature Grid */}
        <section
          id="fitur"
          className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24"
          style={{ perspective: '1200px' }}
        >
          <div className="mb-12 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Kemampuan Inti
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Dirancang untuk Pengalaman Musik Murni
              </h2>
            </div>
            <p className="max-w-md text-sm text-zinc-400">
              Setiap modul dioptimalkan untuk efisiensi baterai, stabilitas
              pemutaran, dan interaksi komunitas real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {BENTO_FEATURES.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 36, rotateX: 12 }}
                  whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: idx * 0.06 }}
                  whileHover={{ y: -6, scale: 1.015 }}
                  className="group flex flex-col justify-between rounded-3xl border border-white/12 bg-white/[0.03] p-6 transition-colors hover:border-white/25 hover:bg-white/[0.05]"
                >
                  <div>
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.05] text-white transition-transform group-hover:scale-105">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                        {feature.tag}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold tracking-tight text-white">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* 3-Step Android Installation Guide */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mb-12 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Panduan Instalasi Android
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Tiga Langkah Cepat Memulai
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {INSTALL_STEPS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="relative rounded-3xl border border-white/12 bg-[#0C0C10] p-6"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="font-mono text-2xl font-black tracking-tight text-zinc-500">
                      {item.step}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04]">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {item.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Closing 3D CTA */}
        <section
          className="mx-auto max-w-5xl px-4 pt-8 pb-24 sm:px-6"
          style={{ perspective: '1200px' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 32, rotateX: 10 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center rounded-3xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.02] px-6 py-14 text-center sm:px-12"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-1 text-[11px] font-medium text-zinc-300">
              <Smartphone className="h-3.5 w-3.5" />
              Hanya untuk Android
            </span>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Siap Mendengarkan Tanpa Batas?
            </h2>
            <p className="mt-3 max-w-lg text-sm text-zinc-400 sm:text-base">
              Dapatkan rilis Android Native terbaru secara langsung dengan
              pembaruan versi dan ukuran berkas otomatis.
            </p>

            <div className="mt-8">
              {isMaintenance ? (
                <div className="inline-flex items-center gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-6 py-3.5 text-sm font-medium text-amber-200">
                  <Wrench className="h-4 w-4" />
                  Sedang Pemeliharaan
                </div>
              ) : hasDownload ? (
                <motion.a
                  href={release?.downloadUrl}
                  download
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-3 rounded-2xl bg-white px-7 py-4 text-sm font-bold text-black shadow-[0_0_36px_rgba(255,255,255,0.16)] transition-colors hover:bg-zinc-200 sm:text-base"
                >
                  <Download className="h-5 w-5" />
                  <span>
                    Unduh APK ({versionLabel} · {formattedSize})
                  </span>
                </motion.a>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm text-zinc-400">
                  {loadingRelease
                    ? 'Memuat informasi rilis...'
                    : 'Berkas APK belum tersedia'}
                </span>
              )}
            </div>
          </motion.div>
        </section>
      </main>

      {/* Minimalist Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#08080A]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-zinc-400 sm:flex-row sm:px-6">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <span className="font-semibold text-white">PT Nueva Group</span>
            <span>Hanya tersedia untuk Android</span>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="transition-colors hover:text-white"
            >
              Kebijakan Privasi
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white">
              Syarat &amp; Ketentuan
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
