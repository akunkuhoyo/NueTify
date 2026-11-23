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

const PAGE_MODIFIERS = ['audio', 'lyrics', 'remix', 'cover', 'live', 'slowed', 'acoustic', 'official'];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get('q') || '').trim();
  const type = (searchParams.get('type') || 'all').toLowerCase();
  const gl = searchParams.get('gl') || 'ID';
  const suggest = searchParams.get('suggest') === '1';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  if (!query) {
    return NextResponse.json({ results: [], suggestions: [] });
  }

  try {
    const yt = await getYTMusicClient({ gl, hl: 'en' });

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

      const songs =
        songsRes.status === 'fulfilled'
          ? songsRes.value.map((s) => ({ ...normalizeSong(s), kind: 'TRACK' as const }))
          : [];
      const videos =
        videosRes.status === 'fulfilled'
          ? videosRes.value.map((v) => ({ ...normalizeVideo(v), kind: 'TRACK' as const }))
          : [];

      const seen = new Set<string>();
      const dedupedTracks = [];
      for (const track of [...songs, ...videos]) {
        if (track.videoId && !seen.has(track.videoId)) {
          seen.add(track.videoId);
          dedupedTracks.push(track);
        }
      }

      return NextResponse.json({
        results: dedupedTracks,
        hasMore: page <= PAGE_MODIFIERS.length,
      });
    }

    if (type === 'songs') {
      const [songsRes, videosRes] = await Promise.allSettled([
        yt.searchSongs(query),
        yt.searchVideos(query),
      ]);

      const songs =
        songsRes.status === 'fulfilled'
          ? songsRes.value.map((s) => ({ ...normalizeSong(s), kind: 'TRACK' as const }))
          : [];
      const videos =
        videosRes.status === 'fulfilled'
          ? videosRes.value.map((v) => ({ ...normalizeVideo(v), kind: 'TRACK' as const }))
          : [];

      const seen = new Set<string>();
      const dedupedTracks = [];
      for (const track of [...songs, ...videos]) {
        if (track.videoId && !seen.has(track.videoId)) {
          seen.add(track.videoId);
          dedupedTracks.push(track);
        }
      }

      return NextResponse.json({
        results: dedupedTracks,
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
      });
    }

    if (type === 'artists') {
      const artists = await yt.searchArtists(query);
      return NextResponse.json({
        results: artists.map((a) => ({ ...normalizeArtist(a), kind: 'ARTIST' as const })),
      });
    }

    if (type === 'playlists') {
      const playlists = await yt.searchPlaylists(query);
      return NextResponse.json({
        results: playlists.map((p) => ({
          ...normalizePlaylist(p),
          kind: 'PLAYLIST' as const,
        })),
      });
    }

    const [mixedRes, songsRes, videosRes] = await Promise.allSettled([
      yt.search(query),
      yt.searchSongs(query),
      yt.searchVideos(query),
    ]);

    const mixedNormalized =
      mixedRes.status === 'fulfilled'
        ? mixedRes.value
            .map(normalizeSearchItem)
            .filter((item): item is NonNullable<typeof item> => item !== null)
        : [];

    const seenTrackIds = new Set<string>();
    for (const item of mixedNormalized) {
      if (item.kind === 'TRACK' && item.videoId) {
        seenTrackIds.add(item.videoId);
      }
    }

    const extraSongs =
      songsRes.status === 'fulfilled'
        ? songsRes.value.map((s) => ({ ...normalizeSong(s), kind: 'TRACK' as const }))
        : [];
    const extraVideos =
      videosRes.status === 'fulfilled'
        ? videosRes.value.map((v) => ({ ...normalizeVideo(v), kind: 'TRACK' as const }))
        : [];

    const combined = [...mixedNormalized];
    for (const track of [...extraSongs, ...extraVideos]) {
      if (track.videoId && !seenTrackIds.has(track.videoId)) {
        seenTrackIds.add(track.videoId);
        combined.push(track);
      }
    }

    return NextResponse.json({ results: combined, hasMore: true });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search temporarily unavailable', results: [], suggestions: [] },
      { status: 500 }
    );
  }
}
