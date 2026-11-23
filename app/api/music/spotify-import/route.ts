import { NextRequest, NextResponse } from 'next/server';
import { getYTMusicClient, normalizeSong } from '@/lib/server/ytmusic';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function extractSpotifyPlaylistId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?playlist\/([a-zA-Z0-9]{22})/i);
  if (urlMatch) return urlMatch[1];
  const uriMatch = trimmed.match(/spotify:playlist:([a-zA-Z0-9]{22})/i);
  if (uriMatch) return uriMatch[1];
  const idMatch = trimmed.match(/^([a-zA-Z0-9]{22})$/);
  if (idMatch) return idMatch[1];
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const rawUrl = req.nextUrl.searchParams.get('url') || req.nextUrl.searchParams.get('id') || '';
    const gl = req.nextUrl.searchParams.get('gl') || 'ID';

    const playlistId = extractSpotifyPlaylistId(rawUrl);
    if (!playlistId) {
      return NextResponse.json(
        { error: 'URL atau ID playlist Spotify tidak valid.' },
        { status: 400 }
      );
    }

    const embedRes = await fetch(`https://open.spotify.com/embed/playlist/${playlistId}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    });

    if (!embedRes.ok) {
      return NextResponse.json(
        { error: 'Playlist Spotify bersifat privat atau tidak ditemukan lagunya. Pastikan playlist disetel ke Publik.' },
        { status: 404 }
      );
    }

    const html = await embedRes.text();
    const nextDataMatch = html.match(
      /<script\s+id="__NEXT_DATA__"\s+type="application\/json"[^>]*>([\s\S]*?)<\/script>/i
    );

    if (!nextDataMatch || !nextDataMatch[1]) {
      return NextResponse.json(
        { error: 'Playlist Spotify bersifat privat atau tidak ditemukan lagunya. Pastikan playlist disetel ke Publik.' },
        { status: 404 }
      );
    }

    const parsed = JSON.parse(nextDataMatch[1]);
    const entity = parsed?.props?.pageProps?.state?.data?.entity;
    const title = entity?.name || entity?.title || 'Spotify Playlist';
    const thumbnail =
      entity?.coverArt?.sources?.[0]?.url ||
      entity?.visualIdentity?.image?.[0]?.url ||
      '';
    const rawTracks = Array.isArray(entity?.trackList) ? entity.trackList : [];

    if (rawTracks.length === 0) {
      return NextResponse.json(
        { error: 'Playlist Spotify bersifat privat atau tidak ditemukan lagunya. Pastikan playlist disetel ke Publik.' },
        { status: 404 }
      );
    }

    const limitedTracks = rawTracks.slice(0, 35);
    const yt = await getYTMusicClient({ gl, hl: 'en' });
    const tracks: ReturnType<typeof normalizeSong>[] = [];
    const seenIds = new Set<string>();

    const BATCH_SIZE = 5;
    for (let i = 0; i < limitedTracks.length; i += BATCH_SIZE) {
      const batch = limitedTracks.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (t: { title?: string; subtitle?: string }) => {
          const query = `${t.title || ''} ${t.subtitle || ''}`.trim();
          if (!query) return null;
          const songs = await yt.searchSongs(query);
          if (Array.isArray(songs) && songs.length > 0) {
            return normalizeSong(songs[0]);
          }
          return null;
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value && r.value.videoId) {
          if (!seenIds.has(r.value.videoId)) {
            seenIds.add(r.value.videoId);
            tracks.push(r.value);
          }
        }
      }
    }

    return NextResponse.json({
      title,
      thumbnail,
      tracks,
      totalSourceTracks: rawTracks.length,
    });
  } catch (error) {
    console.error('Spotify import error:', error);
    return NextResponse.json(
      { error: 'Gagal mengimpor playlist Spotify.' },
      { status: 500 }
    );
  }
}
