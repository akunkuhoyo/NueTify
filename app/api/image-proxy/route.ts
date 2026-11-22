import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAllowedArtworkHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.endsWith('.googleusercontent.com') ||
    h.endsWith('.ytimg.com') ||
    h.endsWith('.ggpht.com') ||
    h.endsWith('.youtube.com') ||
    h.endsWith('.vercel.app')
  );
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url') || '';
  if (!raw) return new Response('Missing url', { status: 400 });
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return new Response('Invalid url', { status: 400 });
  }
  if (parsed.protocol !== 'https:' || !isAllowedArtworkHost(parsed.hostname)) {
    return new Response('Host not allowed', { status: 403 });
  }
  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'NueTify/1.0' },
      cache: 'force-cache',
    });
    if (!upstream.ok) return new Response('Upstream error', { status: upstream.status });
    const buf = await upstream.arrayBuffer();
    return new Response(buf, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response('Fetch failed', { status: 502 });
  }
}
