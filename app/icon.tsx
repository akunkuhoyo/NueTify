export const runtime = 'nodejs';
export const contentType = 'image/jpeg';

const LOGO_URL =
  'https://raw.githubusercontent.com/nuenime/Prompt/refs/heads/main/IMG-20261014-WA0188.jpg';

export default async function Icon() {
  const res = await fetch(LOGO_URL, { cache: 'force-cache' });
  const buf = await res.arrayBuffer();
  return new Response(buf, {
    headers: {
      'Content-Type': res.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}
