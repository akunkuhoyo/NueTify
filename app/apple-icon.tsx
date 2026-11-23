export const runtime = 'nodejs';
export const contentType = 'image/png';

const LOGO_URL =
  'https://i.ibb.co.com/zWnqqSFM/Proyek-Baru-597-FE9-F6-D7.png';

export default async function AppleIcon() {
  const res = await fetch(LOGO_URL, { cache: 'force-cache' });
  const buf = await res.arrayBuffer();
  return new Response(buf, {
    headers: {
      'Content-Type': res.headers.get('content-type') || 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
