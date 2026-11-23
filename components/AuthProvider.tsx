'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/cloud/supabaseClient';
import {
  mirrorToFirebaseFirestore,
  type CloudMusicSnapshot,
} from '@/lib/cloud/firebaseMirror';

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string;
  email: string;
  provider: string;
}
export interface UserBanInfo { reason: string; banned_until: string | null; }

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'guest' | 'error';

interface AuthActionResult {
  ok: boolean;
  message?: string;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  banInfo: UserBanInfo | null;
  isGuest: boolean;
  loading: boolean;
  isRecoveryMode: boolean;
  syncStatus: SyncStatus;
  cloudMusicData: CloudMusicSnapshot | null;
  cloudRevision: number;
  signInWithEmail: (email: string, password: string) => Promise<AuthActionResult>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<AuthActionResult>;
  signInWithGoogle: () => Promise<AuthActionResult>;
  sendPasswordReset: (email: string) => Promise<AuthActionResult>;
  updatePassword: (newPassword: string) => Promise<AuthActionResult>;
  updateProfile: (updates: {
    display_name?: string;
    avatar_url?: string;
  }) => Promise<AuthActionResult>;
  syncMusicData: (snapshot: CloudMusicSnapshot) => void;
  continueAsGuest: () => void;
  openAuthScreen: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const GUEST_STORAGE_KEY = 'nuetify_guest_mode_v1';

function extractGoogleAvatar(user: User): string {
  const provider = user.app_metadata?.provider || '';
  if (provider !== 'google') return '';
  const meta = user.user_metadata || {};
  return String(meta.avatar_url || meta.picture || '');
}

function resolveSafeDisplayName(authUser: User, storedName?: string | null): string { const meta = (authUser.user_metadata || {}) as Record<string, unknown>; const emailPrefix = (authUser.email || '').split('@')[0].trim().toLowerCase(); const metaName = String(meta.display_name || meta.full_name || meta.name || '').trim(); const candidate = (storedName || '').trim(); if (candidate && (candidate.toLowerCase() !== emailPrefix || !metaName)) { return candidate; } if (metaName) return metaName; return 'Pengguna NueTify'; }
function buildFallbackProfile(user: User): UserProfile {
  const meta = user.user_metadata || {};
  const provider = String(user.app_metadata?.provider || 'email');
 const displayName = resolveSafeDisplayName(user);
  const avatarUrl =
    typeof meta.custom_avatar_url === 'string'
      ? meta.custom_avatar_url
      : extractGoogleAvatar(user);
  return {
    id: user.id,
    display_name: displayName,
    avatar_url: avatarUrl,
    email: user.email || '',
    provider,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [banInfo, setBanInfo] = useState<UserBanInfo | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [cloudMusicData, setCloudMusicData] = useState<CloudMusicSnapshot | null>(null);
  const [cloudRevision, setCloudRevision] = useState(0);

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushedJsonRef = useRef<string>('');
const checkUserBan = useCallback(async (authUserId: string) => { const supabase = getSupabaseClient(); if (!supabase) return; try { const { data } = await supabase.from('user_bans').select('reason, banned_until, is_active').eq('user_id', authUserId).maybeSingle(); if (data && data.is_active && (!data.banned_until || new Date(data.banned_until).getTime() > Date.now())) { setBanInfo({ reason: data.reason || '', banned_until: data.banned_until ?? null }); window.dispatchEvent(new CustomEvent('nuetify-force-stop')); } else { setBanInfo(null); } } catch {} }, []);
  
  const loadUserCloudState = useCallback(async (authUser: User) => {
    const supabase = getSupabaseClient();
    const fallback = buildFallbackProfile(authUser);
    if (!supabase) {
      setProfile(fallback);
      return;
    }
void checkUserBan(authUser.id);
    
    setSyncStatus('syncing');
    try {
      const { data: profRow } = await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url')
        .eq('id', authUser.id)
        .maybeSingle();
      let resolvedDisplayName = fallback.display_name;
      let resolvedAvatarUrl = fallback.avatar_url;
      
      if (profRow) {
        const googlePic = extractGoogleAvatar(authUser);
        const resolvedAvatar =
          typeof profRow.avatar_url === 'string' && profRow.avatar_url.length > 0
            ? profRow.avatar_url
            : googlePic;
        const resolved: UserProfile = {
          id: authUser.id,
          display_name: resolveSafeDisplayName(authUser, profRow.display_name),
          avatar_url: resolvedAvatar,
          email: authUser.email || '',
          provider: fallback.provider,
        };
        setProfile(resolved);
        resolvedDisplayName = resolved.display_name;
        resolvedAvatarUrl = resolved.avatar_url;
if (profRow.display_name !== resolved.display_name || (!profRow.avatar_url && resolved.avatar_url)) { await supabase.from('user_profiles').upsert({ id: authUser.id, display_name: resolved.display_name, avatar_url: resolved.avatar_url, updated_at: new Date().toISOString() }, { onConflict: 'id' }); }
      } else {
        await supabase.from('user_profiles').upsert(
          {
            id: authUser.id,
            display_name: fallback.display_name,
            avatar_url: fallback.avatar_url,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
        setProfile(fallback);
        void mirrorToFirebaseFirestore(authUser.id, 'profile', {
          display_name: fallback.display_name,
          avatar_url: fallback.avatar_url,
          email: fallback.email,
          updated_at: new Date().toISOString(),
        });
      }

      const { data: musicRow } = await supabase
        .from('user_music_data')
        .select('data')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (musicRow && musicRow.data && typeof musicRow.data === 'object') {
        const snapshot = musicRow.data as CloudMusicSnapshot;
        lastPushedJsonRef.current = JSON.stringify(snapshot);
        setCloudMusicData(snapshot);
        setCloudRevision((r) => r + 1);
      
        if (Array.isArray(snapshot.history) && snapshot.history.length > 0) {
          let totalSeconds = 0;
          for (const ev of snapshot.history as Array<any>) {
            totalSeconds +=
              Number(
                ev?.durationListenedSec ??
                  ev?.durationSec ??
                  ev?.track?.duration ??
                  ev?.duration ??
                  180
              ) || 180;
          }
          const totalPlays = snapshot.history.length;
          try {
            await supabase.from('listening_leaderboard').upsert(
              {
                user_id: authUser.id,
                display_name: resolvedDisplayName,
                avatar_url: resolvedAvatarUrl,
                total_seconds: Math.max(0, Math.floor(totalSeconds)),
                total_plays: totalPlays,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
          } catch {
            // ignore leaderboard sync errors
          }
        }
      }
      setSyncStatus('synced');
    } catch {
      setProfile(fallback);
      setSyncStatus('error');
    }
  }, []);


  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || typeof window === 'undefined') return;

    const handleHashToken = async () => {
      const hash = window.location.hash;
      if (!hash || !hash.includes('access_token=')) return;
      const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    const onHashChange = () => {
      void handleHashToken();
    };

    void handleHashToken();
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (window.sessionStorage.getItem(GUEST_STORAGE_KEY) === '1') {
          setIsGuest(true);
          setSyncStatus('guest');
        }
      } catch {
        // ignore storage errors
      }
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const activeUser = data.session?.user ?? null;
        setUser(activeUser);
        if (activeUser) {
          setIsGuest(false);
          void loadUserCloudState(activeUser);
        }
        setLoading(false);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        setIsGuest(false);
        try {
          window.sessionStorage.removeItem(GUEST_STORAGE_KEY);
        } catch {
          // ignore
        }
        void loadUserCloudState(nextUser);
      } else {
        setProfile(null);
        setCloudMusicData(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadUserCloudState]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !user) return;

    const channel = supabase
      .channel(`nuetify-sync-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_music_data',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as { data?: CloudMusicSnapshot } | null;
          if (!row?.data) return;
          const incomingJson = JSON.stringify(row.data);
          if (incomingJson === lastPushedJsonRef.current) return;
          lastPushedJsonRef.current = incomingJson;
          setCloudMusicData(row.data);
          setCloudRevision((r) => r + 1);
          setSyncStatus('synced');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as {
            display_name?: string;
            avatar_url?: string;
          } | null;
          if (!row) return;
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  display_name: row.display_name ?? prev.display_name,
                  avatar_url: row.avatar_url ?? prev.avatar_url,
                }
              : prev
          );
        }
      ).on('postgres_changes', { event: '*', schema: 'public', table: 'user_bans', filter: `user_id=eq.${user.id}` }, (payload) => { if (payload.eventType === 'DELETE') { setBanInfo(null); return; } const row = payload.new as { reason?: string; banned_until?: string | null; is_active?: boolean } | null; if (row && row.is_active && (!row.banned_until || new Date(row.banned_until).getTime() > Date.now())) { setBanInfo({ reason: row.reason || '', banned_until: row.banned_until ?? null }); window.dispatchEvent(new CustomEvent('nuetify-force-stop')); } else { setBanInfo(null); } })
      
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return { ok: false, message: 'Konfigurasi server autentikasi belum tersedia.' };
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        return { ok: false, message: error.message };
      }
      return { ok: true };
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      displayName: string
    ): Promise<AuthActionResult> => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return { ok: false, message: 'Konfigurasi server autentikasi belum tersedia.' };
      }
  const cleanName = (displayName.trim() || 'Pengguna NueTify').slice(0, 15);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: cleanName, full_name: cleanName,
          },
        },
      });
      if (error) {
        return { ok: false, message: error.message };
      }
      if (data.user && !data.session) {
        return {
          ok: true,
          message: 'Akun dibuat! Periksa email Anda untuk konfirmasi sebelum masuk.',
        };
      }
      return { ok: true, message: 'Akun NueTify berhasil dibuat.' };
    },
    []
  );

      const signInWithGoogle = useCallback(async (): Promise<AuthActionResult> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { ok: false, message: 'Konfigurasi server autentikasi belum tersedia.' };
    }
    const isNativeAndroid =
      typeof navigator !== 'undefined' &&
      (navigator.userAgent || '').includes('NueTifyAndroid');
    const nativeBridge =
      typeof window !== 'undefined'
        ? (
            window as unknown as {
              NueTifyNative?: { openExternalAuth?: (url: string) => void };
            }
          ).NueTifyNative
        : undefined;
    if (nativeBridge && typeof nativeBridge.openExternalAuth === 'function') {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'nuetify://auth/callback',
          skipBrowserRedirect: true,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) {
        return { ok: false, message: error.message };
      }
      if (data?.url) {
        nativeBridge.openExternalAuth(data.url);
        return { ok: true };
      }
      return { ok: false, message: 'Gagal mendapatkan URL autentikasi Google.' };
    }
    const redirectTo = isNativeAndroid
      ? 'nuetify://auth/callback'
      : typeof window !== 'undefined'
        ? window.location.origin
        : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  }, []);

  const sendPasswordReset = useCallback(
    async (email: string): Promise<AuthActionResult> => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return { ok: false, message: 'Konfigurasi server autentikasi belum tersedia.' };
      }
      const redirectTo =
        typeof window !== 'undefined' ? window.location.origin : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (error) {
        return { ok: false, message: error.message };
      }
      return {
        ok: true,
        message: 'Tautan reset password telah dikirim ke email Anda.',
      };
    },
    []
  );

  const updatePassword = useCallback(
    async (newPassword: string): Promise<AuthActionResult> => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return { ok: false, message: 'Konfigurasi server autentikasi belum tersedia.' };
      }
      if (newPassword.length < 6) {
        return { ok: false, message: 'Password minimal 6 karakter.' };
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { ok: false, message: error.message };
      }
      setIsRecoveryMode(false);
      return { ok: true, message: 'Password berhasil diperbarui.' };
    },
    []
  );

  const updateProfile = useCallback(
    async (updates: {
      display_name?: string;
      avatar_url?: string;
    }): Promise<AuthActionResult> => {
      const supabase = getSupabaseClient();
      if (!supabase || !user) {
        return { ok: false, message: 'Silakan login terlebih dahulu.' };
      }
      const nextAvatar =
        typeof updates.avatar_url === 'string'
          ? updates.avatar_url.trim()
          : profile?.avatar_url ?? '';
      if (
        nextAvatar &&
        !nextAvatar.startsWith('https://') &&
        !nextAvatar.startsWith('http://') &&
        !nextAvatar.startsWith('/')
      ) {
        return {
          ok: false,
          message: 'URL foto profil harus diawali https://, http://, atau /',
        };
      }
      const nextName =
        typeof updates.display_name === 'string' && updates.display_name.trim()
          ? updates.display_name.trim().slice(0, 15)
          : (profile?.display_name || 'Pengguna NueTify').trim().slice(0, 15);

      const { error } = await supabase.from('user_profiles').upsert(
        {
          id: user.id,
          display_name: nextName,
          avatar_url: nextAvatar,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) {
        return { ok: false, message: error.message };
      }
      setProfile((prev) =>
        prev
          ? { ...prev, display_name: nextName, avatar_url: nextAvatar }
          : {
              id: user.id,
              display_name: nextName,
              avatar_url: nextAvatar,
              email: user.email || '',
              provider: String(user.app_metadata?.provider || 'email'),
            }
      );
      void mirrorToFirebaseFirestore(user.id, 'profile', {
        display_name: nextName,
        avatar_url: nextAvatar,
        email: user.email || '',
        updated_at: new Date().toISOString(),
      });
      await supabase
        .from('listening_leaderboard')
        .update({
          display_name: nextName,
          avatar_url: nextAvatar,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      return { ok: true, message: 'Profil berhasil diperbarui.' };
    },
    [profile, user]
  );

  const syncMusicData = useCallback(
    (snapshot: CloudMusicSnapshot) => {
      const supabase = getSupabaseClient();
      if (!supabase || !user) return;
      const serialized = JSON.stringify(snapshot);
      if (serialized === lastPushedJsonRef.current) return;

      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      setSyncStatus('syncing');
      syncTimerRef.current = setTimeout(async () => {
        try {
          lastPushedJsonRef.current = serialized;
          const payloadWithTs: CloudMusicSnapshot = {
            ...snapshot,
            updatedAt: new Date().toISOString(),
          };
          const { error } = await supabase.from('user_music_data').upsert(
            {
              user_id: user.id,
              data: payloadWithTs,
              updated_at: payloadWithTs.updatedAt,
            },
            { onConflict: 'user_id' }
          );
          if (error) {
            setSyncStatus('error');
            return;
          }
        const historyArr = Array.isArray(snapshot.history)
          ? (snapshot.history as Array<{
              durationListenedSec?: number;
              track?: { duration?: number };
            }>)
          : [];
        const totalPlays = historyArr.length;
        const totalSeconds = historyArr.reduce(
          (acc, ev) =>
            acc + Number(ev?.durationListenedSec ?? ev?.track?.duration ?? 180),
          0
        );
        await supabase.from('listening_leaderboard').upsert(
          {
            user_id: user.id,
            display_name: resolveSafeDisplayName(user, profile?.display_name),
            avatar_url: profile?.avatar_url || String((user.user_metadata as Record<string, unknown> | undefined)?.avatar_url || (user.user_metadata as Record<string, unknown> | undefined)?.picture || ''),
            total_seconds: Math.max(0, Math.floor(totalSeconds)),
            total_plays: totalPlays,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
          void mirrorToFirebaseFirestore(user.id, 'music_data', payloadWithTs);
          setSyncStatus('synced');
        } catch {
          setSyncStatus('error');
        }
      }, 700);
    },
    [user]
  );

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
    setSyncStatus('guest');
    try {
      window.sessionStorage.setItem(GUEST_STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  }, []);

  const openAuthScreen = useCallback(() => {
    setIsGuest(false);
    try {
      window.sessionStorage.removeItem(GUEST_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null); setBanInfo(null);
    setIsGuest(false);
    setCloudMusicData(null);
    setSyncStatus('idle');
    try {
      window.sessionStorage.removeItem(GUEST_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile, banInfo,
      isGuest,
      loading,
      isRecoveryMode,
      syncStatus,
      cloudMusicData,
      cloudRevision,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      sendPasswordReset,
      updatePassword,
      updateProfile,
      syncMusicData,
      continueAsGuest,
      openAuthScreen,
      signOut,
    }),
    [
      user,
      profile,
      isGuest, banInfo,
      loading,
      isRecoveryMode,
      syncStatus,
      cloudMusicData,
      cloudRevision,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      sendPasswordReset,
      updatePassword,
      updateProfile,
      syncMusicData,
      continueAsGuest,
      openAuthScreen,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
