export interface CloudMusicSnapshot {
  settings?: unknown;
  playlists?: unknown;
  likedTracks?: unknown;
  history?: unknown;
  searchHistory?: unknown;
  savedCollection?: unknown;
  updatedAt?: string;
}

export interface CloudProfileSnapshot {
  display_name?: string;
  avatar_url?: string;
  email?: string;
  updated_at?: string;
}

function getFirebaseConfig() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) return null;
  return { projectId, apiKey };
}

export function isFirebaseMirrorConfigured(): boolean {
  return Boolean(getFirebaseConfig());
}

export async function mirrorToFirebaseFirestore(
  userId: string,
  collectionDoc: 'profile' | 'music_data',
  payload: CloudProfileSnapshot | CloudMusicSnapshot
): Promise<void> {
  const cfg = getFirebaseConfig();
  if (!cfg || !userId) return;
  try {
    const base = ['https:', '', 'firestore.googleapis.com', 'v1', 'projects', cfg.projectId, 'databases', '(default)', 'documents', 'nuetify_users', encodeURIComponent(userId), 'sync', collectionDoc].join('/');
    await fetch(`${base}?key=${encodeURIComponent(cfg.apiKey)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          jsonPayload: { stringValue: JSON.stringify(payload) },
          updatedAt: { stringValue: new Date().toISOString() },
        },
      }),
    });
  } catch {
    // Non-blocking secondary mirror
  }
}
