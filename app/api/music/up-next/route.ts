import { NextRequest, NextResponse } from 'next/server';
import { SEED_TRACKS } from '@/lib/metrolist/seed';
import { getYTMusicClient, normalizeSong, normalizeVideo } from '@/lib/server/ytmusic';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CandidateTrack = ReturnType<typeof normalizeSong> | ReturnType<typeof normalizeVideo>;

interface VibeRule {
  regex: RegExp;
  query: string;
}

const VIBE_RULES: VibeRule[] = [
  {
    regex: /\b(dj|remix|rmx|jedag\s*jedug|jj|slowbass|slow\s*bass|full\s*bass|breakbeat|funkot)\b/i,
    query: 'DJ remix full bass',
  },
  {
    regex: /\b(slowed|reverb|sped\s*up|nightcore|8d)\b/i,
    query: 'slowed reverb',
  },
  {
    regex: /\b(koplo|dangdut|campursari)\b/i,
    query: 'dangdut koplo',
  },
  {
    regex: /\b(phonk|montagem)\b/i,
    query: 'phonk',
  },
  {
    regex: /\b(lo-?fi|acoustic|akustik|sholawat|instrumental)\b/i,
    query: 'lofi acoustic',
  },
];

function lightShuffle<T>(items: T[], groupSize = 4): T[] {
  const result: T[] = [];
  for (let i = 0; i < items.length; i += groupSize) {
    const chunk = items.slice(i, i + groupSize);
    for (let j = chunk.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [chunk[j], chunk[k]] = [chunk[k], chunk[j]];
    }
    result.push(...chunk);
  }
  return result;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = (searchParams.get('videoId') || '').trim();
  const title = (searchParams.get('title') || '').trim();
  const artist = (searchParams.get('artist') || '').trim();
  const gl = searchParams.get('gl') || 'ID';

  if (!videoId) {
    return NextResponse.json({ tracks: [] }, { status: 400 });
  }

  const primaryArtist = artist.split(/,|&|feat\.?|ft\.?|x\s/i)[0].trim();
  const combinedText = `${title} ${artist}`.trim();
  const matchedVibe = VIBE_RULES.find((rule) => rule.regex.test(combinedText));

  try {
    const yt = await getYTMusicClient({ gl, hl: 'en' });

    const seenIds = new Set<string>([videoId]);
    const seenTitles = new Set<string>();
    if (title) {
      seenTitles.add(title.toLowerCase());
    }

    const dedupe = (list: CandidateTrack[]): CandidateTrack[] => {
      const unique: CandidateTrack[] = [];
      for (const item of list) {
        if (!item?.videoId || seenIds.has(item.videoId)) continue;
        const normTitle = (item.title || '').toLowerCase().trim();
        if (normTitle && seenTitles.has(normTitle)) continue;
        seenIds.add(item.videoId);
        if (normTitle) seenTitles.add(normTitle);
        unique.push(item);
      }
      return unique;
    };

    if (matchedVibe) {
      const vibeQuery =
        /\bsholawat\b/i.test(combinedText) ? 'sholawat' : matchedVibe.query;
      const songQuery = primaryArtist ? `${vibeQuery} ${primaryArtist}` : vibeQuery;
      const videoQuery = `${vibeQuery} viral`;

      const [upNextRes, vibeSongsRes, vibeVideosRes] = await Promise.allSettled([
        yt.getUpNexts(videoId),
        yt.searchSongs(songQuery),
        yt.searchVideos(videoQuery),
      ]);

      const vibeSongs =
        vibeSongsRes.status === 'fulfilled' ? vibeSongsRes.value.map(normalizeSong) : [];
      const vibeVideos =
        vibeVideosRes.status === 'fulfilled' ? vibeVideosRes.value.map(normalizeVideo) : [];
      const upNexts =
        upNextRes.status === 'fulfilled' ? upNextRes.value.map(normalizeSong) : [];

      const merged = dedupe([...vibeSongs, ...vibeVideos, ...upNexts]);
      const tierMatched: CandidateTrack[] = [];
      const tierOther: CandidateTrack[] = [];

      for (const track of merged) {
        if (matchedVibe.regex.test(`${track.title} ${track.artist}`)) {
          tierMatched.push(track);
        } else {
          tierOther.push(track);
        }
      }

      const tracks = [...lightShuffle(tierMatched, 4), ...lightShuffle(tierOther, 4)].slice(
        0,
        25
      );
      return NextResponse.json({ tracks });
    }

    const [upNextRes, artistSongsRes] = await Promise.allSettled([
      yt.getUpNexts(videoId),
      primaryArtist ? yt.searchSongs(primaryArtist) : Promise.resolve([]),
    ]);

    const rawArtistSongs =
      artistSongsRes.status === 'fulfilled' ? artistSongsRes.value.map(normalizeSong) : [];
    const rawUpNexts =
      upNextRes.status === 'fulfilled' ? upNextRes.value.map(normalizeSong) : [];

    const sameArtistPool = lightShuffle(dedupe(rawArtistSongs), 4);
    const relatedPool = dedupe(rawUpNexts);

    const tracks: CandidateTrack[] = [];
    let i = 0;
    let j = 0;
    while (tracks.length < 25 && (i < sameArtistPool.length || j < relatedPool.length)) {
      for (let c = 0; c < 2 && i < sameArtistPool.length && tracks.length < 25; c++) {
        tracks.push(sameArtistPool[i++]);
      }
      if (j < relatedPool.length && tracks.length < 25) {
        tracks.push(relatedPool[j++]);
      }
    }

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error('UpNext API error:', error);
    return NextResponse.json({
      tracks: SEED_TRACKS.filter((t) => t.videoId !== videoId),
    });
  }
}
