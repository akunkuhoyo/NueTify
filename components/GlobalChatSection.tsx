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
  is_pinned: boolean;
  created_at: string;
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
  const { user } = useAuth();
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

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const prevCountRef = useRef(0);

  const isDev = Boolean(
    user && (user.id === DEV_UID || (user.email || '').toLowerCase() === DEV_EMAIL)
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchChat = useCallback(async () => {
    try {
      const res = await fetch('/api/global-chat', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setPinned(data.pinned ?? null);
      setLatest(data.latest ?? null);
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
        () => {
          fetchChat();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchChat]);

  useEffect(() => {
    if (!open) return;

    const vv = window.visualViewport;
    if (!vv) {
      setVpBox(null);
      return;
    }

    const updateViewport = () => {
      setVpBox({ height: vv.height, top: vv.offsetTop });
    };

    updateViewport();
    vv.addEventListener('resize', updateViewport);
    vv.addEventListener('scroll', updateViewport);

    return () => {
      vv.removeEventListener('resize', updateViewport);
      vv.removeEventListener('scroll', updateViewport);
      setVpBox(null);
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
    const text = draft.trim();
    if (!text || !user || sending) return;

    setSending(true);
    setErrorMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setErrorMsg('Sesi login tidak ditemukan.');
        return;
      }

      const res = await fetch('/api/global-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: text,
          replyToId: replyTarget?.id ?? null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || 'Gagal mengirim pesan.');
        return;
      }

      setDraft('');
      setReplyTarget(null);
      await fetchChat();
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      });
    } catch {
      setErrorMsg('Gagal mengirim pesan.');
    } finally {
      setSending(false);
    }
  }, [draft, user, sending, getAccessToken, replyTarget, fetchChat]);

  const handleDelete = useCallback(
    async (messageId: string) => {
      if (!user || busyId) return;
      setBusyId(messageId);
      setErrorMsg(null);
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch('/api/global-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'delete', messageId }),
        });
        if (res.ok) {
          if (replyTarget?.id === messageId) setReplyTarget(null);
          await fetchChat();
        }
      } finally {
        setBusyId(null);
      }
    },
    [user, busyId, getAccessToken, replyTarget, fetchChat]
  );

  const handleTogglePin = useCallback(
    async (msg: ChatMessage) => {
      if (!isDev || busyId) return;
      setBusyId(msg.id);
      setErrorMsg(null);
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch('/api/global-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'pin',
            messageId: msg.id,
            pinned: !msg.is_pinned,
          }),
        });
        if (res.ok) {
          await fetchChat();
        }
      } finally {
        setBusyId(null);
      }
    },
    [isDev, busyId, getAccessToken, fetchChat]
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
            className="fixed inset-x-0 top-0 h-[100dvh] z-[110] bg-[#121212] flex flex-col"
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
            <div ref={listRef} className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3.5">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-white/45 text-sm px-6">
                  <MessageSquareText className="w-8 h-8 mb-2 text-white/25" />
                  <p>Belum ada pesan di Global Chat. Jadilah yang pertama menyapa!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = Boolean(user && msg.user_id === user.id);
                  const canDelete = Boolean(isOwn || isDev);

                  return (
                    <div
                      key={msg.id}
                      id={`chat-msg-${msg.id}`}
                      className={`flex items-start gap-2.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
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
                    onChange={(e) => setDraft(e.target.value)}
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
                    disabled={sending || !draft.trim()}
                    aria-label="Kirim pesan"
                    className="w-10 h-10 rounded-full bg-[#C0C0C0] text-[#121212] flex items-center justify-center shrink-0 hover:bg-white transition-colors disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
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
