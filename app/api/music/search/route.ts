import { NextRequest, NextResponse } from 'next/server';
import {
  getYTMusicClient,
  normalizeAlbum,
  normalizeArtist,
  normalizePlaylist,
  normalizeSearchItem,
  normalizeSong,
  normalizeVideo,
} from '@/lib/server/ytmusic';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PAGE_MODIFIERS = [
  'remix',
  'slowed reverb',
  'dj',
  'cover',
  'live',
  'acoustic',
  'lyrics',
  'official',
];

const STYLE_MODIFIERS = [
  'dj',
  'remix',
  'rmx',
  'slowed',
  'reverb',
  'sped',
  'nightcore',
  'koplo',
  'dangdut',
  'acoustic',
  'akustik',
  'live',
  'cover',
  'karaoke',
  'instrumental',
  'phonk',
  'jj',
  'slowbass',
  'bass',
  'tiktok',
  'viral',
  'jedag',
];

function extractTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function getMeaningfulTokens(query: string): string[] {
  const tokens = extractTokens(query);
  const nonModifier = tokens.filter((t) => !STYLE_MODIFIERS.includes(t));
  return nonModifier.length > 0 ? nonModifier : tokens;
}

function hasMeaningfulTokenMatch(
  track: { title?: string; artist?: string },
  query: string
): boolean {
  const meaningful = getMeaningfulTokens(query);
  if (meaningful.length === 0) return true;
  const haystack = `${track.title || ''} ${track.artist || ''}`.toLowerCase();
  return meaningful.some((token) => haystack.includes(token));
}

function scoreTrackRelevance(
  track: { title?: string; artist?: string; type?: string },
  query: string
): number {
  const queryLower = query.toLowerCase().trim();
  const queryTokens = extractTokens(query);
  const queryModifiers = STYLE_MODIFIERS.filter((m) => queryTokens.includes(m));
  const haystack = `${track.title || ''} ${track.artist || ''}`.toLowerCase();

  let score = 0;

  if (queryLower && haystack.includes(queryLower)) {
    score += 100;
  }

  let matchedTokens = 0;
  for (const token of queryTokens) {
    if (haystack.includes(token)) {
      matchedTokens += 1;
    }
  }
  score += matchedTokens * 25;

  if (queryModifiers.length > 0) {
    let matchedModifiers = 0;
    for (const mod of queryModifiers) {
      if (haystack.includes(mod)) {
        matchedModifiers += 1;
        score += 120;
      }
    }
    if (matchedModifiers === 0) {
      score -= 120;
    }
  } else {
    const hasStyleWord = STYLE_MODIFIERS.some((m) =>
      new RegExp(`\\b${m}\\b`, 'i').test(haystack)
    );
    if (track.type === 'SONG' && !hasStyleWord) {
      score += 35;
    } else if (hasStyleWord && matchedTokens > 0) {
      score += 15;
    }
  }

  return score;
}

type TrackCandidate = {
  videoId?: string;
  title?: string;
  artist?: string;
  type?: string;
  kind: string;
  [key: string]: unknown;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') || '').trim();
  const type = (searchParams.get('type') || 'all').toLowerCase();
  const gl = searchParams.get('gl') || 'ID';
  const hl = gl.toUpperCase() === 'ID' ? 'id' : 'en';
  const suggest = searchParams.get('suggest') === '1';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  if (!query) {
    return NextResponse.json({ results: [], suggestions: [] });
  }

  try {
    const yt = await getYTMusicClient({ gl, hl });

    if (suggest) {
      const suggestions = await yt.getSearchSuggestions(query);
      return NextResponse.json({ suggestions: suggestions.slice(0, 8) });
    }

    if (page > 1 && (type === 'all' || type === 'songs' || type === 'videos')) {
      if (page > PAGE_MODIFIERS.length + 1) {
        return NextResponse.json({ results: [], hasMore: false });
      }

      const mod = PAGE_MODIFIERS[(page - 2) % PAGE_MODIFIERS.length];
      const [songsRes, videosRes] = await Promise.allSettled([
        yt.searchSongs(`${query} ${mod}`),
        yt.searchVideos(`${query} ${mod}`),
      ]);

      const songs: TrackCandidate[] =
        songsRes.status === 'fulfilled'
          ? songsRes.value.map((s) => ({ ...normalizeSong(s), kind: 'TRACK' as const }))
          : [];
      const videos: TrackCandidate[] =
        videosRes.status === 'fulfilled'
          ? videosRes.value.map((v) => ({ ...normalizeVideo(v), kind: 'TRACK' as const }))
          : [];

      const seen = new Set<string>();
      const dedupedTracks: TrackCandidate[] = [];
      for (const track of [...songs, ...videos]) {
        if (
          track.videoId &&
          !seen.has(track.videoId) &&
          hasMeaningfulTokenMatch(track, query)
        ) {
          seen.add(track.videoId);
          dedupedTracks.push(track);
        }
      }

      dedupedTracks.sort(
        (a, b) => scoreTrackRelevance(b, query) - scoreTrackRelevance(a, query)
      );

      return NextResponse.json({
        results: dedupedTracks,
        hasMore: page <= PAGE_MODIFIERS.length,
      });
    }

    if (type === 'all' || type === 'songs') {
      const [allRes, songsRes, videosRes] = await Promise.allSettled([
        yt.search(query),
        yt.searchSongs(query),
        yt.searchVideos(query),
      ]);

      const allItems =
        allRes.status === 'fulfilled'
          ? allRes.value.map(normalizeSearchItem).filter(Boolean)
          : [];
      const allTracks = allItems.filter((item) => item !== null && item.kind === 'TRACK') as unknown as TrackCandidate[];
      const nonTracks =
        type === 'all'
          ? allItems.filter((item) => item && item.kind !== 'TRACK')
          : [];

      const songs: TrackCandidate[] =
        songsRes.status === 'fulfilled'
          ? songsRes.value
              .map((s) => ({ ...normalizeSong(s), kind: 'TRACK' as const }))
              .filter((t) => hasMeaningfulTokenMatch(t, query))
          : [];
      const videos: TrackCandidate[] =
        videosRes.status === 'fulfilled'
          ? videosRes.value
              .map((v) => ({ ...normalizeVideo(v), kind: 'TRACK' as const }))
              .filter((t) => hasMeaningfulTokenMatch(t, query))
          : [];

      const seen = new Set<string>();
      const dedupedTracks: TrackCandidate[] = [];
      for (const track of [...allTracks, ...songs, ...videos]) {
        if (track.videoId && !seen.has(track.videoId)) {
          seen.add(track.videoId);
          dedupedTracks.push(track);
        }
      }

      dedupedTracks.sort(
        (a, b) => scoreTrackRelevance(b, query) - scoreTrackRelevance(a, query)
      );

      return NextResponse.json({
        results: [...dedupedTracks, ...nonTracks],
        hasMore: true,
      });
    }

    if (type === 'videos') {
      const videos = await yt.searchVideos(query);
      return NextResponse.json({
        results: videos.map((v) => ({ ...normalizeVideo(v), kind: 'TRACK' as const })),
        hasMore: true,
      });
    }

    if (type === 'albums') {
      const albums = await yt.searchAlbums(query);
      return NextResponse.json({
        results: albums.map((a) => ({ ...normalizeAlbum(a), kind: 'ALBUM' as const })),
        hasMore: false,
      });
    }

    if (type === 'artists') {
      const artists = await yt.searchArtists(query);
      return NextResponse.json({
        results: artists.map((a) => ({ ...normalizeArtist(a), kind: 'ARTIST' as const })),
        hasMore: false,
      });
    }

    if (type === 'playlists') {
      const playlists = await yt.searchPlaylists(query);
      return NextResponse.json({
        results: playlists.map((p) => ({ ...normalizePlaylist(p), kind: 'PLAYLIST' as const })),
        hasMore: false,
      });
    }

    const items = await yt.search(query);
    return NextResponse.json({
      results: items.map(normalizeSearchItem).filter(Boolean),
      hasMore: false,
    });
  } catch (error) {
    console.error('[api/music/search] error:', error);
    return NextResponse.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    );
  }
}
