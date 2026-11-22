import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/AppShell';

export const viewport: Viewport = {
  themeColor: '#121212',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'NueTify',
  description: 'NueTify – 24/7 Spatial Music Streaming PWA. Dikembangkan oleh Tim PT Nueva Group.',
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
  appleWebApp: {
    capable: true,
    title: 'NueTify',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'NueTify',
    description:
      'NueTify – 24/7 Spatial Music Streaming PWA. Dikembangkan oleh Tim PT Nueva Group.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NueTify',
    description:
      'NueTify – 24/7 Spatial Music Streaming PWA. Dikembangkan oleh Tim PT Nueva Group.',
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
        className="min-h-screen bg-[#121212] text-[#E5E5E5] selection:bg-[var(--m3-primary-soft)] selection:text-[var(--m3-primary)] transition-colors duration-200"
        suppressHydrationWarning
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
