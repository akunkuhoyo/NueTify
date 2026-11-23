import { NextRequest, NextResponse } from 'next/server';
import {
  getYTMusicClient,
  normalizeSong,
  normalizeVideo,
} from '@/lib/server/ytmusic';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CandidateTrack = ReturnType<typeof normalizeSong>;

const INDIAN_BOLLYWOOD_REGEX =
  /\b(hindi|bollywood|punjabi|bhojpuri|tamil|telugu|arijit|alka|udit|badshah|neha kakkar|shreya|praveen|tiwari|narayan|bhool|shanti|dulhan|laila)\b/i;
const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

const DJ_REMIX_REGEX =
  /\b(dj|remix|rmx|slowbass|slowed|jedag|jedug|jj|tiktok|viral|full\s*bass|bass\s*glerr|funkot|breakbeat|koplo|dangdut)\b/i;

function hasIndianIndicators(text: string): boolean {
  return INDIAN_BOLLYWOOD_REGEX.test(text) || DEVANAGARI_REGEX.test(text);
}

function isUnrelatedForeignTrack(
  track: { title?: string; artist?: string },
  seedText: string
): boolean {
  if (hasIndianIndicators(seedText)) {
    return false;
  }
  const trackText = `${track.title || ''} ${track.artist || ''}`;
  return hasIndianIndicators(trackText);
}

function extractPrimaryArtist(artist: string): string {
  return artist
    .split(/,|&|\bfeat\.?\b|\bft\.?\b|\bx\b/i)[0]
    .trim();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = (searchParams.get('videoId') || '').trim();
  const title = (searchParams.get('title') || '').trim();
  const artist = (searchParams.get('artist') || '').trim();
  const gl = searchParams.get('gl') || 'ID';
  const hl = gl.toUpperCase() === 'ID' ? 'id' : 'en';

  if (!videoId) {
    return NextResponse.json({ tracks: [] });
  }

  try {
    const yt = await getYTMusicClient({ gl, hl });
    const seedText = `${title} ${artist}`.trim();
    const primaryArtist = extractPrimaryArtist(artist);
    const isDjMode = DJ_REMIX_REGEX.test(seedText);

    const seenIds = new Set<string>([videoId]);
    const seenTitles = new Set<string>();
    if (title) {
      seenTitles.add(title.toLowerCase().trim());
    }

    const dedupeAndFilter = (items: CandidateTrack[]): CandidateTrack[] => {
      const result: CandidateTrack[] = [];
      for (const item of items) {
        if (!item.videoId || seenIds.has(item.videoId)) continue;
        const normalizedTitle = (item.title || '').toLowerCase().trim();
        if (normalizedTitle && seenTitles.has(normalizedTitle)) continue;
        if (isUnrelatedForeignTrack(item, seedText)) continue;
        seenIds.add(item.videoId);
        if (normalizedTitle) {
          seenTitles.add(normalizedTitle);
        }
        result.push(item);
      }
      return result;
    };

    if (isDjMode) {
      const [upNextRes, artistVideosRes] = await Promise.allSettled([
        yt.getUpNexts(videoId),
        primaryArtist
          ? yt.searchVideos(`${primaryArtist} DJ remix`)
          : Promise.resolve([]),
      ]);

      const rawUpNexts =
        upNextRes.status === 'fulfilled'
          ? upNextRes.value.map(normalizeSong)
          : [];
      const rawArtistVideos =
        artistVideosRes.status === 'fulfilled'
          ? artistVideosRes.value.map(normalizeVideo)
          : [];

      const filteredUpNexts = dedupeAndFilter(rawUpNexts);
      const djVibeUpNexts = filteredUpNexts.filter((t) =>
        DJ_REMIX_REGEX.test(`${t.title || ''} ${t.artist || ''}`)
      );
      const otherUpNexts = filteredUpNexts.filter(
        (t) => !DJ_REMIX_REGEX.test(`${t.title || ''} ${t.artist || ''}`)
      );
      const filteredArtistVideos = dedupeAndFilter(rawArtistVideos);

      const combined: CandidateTrack[] = [
        ...djVibeUpNexts,
        ...filteredArtistVideos,
        ...otherUpNexts,
      ];

      if (combined.length < 10) {
        try {
          const fallbackVideos = await yt.searchVideos(
            'DJ tiktok viral indonesia full bass'
          );
          const normalizedFallback = dedupeAndFilter(
            fallbackVideos.map(normalizeVideo)
          );
          combined.push(...normalizedFallback);
        } catch {
          // ignore fallback error
        }
      }

      return NextResponse.json({ tracks: combined.slice(0, 25) });
    }

    const [upNextRes, artistSongsRes] = await Promise.allSettled([
      yt.getUpNexts(videoId),
      primaryArtist ? yt.searchSongs(primaryArtist) : Promise.resolve([]),
    ]);

    const rawUpNexts =
      upNextRes.status === 'fulfilled'
        ? upNextRes.value.map(normalizeSong)
        : [];
    const rawArtistSongs =
      artistSongsRes.status === 'fulfilled'
        ? artistSongsRes.value.map(normalizeSong)
        : [];

    const upNextPool = dedupeAndFilter(rawUpNexts);
    const sameArtistPool = primaryArtist
      ? dedupeAndFilter(
          rawArtistSongs.filter((t) =>
            (t.artist || '')
              .toLowerCase()
              .includes(primaryArtist.toLowerCase())
          )
        )
      : [];

    const tracks: CandidateTrack[] = [];
    let u = 0;
    let s = 0;
    while (
      tracks.length < 25 &&
      (u < upNextPool.length || s < sameArtistPool.length)
    ) {
      if (u < upNextPool.length && tracks.length < 25) {
        tracks.push(upNextPool[u++]);
      }
      if (s < sameArtistPool.length && tracks.length < 25) {
        tracks.push(sameArtistPool[s++]);
      }
    }

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('UpNext API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch up-next tracks', tracks: [] },
      { status: 500 }
    );
  }
}
