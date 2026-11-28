'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  MessageSquareText,
  Pin,
  PinOff,
  Play,
  Reply,
  Send,
  Trash2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { UserAvatar } from './UserAvatar';
import { VerifiedBadge } from './VerifiedBadge';
import { getSupabaseClient } from '@/lib/cloud/supabaseClient';

const DEV_UID = 'ebc0b783-4ebd-44b2-89de-990c57cfd297';
const DEV_EMAIL = 'drevviann@gmail.com';

interface ChatMessage {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_developer: boolean;
  total_plays: number;
  total_seconds: number;
  content: string;
  reply_to_id: string | null;
  reply_to_name: string | null;
  reply_to_content: string | null;
  is_system_warning?: boolean;
  is_deleted?: boolean;
  is_pinned: boolean;
  created_at: string;
  clientKey?: string;
  isNew?: boolean;
}

function formatListenDuration(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec || 0));
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return m === 0 ? `${h} jam` : `${h} jam ${m} mnt`;
  }
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    return `${m} mnt`;
  }
  return '< 1 mnt';
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function GlobalChatSection() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinned, setPinned] = useState<ChatMessage | null>(null);
  const [latest, setLatest] = useState<ChatMessage | null>(null);
  const [draft, setDraft] = useState('');
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [vpBox, setVpBox] = useState<{ height: number; top: number } | null>(null);
  const [meStats, setMeStats] = useState<{ display_name: string; avatar_url: string | null; is_developer: boolean; total_plays: number; total_seconds: number } | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const prevCountRef = useRef(0);
const COOLDOWN_KEY = 'nuetify_chat_cooldown_until';
  const [cooldownSec, setCooldownSec] = useState(0);
  const realtimeTimerRef = useRef<number | null>(null);
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const hasInitialScrolledRef = useRef(false);
  const scrollToBottom = useCallback((smooth = false) => { const el = listRef.current; if (!el) return; if (smooth) { el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); } else { el.scrollTop = el.scrollHeight; } }, []);
  
  const isDev = Boolean(
    user && (user.id === DEV_UID || (user.email || '').toLowerCase() === DEV_EMAIL)
  );

  useEffect(() => {
    setMounted(true); try { const until = Number(localStorage.getItem(COOLDOWN_KEY) || 0); if (until > Date.now()) setCooldownSec(Math.ceil((until - Date.now()) / 1000)); } catch {}
  }, []);
  useEffect(() => { if (cooldownSec <= 0) return; const t = window.setTimeout(() => setCooldownSec((s) => (s > 1 ? s - 1 : 0)), 1000); return () => window.clearTimeout(t); }, [cooldownSec]);
  
  const fetchChat = useCallback(async () => {
    try {
      const sb = getSupabaseClient();
      const sessionData = sb ? await sb.auth.getSession() : null;
      const token = sessionData?.data?.session?.access_token;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/global-chat', { cache: 'no-store' , headers});
      if (!res.ok) return;
      const data = await res.json();
      const incoming: ChatMessage[] = Array.isArray(data.messages) ? data.messages : [];
      setMessages((prev) => {
        const serverMessages = incoming.filter((m) => !deletedIdsRef.current.has(m.id));
        const inFlightTemps = prev.filter((m) => m.id.startsWith('temp-'));
        const matchedTempIds = new Set<string>();
        const prevKeyMap = new Map<string, string>();
        for (const m of prev) {
          if (m.clientKey) prevKeyMap.set(m.id, m.clientKey);
        }
        const localWarnings = prev.filter((m) => m.is_system_warning && !incoming.some((x) => x.id === m.id));
        const merged = serverMessages.map((m) => {
          const matchingTemp = inFlightTemps.find((t) => !matchedTempIds.has(t.id) && t.user_id === m.user_id && t.content.trim() === m.content.trim());
          if (matchingTemp) matchedTempIds.add(matchingTemp.id);
          const existingKey = matchingTemp ? (matchingTemp.clientKey || matchingTemp.id) : prevKeyMap.get(m.id);
          return existingKey ? { ...m, clientKey: existingKey, isNew: false } : { ...m, isNew: false };
        });
        const remainingTemps = inFlightTemps.filter((t) => !matchedTempIds.has(t.id));
        return [...merged, ...remainingTemps, ...localWarnings];
      });
      setPinned(data.pinned ?? null);
      setLatest(data.latest ?? null);
      if (data.me) setMeStats(data.me);
    } catch {
      // ignore transient network errors
    }
  }, []);

  useEffect(() => {
    fetchChat();
  }, [fetchChat]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel('global-chat-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'global_chat_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new && !(payload.new as ChatMessage).is_deleted) {
            const incoming = payload.new as ChatMessage;
            setMessages((prev) => {
              if (deletedIdsRef.current.has(incoming.id)) return prev;
              if (prev.some((m) => m.id === incoming.id)) return prev;
              const tempIdx = prev.findIndex(
                (m) =>
                  m.id.startsWith('temp-') &&
                  m.user_id === incoming.user_id &&
                  m.content.trim() === incoming.content.trim()
              );
              if (tempIdx !== -1) {
                const next = [...prev];
                next[tempIdx] = { ...incoming, clientKey: prev[tempIdx].clientKey || prev[tempIdx].id };
                return next;
              }
              return [...prev, { ...incoming, isNew: true }];
            });
            setLatest(incoming);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = payload.new as ChatMessage;
            if (updated.is_deleted || deletedIdsRef.current.has(updated.id)) {
              setMessages((prev) => {
                const next = prev.filter((m) => m.id !== updated.id);
                const lastValid = [...next].reverse().find((x) => !x.is_system_warning) || null;
                setLatest(lastValid);
                return next;
              });
              setPinned((p) => (p?.id === updated.id ? null : p));
            } else {
              setMessages((prev) => prev.filter((m) => !deletedIdsRef.current.has(m.id)).map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
              if (updated.is_pinned) {
                setPinned(updated);
              } else {
                setPinned((p) => (p?.id === updated.id ? null : p));
              }
            }
          } else if (payload.eventType === 'DELETE' && (payload.old as { id?: string })?.id) {
            const oldId = (payload.old as { id: string }).id;
            setMessages((prev) => {
              const next = prev.filter((m) => m.id !== oldId);
              const lastValid = [...next].reverse().find((x) => !x.is_system_warning) || null;
              setLatest(lastValid);
              return next;
            });
            setPinned((p) => (p?.id === oldId ? null : p));
          }
          if (realtimeTimerRef.current) window.clearTimeout(realtimeTimerRef.current); realtimeTimerRef.current = window.setTimeout(() => { fetchChat(); }, 350);
        }
      )
      .subscribe();

    const pollId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchChat();
      }
    }, 5000);
    return () => {
      window.clearInterval(pollId);
      if (realtimeTimerRef.current) window.clearTimeout(realtimeTimerRef.current); supabase.removeChannel(channel);
    };
  }, [fetchChat]);

  useEffect(() => {
    if (!open) return;

    const vv = window.visualViewport;
    if (!vv) {
      setVpBox(null);
      return;
    }
    let prevVvHeight = vv.height;
    const updateViewport = () => {
      setVpBox({ height: vv.height, top: vv.offsetTop }); if (vv.height < prevVvHeight) { requestAnimationFrame(() => scrollToBottom(false)); window.setTimeout(() => scrollToBottom(false), 150); } prevVvHeight = vv.height;
    };  

    updateViewport();
    vv.addEventListener('resize', updateViewport);
    vv.addEventListener('scroll', updateViewport);

    return () => {
      vv.removeEventListener('resize', updateViewport);
      vv.removeEventListener('scroll', updateViewport);
      setVpBox(null);
    };
  }, [open, scrollToBottom]);

  useEffect(() => {
    if (!open) return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    (window as unknown as { __nuetifyCloseGlobalChat?: () => boolean }).__nuetifyCloseGlobalChat = () => {
      setOpen(false);
      return true;
    };

    try {
      window.history.pushState({ nuetifyGlobalChat: true }, '');
    } catch {
      // ignore history errors
    }

    const onPopState = () => {
      setOpen(false);
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      delete (window as unknown as { __nuetifyCloseGlobalChat?: () => boolean }).__nuetifyCloseGlobalChat;
    };
  }, [open]);
  useEffect(() => { if (!open) { hasInitialScrolledRef.current = false; return; } requestAnimationFrame(() => scrollToBottom(false)); window.setTimeout(() => scrollToBottom(false), 60); }, [open, scrollToBottom]); useEffect(() => { if (open && messages.length > 0 && !hasInitialScrolledRef.current) { hasInitialScrolledRef.current = true; requestAnimationFrame(() => scrollToBottom(false)); } }, [open, messages.length, scrollToBottom]);
  
  useEffect(() => {
    if (!open) {
      prevCountRef.current = messages.length;
      return;
    }
    const el = listRef.current;
    if (!el) return;
    if (prevCountRef.current === 0 || messages.length > prevCountRef.current) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
    prevCountRef.current = messages.length;
  }, [open, messages.length]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  
  const handleSend = useCallback(async () => {
    const trimmed = draft.trim();
    if (!user || !trimmed || sending) return;
    if (cooldownSec > 0) {
      setErrorMsg(`Tunggu ${cooldownSec} detik sebelum mengirim pesan lagi.`);
      return;
    }
    setErrorMsg('');
    const tempId = `temp-${Date.now()}`;
    const prevLatest = latest;
    const currentReply = replyTarget;
    const tempMsg: ChatMessage = {
      id: tempId,
      clientKey: tempId,
      user_id: user.id,
      display_name: meStats?.display_name || profile?.display_name || 'Pengguna NueTify',
      avatar_url: meStats?.avatar_url ?? profile?.avatar_url ?? null,
      is_developer: meStats?.is_developer ?? isDev,
      total_plays: meStats?.total_plays ?? 0,
      total_seconds: meStats?.total_seconds ?? 0,
      content: trimmed,
      reply_to_id: currentReply?.id || null,
      reply_to_name: currentReply?.display_name || null,
      reply_to_content: currentReply ? currentReply.content.slice(0, 140) : null,
      is_pinned: false,
      created_at: new Date().toISOString(),
      isNew: true,
    };

    setMessages((prev) => [...prev, tempMsg]);
    setLatest(tempMsg);
    setDraft('');
    setReplyTarget(null);
    const until = Date.now() + 10_000;
    try {
      localStorage.setItem(COOLDOWN_KEY, String(until));
    } catch {}
    setCooldownSec(10);
    requestAnimationFrame(() => scrollToBottom(true));

    setSending(true);
    try {
      const supabase = getSupabaseClient();
      const { data: sessData } = (await supabase?.auth.getSession()) || { data: { session: null } };
      const token = sessData.session?.access_token;
      if (!token) throw new Error('Sesi login tidak ditemukan.');

      const res = await fetch('/api/global-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'send',
          content: trimmed,
          replyToId: currentReply?.id || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        blocked?: boolean;
        error?: string;
        retryAfter?: number;
        message?: ChatMessage;
      };

      if (data?.blocked) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...tempMsg,
                  id: `warn-${Date.now()}`,
                  is_system_warning: true,
                  content: 'System mendeteksi kata terlarang.',
                  isNew: true,
                }
              : m
          )
        );
        setLatest(prevLatest);
        try {
          localStorage.removeItem(COOLDOWN_KEY);
        } catch {}
        setCooldownSec(0);
        return;
      }

      if (!res.ok || !data?.message) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setLatest(prevLatest);
        setDraft(trimmed);
        if (data?.retryAfter) {
          setCooldownSec(Number(data.retryAfter));
        } else {
          try {
            localStorage.removeItem(COOLDOWN_KEY);
          } catch {}
          setCooldownSec(0);
        }
        setErrorMsg(data?.error || 'Gagal mengirim pesan.');
        return;
      }

      const realMsg = data.message;
      setMessages((prev) => {
        const alreadyHasReal = prev.some((m) => m.id === realMsg.id);
        if (alreadyHasReal) {
          return prev
            .filter((m) => m.id !== tempId)
            .map((m) => (m.id === realMsg.id ? { ...realMsg, clientKey: m.clientKey || tempId, isNew: false } : m));
        }
        return prev.map((m) => (m.id === tempId ? { ...realMsg, clientKey: tempId, isNew: false } : m));
      });
      setLatest(realMsg);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setLatest(prevLatest);
      setDraft(trimmed);
      try {
        localStorage.removeItem(COOLDOWN_KEY);
      } catch {}
      setCooldownSec(0);
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengirim pesan.');
    } finally {
      setSending(false);
    }
  }, [user, draft, sending, cooldownSec, latest, replyTarget, meStats, profile, isDev, scrollToBottom]);

  const handleDelete = useCallback(async (messageId: string) => {
    if (!user) return;
    setErrorMsg('');
    const prevMessages = messages;
    const prevPinned = pinned;
    const prevLatest = latest;

    deletedIdsRef.current.add(messageId);
    const nextList = prevMessages.filter((m) => m.id !== messageId);
    setMessages(nextList);
    if (prevPinned?.id === messageId) setPinned(null);
    const nextLatest = [...nextList].reverse().find((m) => !m.is_system_warning) || null;
    setLatest(nextLatest);

    try {
      const supabase = getSupabaseClient();
      const { data: sessData } = (await supabase?.auth.getSession()) || { data: { session: null } };
      const token = sessData.session?.access_token;
      if (!token) throw new Error('Sesi login tidak ditemukan.');

      const res = await fetch('/api/global-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'delete', messageId }),
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || 'Gagal menghapus pesan.');
      }
    } catch (err) {
      deletedIdsRef.current.delete(messageId);
      setMessages(prevMessages);
      setPinned(prevPinned);
      setLatest(prevLatest);
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menghapus pesan.');
    }
  }, [user, messages, pinned, latest]);

  const handleTogglePin = useCallback(
    async (msg: ChatMessage) => { const nextPinned = !msg.is_pinned; if (!isDev) return; setErrorMsg(null); setPinned(nextPinned ? { ...msg, is_pinned: true } : null); setMessages((prev) => prev.map((m) => ({ ...m, is_pinned: nextPinned ? m.id === msg.id : false }))); try { const token = await getAccessToken(); if (!token) { await fetchChat(); return; } const res = await fetch('/api/global-chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'pin', messageId: msg.id, pinned: nextPinned }) }); if (!res.ok) await fetchChat(); } catch { await fetchChat(); } }, [isDev, getAccessToken, fetchChat]
  );

  const scrollToMessage = useCallback((id: string) => {
    const el = document.getElementById(`chat-msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const overlay =
    open && mounted
      ? createPortal(
          <div
            style={vpBox ? { height: `${vpBox.height}px`, top: `${vpBox.top}px` } : undefined}
            className="fixed overscroll-none inset-x-0 top-0 h-[100dvh] z-[110] bg-[#121212] flex flex-col"
          >
            {/* Header */}
            <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#181818]">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Tutup Global Chat"
                  className="p-1.5 -ml-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[15px] font-bold text-white truncate">Global Chat</h2>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Real-Time
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-xs text-white/50 font-medium shrink-0">
                {messages.length} pesan
              </span>
            </header>

            {/* Pinned Bar */}
            {pinned && (
              <div className="shrink-0 flex items-center gap-2.5 px-4 py-2 bg-[#1A1A1F] border-b border-white/10">
                <Pin className="w-3.5 h-3.5 text-[#C0C0C0] shrink-0" />
                <button
                  type="button"
                  onClick={() => scrollToMessage(pinned.id)}
                  className="flex-1 min-w-0 text-left text-xs text-white/80 truncate hover:text-white"
                >
                  <span className="font-semibold text-white">{pinned.display_name}: </span>
                  <span className="text-white/65">{pinned.content}</span>
                </button>
                {isDev && (
                  <button
                    type="button"
                    onClick={() => handleTogglePin(pinned)}
                    disabled={busyId === pinned.id}
                    aria-label="Lepas sematan"
                    className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 shrink-0"
                  >
                    <PinOff className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Message List */}
            <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain px-3.5 py-4 space-y-3.5">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-white/45 text-sm px-6">
                  <MessageSquareText className="w-8 h-8 mb-2 text-white/25" />
                  <p>Belum ada pesan di Global Chat. Jadilah yang pertama menyapa!</p>
                </div>
              ) : (
                messages.map((msg) => {
if (msg.is_system_warning) { return (<div key={msg.clientKey || msg.id } className="flex justify-end animate-chat-bubble"><div className="max-w-[85%] rounded-2xl bg-rose-500/15 border border-rose-500/40 px-3.5 py-2.5 text-rose-400 text-xs font-semibold flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>System mendeteksi kata terlarang.</span></div></div>); }
                  const isOwn = Boolean(user && msg.user_id === user.id);
                  const canDelete = Boolean(isOwn || isDev);

                  return (
                    <div
                      key={msg.clientKey || msg.id}
                      id={`chat-msg-${msg.id}`}
                      className={`flex items-start gap-2.5 ${msg.isNew ? 'animate-chat-bubble' : ''} ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div className="shrink-0 pt-0.5">
                        <UserAvatar src={msg.avatar_url} name={msg.display_name} size={36} />
                      </div>

                      <div className={`flex flex-col max-w-[82%] ${isOwn ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 border ${
                            isOwn
                              ? 'bg-[#202024] border-[#C0C0C0]/25'
                              : 'bg-[#181818] border-white/10'
                          }`}
                        >
                          {/* Row 1: Name + Badge + Time */}
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="text-xs font-bold text-white">
                              {msg.display_name}
                            </span>
                            {msg.is_developer && <VerifiedBadge size={14} />}
                            <span className="text-[10px] text-white/40 ml-0.5">
                              {formatClock(msg.created_at)}
                            </span>
                          </div>

                          {/* Row 2: 2 Stats Badges + Pinned Badge */}
                          <div className="flex items-center gap-1.5 flex-wrap mb-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/70 bg-white/[0.06] border border-white/10 rounded-full px-2 py-0.5">
                              <Play className="w-2.5 h-2.5 text-[#C0C0C0]" />
                              {msg.total_plays} putar
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/70 bg-white/[0.06] border border-white/10 rounded-full px-2 py-0.5">
                              <Clock className="w-2.5 h-2.5 text-[#C0C0C0]" />
                              {formatListenDuration(msg.total_seconds)}
                            </span>
                            {msg.is_pinned && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-400/25 rounded-full px-2 py-0.5">
                                <Pin className="w-2.5 h-2.5" />
                                Disematkan
                              </span>
                            )}
                          </div>

                          {/* Row 3: Reply Quote */}
                          {msg.reply_to_id && (
                            <button
                              type="button"
                              onClick={() => msg.reply_to_id && scrollToMessage(msg.reply_to_id)}
                              className="w-full text-left border-l-2 border-[#C0C0C0]/60 bg-white/[0.04] rounded-r-lg px-2.5 py-1.5 mb-1.5 text-[11px] hover:bg-white/[0.07] transition-colors"
                            >
                              <div className="font-semibold text-[#E5E5E5] truncate">
                                {msg.reply_to_name || 'Pengguna'}
                              </div>
                              <div className="text-white/60 truncate">
                                {msg.reply_to_content || 'Pesan tidak tersedia'}
                              </div>
                            </button>
                          )}

                          {/* Row 4: Content */}
                          <p className="text-[13.5px] leading-relaxed text-[#F2F2F2] whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                        </div>

                        {/* Row 5: Mini Action Row */}
                        <div className="flex items-center gap-3 mt-1 px-1">
                          {user && (
                            <button
                              type="button"
                              onClick={() => {
                                setReplyTarget(msg);
                                inputRef.current?.focus();
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-white/50 hover:text-white transition-colors"
                            >
                              <Reply className="w-3 h-3" />
                              Balas
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(msg.id)}
                              disabled={busyId === msg.id}
                              className="inline-flex items-center gap-1 text-[11px] text-red-400/75 hover:text-red-400 transition-colors disabled:opacity-40"
                            >
                              <Trash2 className="w-3 h-3" />
                              Hapus
                            </button>
                          )}
                          {isDev && (
                            <button
                              type="button"
                              onClick={() => handleTogglePin(msg)}
                              disabled={busyId === msg.id}
                              className="inline-flex items-center gap-1 text-[11px] text-[#C0C0C0]/80 hover:text-white transition-colors disabled:opacity-40"
                            >
                              {msg.is_pinned ? (
                                <>
                                  <PinOff className="w-3 h-3" />
                                  Lepas
                                </>
                              ) : (
                                <>
                                  <Pin className="w-3 h-3" />
                                  Sematkan
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Composer */}
            <div className="shrink-0 border-t border-white/10 bg-[#181818] px-3.5 py-2.5">
              {errorMsg && (
                <p className="text-[11px] text-red-400 mb-1.5">{errorMsg}</p>
              )}

              {replyTarget && (
                <div className="flex items-center justify-between gap-2 bg-white/[0.05] border border-white/10 rounded-xl px-3 py-1.5 mb-2 text-xs">
                  <div className="min-w-0 truncate text-white/75">
                    <span className="text-white/50">Membalas </span>
                    <span className="font-semibold text-white">{replyTarget.display_name}: </span>
                    <span>{replyTarget.content}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyTarget(null)}
                    aria-label="Batalkan balasan"
                    className="p-0.5 text-white/55 hover:text-white shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {user ? (
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    maxLength={500}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)} onFocus={() => { scrollToBottom(false); window.setTimeout(() => scrollToBottom(false), 160); window.setTimeout(() => scrollToBottom(false), 320); }}
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Enter' &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing &&
                        typeof window !== 'undefined' &&
                        window.matchMedia('(pointer: fine)').matches
                      ) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Tulis pesan ke Global Chat..."
                    className="flex-1 resize-none rounded-2xl bg-[#121212] border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#C0C0C0]/50 max-h-24 overflow-y-auto"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={cooldownSec > 0 || !draft.trim()}
                    aria-label="Kirim pesan"
                    className="w-10 h-10 rounded-full bg-[#C0C0C0] text-[#121212] flex items-center justify-center shrink-0 hover:bg-white transition-colors disabled:opacity-40"
                  >
                    {cooldownSec > 0 ? <span className="text-xs font-bold">{cooldownSec}s</span> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-center text-white/60 py-1.5">
                  Masuk ke akun NueTify untuk ikut mengirim pesan di Global Chat.
                </p>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl bg-[#181818] border border-white/10 px-4 py-3 flex items-center gap-3 text-left active:scale-[0.99] transition-transform hover:border-white/20"
      >
        <MessageSquareText className="w-5 h-5 text-[#C0C0C0] shrink-0" />
        <span className="text-[13px] font-bold text-white shrink-0">Global Chat</span>
        <span className="h-4 w-[1px] bg-white/15 shrink-0" />

        <div className="flex-1 min-w-0 flex items-center gap-1.5 text-xs truncate">
          {latest ? (
            <>
              <span className="font-semibold text-[#E5E5E5] shrink-0">
                {latest.display_name}
              </span>
              {latest.is_developer && <VerifiedBadge size={13} />}
              <span className="text-white/40">:</span>
              <span className="text-white/65 truncate">{latest.content}</span>
            </>
          ) : (
            <span className="text-white/55 truncate">
              Belum ada pesan · Ketuk untuk mengobrol
            </span>
          )}
        </div>

        <ArrowRight className="w-4 h-4 text-[#C0C0C0] shrink-0" />
      </button>

      {overlay}
    </>
  );
}

export default GlobalChatSection;
