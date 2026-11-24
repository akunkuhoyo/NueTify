import { NextRequest, NextResponse } from 'next/server';
import {
getYTMusic,
normalizeSong,
normalizeVideo,
normalizeAlbum,
normalizeArtist,
normalizePlaylist,
normalizeSearchItem,
} from '@/lib/server/ytmusic';

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

const MODIFIER_GROUPS: Record<string, string[]> = {
dj: ['dj', 'remix', 'rmx', 'jj', 'jedag', 'slowbass', 'full bass', 'breakbeat', 'funkot', 'bass'],
remix: ['remix', 'rmx', 'dj', 'mashup', 'bootleg', 'club'],
slowed: ['slowed', 'reverb', 'slow', 'slowed + reverb'],
reverb: ['reverb', 'slowed'],
sped: ['sped up', 'sped', 'nightcore', 'fast'],
koplo: ['koplo', 'dangdut', 'campursari', 'om adella', 'denny caknan'],
acoustic: ['acoustic', 'akustik', 'unplugged'],
live: ['live', 'concert', 'konser', 'stage'],
cover: ['cover'],
phonk: ['phonk', 'montagem', 'brazilian'],
};

type TrackCandidate = (ReturnType<typeof normalizeSong> | ReturnType<typeof normalizeVideo>) & {
kind: 'TRACK';
sourceIndex?: number;
};

function extractTokens(text: string): string[] {
return text
.toLowerCase()
.replace(/[^\p{L}\p{N}\s]/gu, ' ')
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
const text = `${track.title || ''} ${track.artist || ''}`.toLowerCase();
return meaningful.some((t) => text.includes(t));
}

function getRequestedModifierKeys(query: string): string[] {
const qLower = query.toLowerCase();
const qTokens = extractTokens(query);
const keys: string[] = [];
for (const key of Object.keys(MODIFIER_GROUPS)) {
if (
qTokens.includes(key) ||
(key === 'sped' && /\bsped\s*up\b/.test(qLower)) ||
(key === 'remix' && qTokens.includes('rmx')) ||
(key === 'dj' && (qTokens.includes('jj') || qTokens.includes('jedag') || qTokens.includes('slowbass')))
) {
keys.push(key);
}
}
return keys;
}

function matchesRequestedModifiers(
track: { title?: string; artist?: string },
requestedGroups: string[][]
): boolean {
if (requestedGroups.length === 0) return true;
const text = `${track.title || ''} ${track.artist || ''}`.toLowerCase();
return requestedGroups.every((group) =>
group.some((syn) => {
if (syn.length <= 2) {
return new RegExp(`\\b${syn}\\b`).test(text);
}
return text.includes(syn);
})
);
}

function qualityPenalty(
track: { title?: string; duration?: number },
query: string
): number {
let penalty = 0;
const dur = track.duration || 0;
if (dur > 0 && dur < 45) {
penalty -= 150;
}
if (dur > 900 && !/\b(nonstop|full album|1 hour|mixtape)\b/i.test(query)) {
penalty -= 90;
}
const title = track.title || '';
if (
/#shorts|\b(tutorial|reaction|chord|karaoke)\b/i.test(title) &&
!/\b(shorts|tutorial|reaction|chord|karaoke)\b/i.test(query)
) {
penalty -= 140;
}
return penalty;
}

function scoreTrackRelevance(
track: TrackCandidate,
query: string,
tasteTokens: string[] = []
): number {
const qLower = query.toLowerCase().trim();
const title = (track.title || '').toLowerCase();
const artist = (track.artist || '').toLowerCase();
const combined = `${title} ${artist}`;

const rankScore =
typeof track.sourceIndex === 'number'
? Math.max(0, 48 - track.sourceIndex * 2.5)
: 0;

let score = rankScore;

if (title === qLower) score += 80;
else if (title.startsWith(qLower)) score += 50;
else if (title.includes(qLower)) score += 35;

if (artist.includes(qLower)) score += 28;

const meaningful = getMeaningfulTokens(query);
let matchedTokens = 0;
for (const tok of meaningful) {
if (title.includes(tok)) {
score += 20;
matchedTokens++;
} else if (artist.includes(tok)) {
score += 14;
matchedTokens++;
}
}
if (meaningful.length > 0 && matchedTokens === meaningful.length) {
score += 24;
}

const requestedKeys = getRequestedModifierKeys(query);
const requestedGroups = requestedKeys.map((k) => MODIFIER_GROUPS[k]);
if (requestedGroups.length > 0) {
if (matchesRequestedModifiers(track, requestedGroups)) {
score += 65;
} else {
score -= 130;
}
} else if (track.type === 'SONG') {
score += 8;
}

if (
tasteTokens.length > 0 &&
hasMeaningfulTokenMatch(track, query) &&
tasteTokens.some((t) => combined.includes(t))
) {
score += 18;
}

score += qualityPenalty(track, query);
return score;
}

function dedupTracks(tracks: TrackCandidate[]): TrackCandidate[] {
const map = new Map<string, TrackCandidate>();
for (const track of tracks) {
if (!track.videoId) continue;
const existing = map.get(track.videoId);
if (!existing) {
map.set(track.videoId, track);
} else if (
typeof track.sourceIndex === 'number' &&
(typeof existing.sourceIndex !== 'number' || track.sourceIndex < existing.sourceIndex)
) {
map.set(track.videoId, { ...existing, sourceIndex: track.sourceIndex });
}
}
return Array.from(map.values());
}

export async function GET(req: NextRequest) {
try {
const { searchParams } = new URL(req.url);
const query = (searchParams.get('q') || '').trim();
const type = (searchParams.get('type') || 'all').toLowerCase();
const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
const taste = (searchParams.get('taste') || '').trim().toLowerCase();
const tasteTokens = taste
.split(',')
.map((s) => s.trim())
.filter(Boolean);

if (!query) {
return NextResponse.json({ results: [], hasMore: false });
}

const yt = await getYTMusic();
const requestedKeys = getRequestedModifierKeys(query);
const requestedGroups = requestedKeys.map((k) => MODIFIER_GROUPS[k]);
const hasDjModifier = requestedKeys.includes('dj');

if (type === 'all' || type === 'songs') {
if (page === 1) {
const [allItems, songs, videos, djVideos] = await Promise.all([
yt.search(query),
yt.searchSongs(query),
yt.searchVideos(query),
hasDjModifier ? yt.searchVideos(`${query} remix full bass`) : Promise.resolve([]),
]);

const normalizedAll = allItems
.map(normalizeSearchItem)
.filter((item): item is NonNullable<typeof item> => item !== null);
const nonTracks = normalizedAll.filter((item) => item.kind !== 'TRACK');
const allTracks: TrackCandidate[] = normalizedAll
.filter((item) => item.kind === 'TRACK')
.map((item, idx) => ({ ...(item as unknown as TrackCandidate), sourceIndex: idx }));

const songTracks: TrackCandidate[] = songs.map((s, idx) => ({
...normalizeSong(s),
kind: 'TRACK' as const,
sourceIndex: idx,
}));
const videoTracks: TrackCandidate[] = videos.map((v, idx) => ({
...normalizeVideo(v),
kind: 'TRACK' as const,
sourceIndex: idx,
}));
const djVideoTracks: TrackCandidate[] = djVideos.map((v, idx) => ({
...normalizeVideo(v),
kind: 'TRACK' as const,
sourceIndex: idx,
}));

const combined =
requestedGroups.length > 0
? [...videoTracks, ...djVideoTracks, ...allTracks, ...songTracks]
: [...songTracks, ...allTracks, ...videoTracks, ...djVideoTracks];

const deduped = dedupTracks(combined);
const meaningful = deduped.filter((t) => hasMeaningfulTokenMatch(t, query));
const baseTracks = meaningful.length > 0 ? meaningful : deduped;

let finalTracks = baseTracks;
if (requestedGroups.length > 0) {
const strictMatched = baseTracks.filter((t) =>
matchesRequestedModifiers(t, requestedGroups)
);
if (strictMatched.length >= 3) {
finalTracks = strictMatched;
}
}

finalTracks.sort(
(a, b) =>
scoreTrackRelevance(b, query, tasteTokens) -
scoreTrackRelevance(a, query, tasteTokens)
);

if (type === 'songs') {
return NextResponse.json({
results: finalTracks.slice(0, 20),
hasMore: finalTracks.length > 0,
});
}

return NextResponse.json({
results: [...finalTracks.slice(0, 20), ...nonTracks],
hasMore: finalTracks.length > 0,
});
}

const suffixes = ['', ' official', ' audio', ' remix', ' cover', ' live'];
const suffix = suffixes[(page - 1) % suffixes.length];
const variedQuery = `${query}${suffix}`.trim();
const [songs, videos] = await Promise.all([
yt.searchSongs(variedQuery),
yt.searchVideos(variedQuery),
]);

const songTracks: TrackCandidate[] = songs.map((s, idx) => ({
...normalizeSong(s),
kind: 'TRACK' as const,
sourceIndex: idx,
}));
const videoTracks: TrackCandidate[] = videos.map((v, idx) => ({
...normalizeVideo(v),
kind: 'TRACK' as const,
sourceIndex: idx,
}));

const deduped = dedupTracks([...songTracks, ...videoTracks]);
const meaningful = deduped.filter((t) => hasMeaningfulTokenMatch(t, query));
const baseTracks = meaningful.length > 0 ? meaningful : deduped;

let finalTracks = baseTracks;
if (requestedGroups.length > 0) {
const strictMatched = baseTracks.filter((t) =>
matchesRequestedModifiers(t, requestedGroups)
);
if (strictMatched.length >= 3) {
finalTracks = strictMatched;
}
}

finalTracks.sort(
(a, b) =>
scoreTrackRelevance(b, query, tasteTokens) -
scoreTrackRelevance(a, query, tasteTokens)
);

return NextResponse.json({
results: finalTracks.slice(0, 20),
hasMore: page < 5 && finalTracks.length > 0,
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
