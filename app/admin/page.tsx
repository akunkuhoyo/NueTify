'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Gavel,
  RotateCcw,
  Wrench,
  ScrollText,
  Users,
  LogOut,
  ArrowLeft,
  X,
  RefreshCw,
BarChart3,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/cloud/supabaseClient';
import { LoadingSquares } from '@/components/LoadingSquares';

interface AdminUserRow {
  id: string;
  email: string;
  display_name: string;
  provider: string;
  created_at: string;
  is_banned: boolean;
  ban_reason: string;
  banned_until: string | null;
  total_seconds?: number;
  total_plays?: number;
  has_stat_override?: boolean;
}

interface AuditLogRow {
  id: string;
  admin_email: string;
  action: string;
  target_email: string;
  details: Record<string, unknown>;
  created_at: string;
}

export default function AdminDashboardPage() {
  const [checking, setChecking] = useState(true);
  const [accessToken, setAccessToken] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [tab, setTab] = useState<'users' | 'maintenance' | 'logs'>('users');
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [statusMsg, setStatusMsg] = useState('');
const [broadcastingUpdate, setBroadcastingUpdate] = useState(false);
const [broadcastNotice, setBroadcastNotice] = useState<string | null>(null);

  const [banTarget, setBanTarget] = useState<AdminUserRow | null>(null);
  const [banDuration, setBanDuration] = useState('24h');
  const [banReason, setBanReason] = useState('');
  const [statsTarget, setStatsTarget] = useState<AdminUserRow | null>(null);
  const [editHours, setEditHours] = useState('0');
  const [editMinutes, setEditMinutes] = useState('0');
  const [editPlays, setEditPlays] = useState('0');
  const [editStatsReason, setEditStatsReason] = useState('');
  const [savingStats, setSavingStats] = useState(false);

  const loadDashboard = useCallback(async (token: string) => {
    const res = await fetch('/api/admin', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setAuthError(err.error || 'Akses ditolak — khusus Administrator NueTify.');
      setAccessToken('');
      return false;
    }
    const data = (await res.json()) as {
      maintenance?: { enabled: boolean; message: string };
      users?: AdminUserRow[];
      auditLogs?: AuditLogRow[];
    };
    setMaintenanceEnabled(Boolean(data.maintenance?.enabled));
    setMaintenanceMsg(data.maintenance?.message || '');
    setUsers(Array.isArray(data.users) ? data.users : []);
    setLogs(Array.isArray(data.auditLogs) ? data.auditLogs : []);
    setAuthError('');
    return true;
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setChecking(false);
      return;
    }
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        const token = data.session?.access_token || '';
        const em = data.session?.user?.email || '';
        if (token) {
          const ok = await loadDashboard(token);
          if (ok) {
            setAccessToken(token);
            setAdminEmail(em);
          }
        }
        setChecking(false);
      })
      .catch(() => setChecking(false)); const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => { const token = session?.access_token || ''; const em = session?.user?.email || ''; if (token) { const ok = await loadDashboard(token); if (ok) { setAccessToken(token); setAdminEmail(em); } setChecking(false); } }); return () => { subscription.unsubscribe(); };
  }, [loadDashboard]);
  const handleGoogleLogin = async () => { setAuthError(''); setSubmitting(true); const supabase = getSupabaseClient(); if (!supabase) { setAuthError('Konfigurasi Supabase belum tersedia.'); setSubmitting(false); return; } const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/admin`, queryParams: { prompt: 'select_account' } } }); if (error) { setAuthError(error.message || 'Gagal login dengan Google.'); setSubmitting(false); } };
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setSubmitting(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setAuthError('Konfigurasi Supabase belum tersedia.');
      setSubmitting(false);
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.session?.access_token) {
      setAuthError(error?.message || 'Email atau password salah.');
      setSubmitting(false);
      return;
    }
    const ok = await loadDashboard(data.session.access_token);
    if (ok) {
      setAccessToken(data.session.access_token);
      setAdminEmail(data.user?.email || email.trim());
    } else {
      await supabase.auth.signOut();
    }
    setSubmitting(false);
  };
  const handleToggleMaintenance = async (nextEnabled: boolean) => {
    if (!accessToken) return;
    setStatusMsg('');
    setSubmitting(true);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: 'toggle_maintenance',
        enabled: nextEnabled,
        message: maintenanceMsg,
      }),
    });
    if (res.ok) {
      setMaintenanceEnabled(nextEnabled);
      setStatusMsg(
        nextEnabled
          ? 'Maintenance Mode AKTIF untuk seluruh web & aplikasi.'
          : 'Maintenance Mode NONAKTIF — aplikasi kembali online & update broadcast aktif.'
      );
      await loadDashboard(accessToken);
    }
    setSubmitting(false);
  };
const handleBroadcastAppUpdate = async () => {
if (!accessToken || broadcastingUpdate) return;
setBroadcastingUpdate(true);
setBroadcastNotice(null);
try {
const res = await fetch('/api/admin', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
Authorization: `Bearer ${accessToken}`,
},
body: JSON.stringify({
action: 'broadcast_app_update',
}),
});
const json = (await res.json()) as { ok?: boolean; error?: string };
if (!res.ok || !json.ok) {
setBroadcastNotice(json.error ?? 'Gagal mengirim ulang pop-up update.');
} else {
setBroadcastNotice('Pop-up update berhasil dikirim ulang ke semua pengguna Android.');
await loadDashboard(accessToken);
}
} catch {
setBroadcastNotice('Terjadi kesalahan jaringan saat mengirim broadcast update.');
} finally {
setBroadcastingUpdate(false);
}
};

  const handleConfirmBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !banTarget) return;
    setSubmitting(true);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: 'ban_user',
        targetUserId: banTarget.id,
        targetEmail: banTarget.email,
        targetDisplayName: banTarget.display_name,
        duration: banDuration,
        reason: banReason || 'Melanggar ketentuan NueTify',
      }),
    });
    if (res.ok) {
      setStatusMsg(`User ${banTarget.display_name} berhasil di-ban.`);
      setBanTarget(null);
      setBanReason('');
      await loadDashboard(accessToken);
    }
    setSubmitting(false);
  };

  const handleUnban = async (u: AdminUserRow) => {
    if (!accessToken) return;
    setSubmitting(true);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: 'unban_user',
        targetUserId: u.id,
        targetEmail: u.email,
      }),
    });
    if (res.ok) {
      setStatusMsg(`Ban untuk ${u.display_name} berhasil dicabut.`);
      await loadDashboard(accessToken);
    }
    setSubmitting(false);
  };

  const openStatsModal = (u: AdminUserRow) => {
    setEditHours(String(Math.floor((u.total_seconds || 0) / 3600)));
    setEditMinutes(String(Math.floor(((u.total_seconds || 0) % 3600) / 60)));
    setEditPlays(String(u.total_plays || 0));
    setEditStatsReason('');
    setStatsTarget(u);
  };

  const handleSaveStats = async () => {
    if (!accessToken || !statsTarget) return;
    setSavingStats(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'update_leaderboard_stats',
          targetUserId: statsTarget.id,
          totalHours: Number(editHours || 0),
          totalMinutes: Number(editMinutes || 0),
          totalPlays: Number(editPlays || 0),
          reason: editStatsReason.trim(),
        }),
      });
      if (res.ok) {
        setStatusMsg(`Statistik leaderboard ${statsTarget.display_name} berhasil diperbarui.`);
        await loadDashboard(accessToken);
        setStatsTarget(null);
      }
    } finally {
      setSavingStats(false);
    }
  };

  const handleResetStatsOverride = async (userId: string) => {
    if (!accessToken) return;
    setSavingStats(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'reset_leaderboard_override',
          targetUserId: userId,
        }),
      });
      if (res.ok) {
        setStatusMsg('Override statistik leaderboard berhasil direset.');
        await loadDashboard(accessToken);
        setStatsTarget(null);
      }
    } finally {
      setSavingStats(false);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    setAccessToken('');
    setAdminEmail('');
  };

  if (checking) return <LoadingSquares />;

  if (!accessToken) {
    return (
      <main className="min-h-screen w-full bg-[#121212] text-[#E5E5E5] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl bg-[#181818] border border-[#C0C0C0]/20 p-6 sm:p-7 space-y-5 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-[#242424] border border-[#E11D48]/40 flex items-center justify-center text-[#E11D48]">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg font-extrabold text-white">NueTify Administrator</h1>
              <p className="text-xs text-[#A7A7A7]">Akses terbatas khusus Developer</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-[#C0C0C0] mb-1">Email Admin</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@email.com"
                className="w-full rounded-xl bg-[#242424] border border-[#C0C0C0]/20 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C0C0C0]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#C0C0C0] mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-[#242424] border border-[#C0C0C0]/20 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#C0C0C0]"
              />
            </div>
            {authError && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 rounded-xl px-3 py-2">
                {authError}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#C0C0C0] text-black font-bold text-sm py-3 hover:bg-[#D4D4D8] disabled:opacity-50"
            >
              {submitting ? 'Memverifikasi...' : 'Masuk Dashboard Admin'}
            </button> <button type="button" onClick={handleGoogleLogin} disabled={submitting} className="w-full rounded-full border border-[#C0C0C0]/30 bg-[#242424] text-white font-semibold text-sm py-3 hover:bg-[#2E2E2E] disabled:opacity-50">Masuk dengan Google (Developer)</button>
          </form>

          <Link
            href="/"
            className="block text-center text-xs text-[#A7A7A7] hover:text-white"
          >
            ← Kembali ke NueTify
          </Link>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-screen w-full bg-[#121212] text-[#E5E5E5] px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 bg-[#181818] border border-[#C0C0C0]/15 rounded-3xl p-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-full bg-[#242424] border border-[#C0C0C0]/20 flex items-center justify-center text-[#E5E5E5]"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-extrabold text-white">NueTify Admin Console</h1>
              <p className="text-xs text-[#A7A7A7]">{adminEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadDashboard(accessToken)}
              className="px-3 py-2 rounded-full bg-[#242424] text-xs font-semibold text-[#E5E5E5] flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="px-3 py-2 rounded-full bg-[#242424] text-xs font-semibold text-red-400 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {statusMsg && (
          <div className="rounded-2xl bg-[#181818] border border-[#C0C0C0]/30 px-4 py-3 text-xs text-[#E5E5E5]">
            {statusMsg}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#181818] p-1.5 border border-[#C0C0C0]/15">
          <button
            type="button"
            onClick={() => setTab('users')}
            className={`rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 ${
              tab === 'users' ? 'bg-[#C0C0C0] text-black' : 'text-[#A7A7A7]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users ({users.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('maintenance')}
            className={`rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 ${
              tab === 'maintenance' ? 'bg-[#C0C0C0] text-black' : 'text-[#A7A7A7]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Maintenance</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('logs')}
            className={`rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 ${
              tab === 'logs' ? 'bg-[#C0C0C0] text-black' : 'text-[#A7A7A7]'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>Audit Logs</span>
          </button>
        </div>

        {tab === 'maintenance' && (
          <section className="rounded-3xl bg-[#181818] border border-[#C0C0C0]/15 p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Mode Pemeliharaan (Real-Time)</h2>
                <p className="text-xs text-[#A7A7A7] mt-0.5">
                  Status saat ini:{' '}
                  <span className={maintenanceEnabled ? 'text-[#E11D48] font-bold' : 'text-[#C0C0C0] font-bold'}>
                    {maintenanceEnabled ? 'MAINTENANCE AKTIF' : 'ONLINE'}
                  </span>
                </p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleToggleMaintenance(!maintenanceEnabled)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold ${
                  maintenanceEnabled
                    ? 'bg-[#C0C0C0] text-black'
                    : 'bg-[#E11D48] text-white'
                }`}
              >
                {maintenanceEnabled ? 'Matikan Maintenance (Go Live)' : 'Aktifkan Maintenance'}
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#C0C0C0] mb-1.5">
                Pesan Pemeliharaan untuk Pengguna
              </label>
              <textarea
                rows={3}
                value={maintenanceMsg}
                onChange={(e) => setMaintenanceMsg(e.target.value)}
                className="w-full rounded-xl bg-[#242424] border border-[#C0C0C0]/20 p-3 text-sm text-white focus:outline-none focus:border-[#C0C0C0]"
              />
<div className="pt-4 border-t border-[#C0C0C0]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
  <div>
  <h3 className="text-sm font-bold text-white">Update Aplikasi Android (Real-Time)</h3>
  <p className="text-xs text-[#A7A7A7] mt-0.5">
  Kirim ulang pop-up update ke seluruh pengguna aplikasi Android secara real-time.
  </p>
  {broadcastNotice && (
  <p className="text-xs text-[#C0C0C0] mt-1.5">{broadcastNotice}</p>
  )}
  </div>
  <button
  type="button"
  disabled={broadcastingUpdate}
  onClick={() => void handleBroadcastAppUpdate()}
  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold bg-[#C0C0C0] text-black hover:bg-white disabled:opacity-50 shrink-0"
  >
  <RefreshCw className={`w-3.5 h-3.5 ${broadcastingUpdate ? 'animate-spin' : ''}`} />
  <span>{broadcastingUpdate ? 'Mengirim...' : 'Kirim Ulang Pop-Up Update ke Semua User'}</span>
  </button>
  </div>
            </div>
          </section>
        )}

        {tab === 'users' && (
          <section className="rounded-3xl bg-[#181818] border border-[#C0C0C0]/15 divide-y divide-[#C0C0C0]/10 overflow-hidden">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{u.display_name}</p>
                    {u.is_banned && (
                      <span className="px-2 py-0.5 rounded-full bg-red-950/60 border border-red-500/40 text-[10px] font-bold text-red-400 shrink-0">
                        BANNED
                      </span>
                    )}
               
                    {u.has_stat_override && (
                      <span className="px-2 py-0.5 rounded-full bg-[#C0C0C0]/15 border border-[#C0C0C0]/40 text-[10px] font-bold text-[#C0C0C0] shrink-0">
                        Override
                      </span>
                    )}   </div>
                  <p className="text-xs text-[#A7A7A7] truncate">
                    {u.email || u.id} · {u.provider}
                  </p>
                  <p className="text-[11px] text-[#C0C0C0]/80 mt-0.5 truncate">
                    {Math.floor((u.total_seconds || 0) / 3600)} jam {Math.floor(((u.total_seconds || 0) % 3600) / 60)} mnt · {u.total_plays || 0} putar
                  </p>
                  {u.is_banned && (
                    <p className="text-[11px] text-red-300 mt-0.5 truncate">
                      Alasan: {u.ban_reason} {u.banned_until ? `(s.d. ${new Date(u.banned_until).toLocaleString('id-ID')})` : '(Permanen)'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openStatsModal(u)}
                    className="px-3 py-2 rounded-full bg-[#242424] border border-[#C0C0C0]/25 text-xs font-semibold text-white hover:bg-[#2E2E2E] flex items-center gap-1.5"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-[#C0C0C0]" />
                    Statistik
                  </button>
                  {u.is_banned ? (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void handleUnban(u)}
                      className="px-3 py-2 rounded-full bg-[#242424] border border-[#C0C0C0]/25 text-xs font-semibold text-white hover:bg-[#2E2E2E] flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#C0C0C0]" />
                      <span>Unban</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      title="Ban User"
                      aria-label={`Ban ${u.display_name}`}
                      onClick={() => {
                        setBanTarget(u);
                        setBanDuration('24h');
                        setBanReason('');
                      }}
                      className="w-9 h-9 rounded-full bg-[#242424] border border-[#E11D48]/40 text-[#E11D48] hover:bg-[#E11D48] hover:text-white transition-colors flex items-center justify-center"
                    >
                      <Gavel className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === 'logs' && (
          <section className="rounded-3xl bg-[#181818] border border-[#C0C0C0]/15 divide-y divide-[#C0C0C0]/10 overflow-hidden">
            {logs.length === 0 ? (
              <p className="p-6 text-center text-xs text-[#8E8E93]">Belum ada log audit.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="px-4 py-3 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#C0C0C0]">{log.action}</span>
                    <span className="text-[11px] text-[#8E8E93]">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-xs text-[#E5E5E5]">
                    Admin: {log.admin_email}
                    {log.target_email ? ` → Target: ${log.target_email}` : ''}
                  </p>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="text-[11px] text-[#A7A7A7] truncate">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
              ))
            )}
          </section>
        )}
      </div>

      {statsTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl bg-[#181818] border border-[#C0C0C0]/20 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#C0C0C0]" />
                <span>Ubah Statistik Leaderboard</span>
              </h3>
              <button
                type="button"
                onClick={() => setStatsTarget(null)}
                className="text-xs text-[#A7A7A7] hover:text-white"
              >
                Tutup
              </button>
            </div>
            <p className="text-xs text-[#A7A7A7] truncate">
              Pengguna: <span className="text-white font-semibold">{statsTarget.display_name}</span>
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[#A7A7A7] mb-1">Jam</label>
                <input
                  type="number"
                  min={0}
                  value={editHours}
                  onChange={(e) => setEditHours(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#C0C0C0]/20 text-sm text-white outline-none focus:border-[#C0C0C0]/50"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A7A7A7] mb-1">Menit</label>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#C0C0C0]/20 text-sm text-white outline-none focus:border-[#C0C0C0]/50"
                />
              </div>
              <div>
                <label className="block text-xs text-[#A7A7A7] mb-1">Jumlah Putar</label>
                <input
                  type="number"
                  min={0}
                  value={editPlays}
                  onChange={(e) => setEditPlays(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#C0C0C0]/20 text-sm text-white outline-none focus:border-[#C0C0C0]/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#A7A7A7] mb-1">Catatan Audit (opsional)</label>
              <input
                type="text"
                value={editStatsReason}
                onChange={(e) => setEditStatsReason(e.target.value)}
                placeholder="Alasan perubahan statistik..."
                className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#C0C0C0]/20 text-sm text-white outline-none focus:border-[#C0C0C0]/50"
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              {statsTarget.has_stat_override && (
                <button
                  type="button"
                  disabled={savingStats}
                  onClick={() => void handleResetStatsOverride(statsTarget.id)}
                  className="px-3 py-2 rounded-full bg-[#242424] border border-amber-500/40 text-xs font-semibold text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
                >
                  Reset ke Statistik Asli
                </button>
              )}
              <button
                type="button"
                disabled={savingStats}
                onClick={() => setStatsTarget(null)}
                className="px-4 py-2 rounded-full bg-[#242424] border border-[#C0C0C0]/20 text-xs font-semibold text-[#A7A7A7] hover:text-white disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingStats}
                onClick={() => void handleSaveStats()}
                className="px-4 py-2 rounded-full bg-white text-black text-xs font-bold hover:bg-[#E5E5E5] disabled:opacity-50"
              >
                {savingStats ? 'Menyimpan...' : 'Simpan Statistik'}
              </button>
            </div>
          </div>
        </div>
      )}
      {banTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4">
          <form
            onSubmit={handleConfirmBan}
            className="w-full max-w-md rounded-3xl bg-[#181818] border border-[#E11D48]/40 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Gavel className="w-4 h-4 text-[#E11D48]" />
                <span>Ban {banTarget.display_name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setBanTarget(null)}
                className="p-1.5 rounded-full text-[#A7A7A7] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#A7A7A7]">{banTarget.email}</p>
            <div>
              <label className="block text-xs font-medium text-[#C0C0C0] mb-1">Durasi Ban</label>
              <select
                value={banDuration}
                onChange={(e) => setBanDuration(e.target.value)}
                className="w-full rounded-xl bg-[#242424] border border-[#C0C0C0]/20 px-3 py-2.5 text-sm text-white"
              >
                <option value="1h">1 Jam</option>
                <option value="24h">24 Jam</option>
                <option value="7d">7 Hari</option>
                <option value="30d">30 Hari</option>
                <option value="permanent">Permanen</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#C0C0C0] mb-1">Alasan Ban</label>
              <textarea
                required
                rows={3}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Contoh: Penyalahgunaan akun / spam"
                className="w-full rounded-xl bg-[#242424] border border-[#C0C0C0]/20 p-3 text-sm text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-full bg-[#E11D48] text-white font-bold text-xs py-2.5"
              >
                {submitting ? 'Memproses...' : 'Konfirmasi Ban'}
              </button>
              <button
                type="button"
                onClick={() => setBanTarget(null)}
                className="rounded-full bg-[#242424] text-[#E5E5E5] font-semibold text-xs px-4 py-2.5"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
