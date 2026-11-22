'use client';

import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, KeyRound, LogIn, LogOut, Save, Trash2 } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { UserAvatar } from './UserAvatar';
import { VerifiedBadge, isVerifiedDeveloper } from './VerifiedBadge';

export function AccountSettingsCard() {
  const {
    user,
    profile,
    isGuest,
    syncStatus,
    updateProfile,
    updatePassword,
    openAuthScreen,
    signOut,
  } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');

  useEffect(() => {
    setDisplayName(profile?.display_name || '');
    setAvatarUrl(profile?.avatar_url || '');
  }, [profile?.display_name, profile?.avatar_url]);

  if (!user) {
    return (
      <section className="space-y-2.5">
        <h2 className="px-1 text-[12px] font-bold uppercase tracking-wider text-[var(--m3-primary)]">
          Akun & Sinkronisasi Cloud
        </h2>
        <div className="rounded-[24px] metro-surface p-4 space-y-3.5">
          <div className="flex items-center gap-3.5">
            <UserAvatar src="" name="Tamu" size={52} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-white">
                {isGuest ? 'Mode Tamu' : 'Belum Masuk'}
              </p>
              <p className="text-[12px] text-[#A7A7A7] mt-0.5 flex items-center gap-1.5">
                <CloudOff className="w-3.5 h-3.5 shrink-0" />
                <span>Penyimpanan sementara — dapat terhapus oleh cache</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAuthScreen}
            className="w-full rounded-full bg-[#C0C0C0] text-black font-bold text-sm py-2.5 hover:bg-[#D4D4D8] transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Masuk / Daftar Akun NueTify</span>
          </button>
        </div>
      </section>
    );
  }

  const googlePhoto =
    user.app_metadata?.provider === 'google'
      ? String(user.user_metadata?.avatar_url || user.user_metadata?.picture || '')
      : '';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    setSavingProfile(true);
    const res = await updateProfile({
      display_name: displayName,
      avatar_url: avatarUrl,
    });
    setSavingProfile(false);
    setProfileMsg(res.message || (res.ok ? 'Profil disimpan.' : 'Gagal menyimpan profil.'));
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');
    if (newPassword.length < 6) {
      setPasswordMsg('Password baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg('Konfirmasi password tidak cocok.');
      return;
    }
    setSavingPassword(true);
    const res = await updatePassword(newPassword);
    setSavingPassword(false);
    setPasswordMsg(res.message || (res.ok ? 'Password diperbarui.' : 'Gagal memperbarui password.'));
    if (res.ok) {
      setNewPassword('');
      setConfirmPassword('');
    }
  };
  const isGoogleUser = user.app_metadata?.provider === 'google';
  
  return (
    <section className="space-y-3">
      <h2 className="px-1 text-[12px] font-bold uppercase tracking-wider text-[var(--m3-primary)]">
        Akun & Profil NueTify
      </h2>

      <div className="rounded-[24px] metro-surface p-4 space-y-4">
        <div className="flex items-center gap-3.5">
          <UserAvatar src={avatarUrl || profile?.avatar_url} name={displayName || profile?.display_name} size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-white truncate">
              {profile?.display_name || 'Pengguna NueTify'}
              {isVerifiedDeveloper({ userId: user.id, email: user.email }) && (
                <VerifiedBadge size={16} />
              )}
            </p>
            {isVerifiedDeveloper({ userId: user.id, email: user.email }) && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E11D48]/15 text-[#FB7185] border border-[#E11D48]/30">
                <VerifiedBadge size={12} />
                Verified Developer
              </span>
            )}
            <p className="text-[12px] text-[#A7A7A7] truncate">{profile?.email}</p>
            <p className="text-[11px] text-[#C0C0C0] mt-1 flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 shrink-0" />
              <span>
                {syncStatus === 'syncing'
                  ? 'Menyinkronkan ke cloud...'
                  : 'Tersinkronisasi Real-Time (Supabase & Cloud)'}
              </span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3 pt-2 border-t border-[#C0C0C0]/10">
          <div>
            <label className="block text-xs font-medium text-[#C0C0C0] mb-1">
              Nama Tampilan
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nama tampilan Anda"
              className="w-full rounded-xl bg-[#242424] border border-[#C0C0C0]/20 px-3 py-2 text-sm text-white placeholder-[#7A7A7A] focus:outline-none focus:border-[#C0C0C0]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#C0C0C0] mb-1">
              URL Foto Profil Custom (kosongkan untuk SVG default)
            </label>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="/icon"
              className="w-full rounded-xl bg-[#242424] border border-[#C0C0C0]/20 px-3 py-2 text-sm text-white placeholder-[#7A7A7A] focus:outline-none focus:border-[#C0C0C0]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-full bg-[#C0C0C0] text-black font-bold text-xs px-4 py-2 hover:bg-[#D4D4D8] disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingProfile ? 'Menyimpan...' : 'Simpan Profil'}</span>
            </button>
            {googlePhoto && (
              <button
                type="button"
                onClick={() => setAvatarUrl(googlePhoto)}
                className="rounded-full bg-[#242424] text-[#E5E5E5] font-medium text-xs px-3.5 py-2 hover:bg-[#2E2E2E] transition-colors"
              >
                Pakai Foto Google
              </button>
            )}
            <button
              type="button"
              onClick={() => setAvatarUrl('')}
              className="rounded-full bg-[#242424] text-[#A7A7A7] font-medium text-xs px-3.5 py-2 hover:text-white transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Default SVG</span>
            </button>
          </div>
          {profileMsg && <p className="text-xs text-[#C0C0C0]">{profileMsg}</p>}
        </form>

        {isGoogleUser ? (
          <div className="pt-3 border-t border-[#C0C0C0]/10">
            <p className="text-xs text-[#A7A7A7]">
              Akun Anda masuk menggunakan Google. Pengelolaan password dilakukan melalui Akun Google Anda.
            </p>
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-2.5 pt-3 border-t border-[#C0C0C0]/10">
          <p className="text-xs font-semibold text-white flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-[#C0C0C0]" />
            <span>Perbarui Password</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="password"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Password baru (min. 6)"
              className="w-full rounded-xl bg-[#242424] border border-[#C0C0C0]/20 px-3 py-2 text-sm text-white placeholder-[#7A7A7A] focus:outline-none focus:border-[#C0C0C0]"
            />
            <input
              type="password"
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Konfirmasi password baru"
              className="w-full rounded-xl bg-[#242424] border border-[#C0C0C0]/20 px-3 py-2 text-sm text-white placeholder-[#7A7A7A] focus:outline-none focus:border-[#C0C0C0]"
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword || !newPassword}
            className="rounded-full bg-[#242424] border border-[#C0C0C0]/25 text-white font-semibold text-xs px-4 py-2 hover:bg-[#2E2E2E] disabled:opacity-50 transition-colors"
          >
            {savingPassword ? 'Memperbarui...' : 'Perbarui Password'}
          </button>
          {passwordMsg && <p className="text-xs text-[#C0C0C0]">{passwordMsg}</p>}
        </form>
        )}

        <div className="pt-3 border-t border-[#C0C0C0]/10">
          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full rounded-full bg-[#242424] text-red-400 font-semibold text-xs py-2.5 hover:bg-red-950/40 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar dari Akun</span>
          </button>
        </div>
      </div>
    </section>
  );
}
