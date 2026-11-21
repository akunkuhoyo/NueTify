import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sonara — Spatial Music',
  description:
    'iOS 27 Liquid Glass YouTube Music web client powered by ytmusic-api and Sonara recommendation & queue engine.',
  openGraph: {
    title: 'Sonara — Spatial Music',
    description:
      'iOS 27 Liquid Glass YouTube Music web client powered by ytmusic-api and Sonara recommendation & queue engine.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sonara — Spatial Music',
    description:
      'iOS 27 Liquid Glass YouTube Music web client powered by ytmusic-api and Sonara recommendation & queue engine.',
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
        {children}
      </body>
    </html>
  );
}
