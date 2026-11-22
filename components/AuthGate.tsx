'use client';

import React, { useState } from 'react';
import { Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthProvider';

type AuthMode = 'login' | 'register' | 'forgot';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const {
    user,
    isGuest,
    loading,
    isRecoveryMode,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    sendPasswordReset,
    updatePassword,
    continueAsGuest,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#121212] text-[#E5E5E5] flex flex-col items-center justify-center gap-3 px-4">
        <img
          src="/icon"
          alt="NueTify"
          className="w-14 h-14 rounded-2xl object-cover border border-[#C0C0C0]/25"
        />
        <p className="text-sm text-[#A7A7A7]">Memuat NueTify...</p>
      </div>
    );
  }

  if (isRecoveryMode) {
    const handleResetSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg('');
      setInfoMsg('');
      if (password.length < 6) {
        setErrorMsg('Password baru minimal 6 karakter.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Konfirmasi password tidak cocok.');
        return;
      }
      setSubmitting(true);
      const res = await updatePassword(password);
      setSubmitting(false);
      if (!res.ok) {
        setErrorMsg(res.message || 'Gagal memperbarui password.');
      } else {
        setInfoMsg(res.message || 'Password berhasil diperbarui.');
        setPassword('');
        setConfirmPassword('');
      }
    };

    return (
      <div className="min-h-screen w-full bg-[#121212] text-[#E5E5E5] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-[#181818] border border-[#C0C0C0]/15 p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-5">
            <img
              src="/icon"
              alt="NueTify"
              className="w-11 h-11 rounded-2xl object-cover border border-[#C0C0C0]/25"
            />
            <div>
              <h1 className="text-xl font-bold text-white">Atur Password Baru</h1>
              <p className="text-xs text-[#A7A7A7]">Akun NueTify</p>
            </div>
          </div>

          <form onSubmit={handleResetSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-[#C0C0C0] mb-1.5">
                Password Baru
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full rounded-xl bg-[#242424] border border-[#C0C0C0]/20 px-3.5 py-2.5 text-sm text-white placeholder-[#7A7A7A] focus:outline-none focus:border-[#C0C0C0]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#C0C0C0] mb-1.5">
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="w-full rounded-xl bg-[#242424] border border-[#C0C0C0]/20 px-3.5 py-2.5 text-sm text-white placeholder-[#7A7A7A] focus:outline-none focus:border-[#C0C0C0]"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 rounded-xl px-3 py-2">
                {errorMsg}
              </p>
            )}
            {infoMsg && (
              <p className="text-xs text-[#E5E5E5] bg-[#242424] border border-[#C0C0C0]/30 rounded-xl px-3 py-2">
                {infoMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#C0C0C0] text-black font-bold text-sm py-3 hover:bg-[#D4D4D8] disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (user || isGuest) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setSubmitting(true);

    if (mode === 'login') {
      const res = await signInWithEmail(email, password);
      if (!res.ok) setErrorMsg(res.message || 'Email atau password salah.');
    } else if (mode === 'register') {
      if (password.length < 6) {
        setErrorMsg('Password minimal 6 karakter.');
        setSubmitting(false);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Konfirmasi password tidak cocok.');
        setSubmitting(false);
        return;
      }
      const res = await signUpWithEmail(email, password, displayName);
      if (!res.ok) {
        setErrorMsg(res.message || 'Gagal mendaftar akun.');
      } else if (res.message) {
        setInfoMsg(res.message);
      }
    } else if (mode === 'forgot') {
      const res = await sendPasswordReset(email);
      if (!res.ok) {
        setErrorMsg(res.message || 'Gagal mengirim tautan reset password.');
      } else if (res.message) {
        setInfoMsg(res.message);
      }
    }

    setSubmitting(false);
  };

  const handleGoogle = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setSubmitting(true);
    const res = await signInWithGoogle();
    if (!res.ok) {
      setErrorMsg(res.message || 'Login Google gagal atau belum diaktifkan.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#121212] text-[#E5E5E5] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl bg-[#181818] border border-[#C0C0C0]/15 p-6 sm:p-7 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/icon"
            alt="NueTify"
            className="w-16 h-16 rounded-2xl object-cover border border-[#C0C0C0]/25 mb-3"
          />
          <h1 className="text-2xl font-bold tracking-tight text-white">NueTify</h1>
          <p className="text-xs text-[#A7A7A7] mt-1">
            Dikembangkan oleh Tim PT Nueva Group
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#121212] p-1 border border-[#C0C0C0]/10 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
              setInfoMsg('');
            }}
            className={`rounded-xl py-2 text-xs font-semibold transition-colors ${
              mode === 'login'
                ? 'bg-[#C0C0C0] text-black'
                : 'text-[#A7A7A7] hover:text-white'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
              setInfoMsg('');
            }}
            className={`rounded-xl py-2 text-xs font-semibold transition-colors ${
              mode === 'register'
                ? 'bg-[#C0C0C0] text-black'
                : 'text-[#A7A7A7] hover:text-white'
            }`}
          >
            Daftar Akun
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-[#C0C0C0] mb-1.5">
                Nama Tampilan
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nama Anda"
                  className="w-full rounded-xl bg-[#242424] border border-[#C0C0C0]/20 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-[#7A7A7A] focus:outline-none focus:border-[#C0C0C0]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#C0C0C0] mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full rounded-xl bg-[#242424] border border-[#C0C0C0]/20 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-[#7A7A7A] focus:outline-none focus:border-[#C0C0C0]"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-xs font-medium text-[#C0C0C0] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-xl bg-[#242424] border border-[#C0C0C0]/20 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-[#7A7A7A] focus:outline-none focus:border-[#C0C0C0]"
                />
              </div>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-[#C0C0C0] mb-1.5">
                Konfirmasi Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password"
                  className="w-full rounded-xl bg-[#242424] border border-[#C0C0C0]/20 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-[#7A7A7A] focus:outline-none focus:border-[#C0C0C0]"
                />
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                className="text-xs text-[#C0C0C0] hover:text-white underline underline-offset-2"
              >
                Lupa password?
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                  setInfoMsg('');
                }}
                className="text-xs text-[#C0C0C0] hover:text-white underline underline-offset-2"
              >
                Kembali ke halaman masuk
              </button>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 rounded-xl px-3 py-2">
              {errorMsg}
            </p>
          )}
          {infoMsg && (
            <p className="text-xs text-[#E5E5E5] bg-[#242424] border border-[#C0C0C0]/30 rounded-xl px-3 py-2">
              {infoMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[#C0C0C0] text-black font-bold text-sm py-3 hover:bg-[#D4D4D8] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <span>
              {submitting
                ? 'Memproses...'
                : mode === 'login'
                  ? 'Masuk ke NueTify'
                  : mode === 'register'
                    ? 'Daftar Akun NueTify'
                    : 'Kirim Tautan Reset Password'}
            </span>
            {!submitting && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#C0C0C0]/15" />
          <span className="text-[11px] uppercase tracking-wider text-[#8E8E93]">atau</span>
          <div className="h-px flex-1 bg-[#C0C0C0]/15" />
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogle}
            className="w-full rounded-full bg-[#242424] border border-[#C0C0C0]/20 text-white font-semibold text-sm py-2.5 hover:bg-[#2E2E2E] disabled:opacity-50 transition-colors flex items-center justify-center gap-2.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
              />
            </svg>
            <span>Lanjutkan dengan Google</span>
          </button>

          <button
            type="button"
            onClick={continueAsGuest}
            className="w-full rounded-full bg-[#121212] border border-[#C0C0C0]/20 text-[#C0C0C0] font-medium text-sm py-2.5 hover:bg-[#1E1E1E] hover:text-white transition-colors"
          >
            Masuk sebagai Tamu
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-[#121212] border border-[#C0C0C0]/10 p-3 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#C0C0C0] shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-[#A7A7A7]">
            Login dengan Email atau Google menyimpan playlist, lagu favorit, dan pengaturan equalizer secara <span className="text-white font-medium">real-time di cloud</span>. Mode Tamu hanya memakai penyimpanan lokal sementara yang dapat terhapus oleh cache.
          </p>
        </div>
      </div>
    </div>
  );
}
