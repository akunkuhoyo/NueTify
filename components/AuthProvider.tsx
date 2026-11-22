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

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'guest' | 'error';

interface AuthActionResult {
  ok: boolean;
  message?: string;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
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

function buildFallbackProfile(user: User): UserProfile {
  const meta = user.user_metadata || {};
  const provider = String(user.app_metadata?.provider || 'email');
  const displayName = String(
    meta.display_name || meta.full_name || meta.name || user.email?.split('@')[0] || 'Pengguna NueTify'
  );
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
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [cloudMusicData, setCloudMusicData] = useState<CloudMusicSnapshot | null>(null);
  const [cloudRevision, setCloudRevision] = useState(0);

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushedJsonRef = useRef<string>('');

  const loadUserCloudState = useCallback(async (authUser: User) => {
    const supabase = getSupabaseClient();
    const fallback = buildFallbackProfile(authUser);
    if (!supabase) {
      setProfile(fallback);
      return;
    }

    setSyncStatus('syncing');
    try {
      const { data: profRow } = await supabase
        .from('user_profiles')
        .select('id, display_name, avatar_url')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profRow) {
        const googlePic = extractGoogleAvatar(authUser);
        const resolvedAvatar =
          typeof profRow.avatar_url === 'string' && profRow.avatar_url.length > 0
            ? profRow.avatar_url
            : googlePic;
        const resolved: UserProfile = {
          id: authUser.id,
          display_name: profRow.display_name || fallback.display_name,
          avatar_url: resolvedAvatar,
          email: authUser.email || '',
          provider: fallback.provider,
        };
        setProfile(resolved);
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
      }
      setSyncStatus('synced');
    } catch {
      setProfile(fallback);
      setSyncStatus('error');
    }
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
      )
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
      const cleanName = displayName.trim() || email.trim().split('@')[0] || 'Pengguna NueTify';
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: cleanName,
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
    const redirectTo =
      typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
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
          ? updates.display_name.trim()
          : profile?.display_name || 'Pengguna NueTify';

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
    setProfile(null);
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
      profile,
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
