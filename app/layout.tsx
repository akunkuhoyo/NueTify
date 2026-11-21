import type { Metadata, Viewport } from 'next';
import { PwaRegister } from '@/components/PwaRegister';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#000000',
};

export const metadata: Metadata = {
  title: 'NueTify',
  applicationName: 'NueTify',
  description:
    'NueTify — 24/7 Spatial Music Streaming PWA powered by ytmusic-api.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'NueTify',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'NueTify',
    description:
      'NueTify — 24/7 Spatial Music Streaming PWA powered by ytmusic-api.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NueTify',
    description:
      'NueTify — 24/7 Spatial Music Streaming PWA powered by ytmusic-api.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="dark"
      style={{
        ['--font-jakarta' as string]: '"Plus Jakarta Sans", system-ui, sans-serif',
        ['--font-dm-sans' as string]: '"DM Sans", system-ui, sans-serif',
        ['--font-jetbrains' as string]: '"JetBrains Mono", monospace',
      }}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-[var(--m3-bg)] text-[#1A1C20] dark:text-[#E6E8EE] selection:bg-[var(--m3-primary-soft)] selection:text-[var(--m3-primary)] transition-colors duration-200"
        suppressHydrationWarning
      >
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
