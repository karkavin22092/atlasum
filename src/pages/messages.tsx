import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, CheckCheck, CircleAlert, Clock3, LoaderCircle, MessageCircle, RotateCcw, Send, SmilePlus, UserRound } from "lucide-react";
import { BackButton, Button, GlassCard, Panel, TitleBlock } from "@/components/ui";
import {
  getConversation,
  getLatestMessage,
  markConversationRead,
  MESSAGE_EMOJIS,
  REACTION_EMOJIS,
  createPendingMessage,
  sendMessage,
  toggleMessageReaction,
  getConversationSummaries,
  type ChatMessage,
  type ConversationSummary,
} from "@/lib/chat";
import { useAuth } from "@/lib/auth";
import { getPresence } from "@/lib/presence";
import { formatXp } from "@/lib/utils";
import { REALTIME_POLL_MS } from "@/lib/realtime";
import type { AppPageProps } from "./types";

const formatMessageTime = (value: string) => new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
}).format(new Date(value));
const initials = (name: string) => name.trim().slice(0, 2).toUpperCase();

export const MessagesPage = ({ meta }: AppPageProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { recipientId } = useParams();
  const location = useLocation();
  const currentProfileId = user?.id ?? "guest";
  const contacts = (meta?.leaderboard ?? []).filter((entry) =>
    entry.id !== currentProfileId && entry.name.trim().toLowerCase() !== user?.name.trim().toLowerCase());
  const recipient = contacts.find((entry) => entry.id === recipientId) ?? null;
  const recipientPresence = getPresence(recipient?.lastSeenAt);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationSummaries, setConversationSummaries] = useState<ConversationSummary[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionTargetId, setReactionTargetId] = useState<string | null>(null);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const lastScrolledMessageIdRef = useRef("");
  const initialScrollCompleteRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiToggleRef = useRef<HTMLButtonElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const summariesByContact = new Map(conversationSummaries.map((summary) => [summary.contactId, summary]));
  const sortedContacts = [...contacts].sort((left, right) => {
    const leftLatest = summariesByContact.get(left.id)?.latest.createdAt ?? "";
    const rightLatest = summariesByContact.get(right.id)?.latest.createdAt ?? "";
    return rightLatest.localeCompare(leftLatest) || left.name.localeCompare(right.name, "ru");
  });

  useEffect(() => {
    if (!user) {
      setConversationSummaries([]);
      return;
    }
    let active = true;
    let refreshing = false;
    const refreshSummaries = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const next = await getConversationSummaries(currentProfileId);
        if (active) setConversationSummaries(next);
      } finally {
        refreshing = false;
      }
    };
    void refreshSummaries();
    const refreshVisible = () => {
      if (!document.hidden) void refreshSummaries();
    };
    const interval = window.setInterval(refreshVisible, REALTIME_POLL_MS);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [currentProfileId, user]);

  useEffect(() => {
    if (!recipientId || !user) {
      setMessages([]);
      return;
    }
    setShowEmojiPicker(false);
    setReactionTargetId(null);
    lastScrolledMessageIdRef.current = "";
    initialScrollCompleteRef.current = false;
    let active = true;
    let refreshing = false;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const nextMessages = await getConversation(currentProfileId, recipientId);
        if (active) {
          const readMessages = markConversationRead(currentProfileId, recipientId, nextMessages);
          setMessages((current) => [
            ...readMessages,
            ...current.filter((message) => message.clientStatus && !readMessages.some((stored) => stored.id === message.id)),
          ].sort((left, right) => left.createdAt.localeCompare(right.createdAt)));
          void queryClient.invalidateQueries({ queryKey: ["unread-messages", currentProfileId] });
          setError("");
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Не удалось получить сообщения");
      } finally {
        refreshing = false;
      }
    };
    void refresh();
    const refreshVisible = () => {
      if (!document.hidden) void refresh();
    };
    const interval = window.setInterval(refreshVisible, REALTIME_POLL_MS);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [currentProfileId, queryClient, recipientId, user]);

  useEffect(() => {
    const lastMessageId = messages.at(-1)?.id ?? "";
    const viewport = messagesViewportRef.current;
    if (!viewport || !lastMessageId || lastMessageId === lastScrolledMessageIdRef.current) return;
    const behavior = initialScrollCompleteRef.current ? "smooth" : "auto";
    lastScrolledMessageIdRef.current = lastMessageId;
    window.requestAnimationFrame(() => {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior });
      initialScrollCompleteRef.current = true;
    });
  }, [messages]);

  useEffect(() => {
    if (!showEmojiPicker && !reactionTargetId) return;
    const dismissMenus = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const clickedReactionToggle = target instanceof Element && Boolean(target.closest("[data-reaction-toggle]"));
      if (showEmojiPicker && !emojiPickerRef.current?.contains(target) && !emojiToggleRef.current?.contains(target)) {
        setShowEmojiPicker(false);
      }
      if (reactionTargetId && !reactionPickerRef.current?.contains(target) && !clickedReactionToggle) {
        setReactionTargetId(null);
      }
    };
    document.addEventListener("pointerdown", dismissMenus);
    return () => document.removeEventListener("pointerdown", dismissMenus);
  }, [reactionTargetId, showEmojiPicker]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!recipient) return;
    const text = draft.trim();
    if (!text) return;
    const pending = createPendingMessage(currentProfileId, recipient.id, text);
    setError("");
    setIsSending(true);
    setMessages((current) => [...current, pending]);
    setDraft("");
    setShowEmojiPicker(false);
    try {
      const message = await sendMessage(currentProfileId, recipient.id, text, pending);
      setMessages((current) => [...current.filter((item) => item.id !== message.id), message]);
    } catch (caught) {
      setMessages((current) => current.map((message) => message.id === pending.id ? { ...message, clientStatus: "failed" } : message));
      setError(caught instanceof Error ? caught.message : "Не удалось отправить сообщение");
    } finally {
      setIsSending(false);
    }
  };

  const retryMessage = async (message: ChatMessage) => {
    if (message.clientStatus !== "failed") return;
    setMessages((current) => current.map((item) => item.id === message.id ? { ...item, clientStatus: "sending" } : item));
    setError("");
    try {
      const delivered = await sendMessage(message.senderId, message.recipientId, message.text, { ...message, clientStatus: "sending" });
      setMessages((current) => current.map((item) => item.id === delivered.id ? delivered : item));
    } catch (caught) {
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, clientStatus: "failed" } : item));
      setError(caught instanceof Error ? caught.message : "Не удалось повторно отправить сообщение");
    }
  };

  const addEmoji = (emoji: string) => {
    setDraft((current) => `${current}${emoji}`.slice(0, 1000));
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const reactToMessage = async (message: ChatMessage, emoji: string) => {
    const reactionKey = `${message.id}:${emoji}`;
    setReactingTo(reactionKey);
    setError("");
    try {
      const updated = await toggleMessageReaction(message, currentProfileId, emoji);
      setMessages((current) => current.map((item) => item.id === updated.id ? updated : item));
      setReactionTargetId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось изменить реакцию");
    } finally {
      setReactingTo(null);
    }
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <TitleBlock eyebrow="Личные сообщения" title="Войдите, чтобы общаться" description="Отправлять сообщения могут только зарегистрированные участники рейтинга." right={<BackButton to="/leaderboard" />} />
        <Panel className="grid min-h-72 place-items-center text-center">
          <div>
            <MessageCircle className="mx-auto h-10 w-10 text-cyan-300" />
            <div className="mt-4 font-semibold text-white">Для чата нужна учётная запись</div>
            <Link to="/auth" state={{ from: location.pathname }}><Button className="mt-4">Войти или зарегистрироваться</Button></Link>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={recipient ? "hidden lg:block" : "block"}>
        <TitleBlock eyebrow="Общение" title="Личные сообщения" description="Общайтесь, отправляйте эмодзи и оставляйте реакции на сообщения." right={<BackButton to="/leaderboard" />} />
      </div>
      <div className="grid min-h-0 gap-3 lg:min-h-[68vh] lg:grid-cols-[320px_1fr] lg:gap-5">
        <Panel className={`${recipient ? "hidden lg:flex" : "flex"} h-[calc(100dvh-11.5rem)] min-h-[430px] flex-col p-3 sm:p-4 lg:h-[68vh] lg:min-h-[560px]`}>
          <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Участники</div>
          <div className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {sortedContacts.length ? sortedContacts.map((contact) => {
              const summary = summariesByContact.get(contact.id);
              const latest = summary?.latest ?? getLatestMessage(currentProfileId, contact.id);
              const latestFromCurrentUser = latest?.senderId === currentProfileId;
              const unreadCount = summary?.unreadCount ?? 0;
              const active = contact.id === recipientId;
              const presence = getPresence(contact.lastSeenAt);
              return (
                <motion.div key={contact.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  <Link to={`/messages/${contact.id}`} className={active ? "block rounded-2xl border border-cyan-300/35 bg-cyan-400/10 p-3" : unreadCount ? "block rounded-2xl border border-cyan-300/30 bg-cyan-400/10 p-3 transition hover:bg-cyan-400/15" : "block rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"}>
                    <div className="flex items-center gap-3">
                      <div className="chat-avatar-fallback grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-cyan-400/15 text-xs font-semibold">
                        {contact.avatarUrl ? <img src={contact.avatarUrl} alt={`Аватар ${contact.name}`} className="h-full w-full object-cover" /> : initials(contact.name) || <UserRound className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={presence.online ? "h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "h-2 w-2 shrink-0 rounded-full bg-slate-500"} />
                          <div className="truncate text-sm font-semibold text-white">{contact.name}</div>
                        </div>
                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          <div className={unreadCount ? "min-w-0 flex-1 truncate text-xs font-medium text-white" : "min-w-0 flex-1 truncate text-xs text-slate-400"}>{latest ? `${latestFromCurrentUser ? "Вы: " : ""}${latest.text}` : "Начать диалог"}</div>
                          {unreadCount ? <span className="message-unread-badge inline-flex shrink-0 rounded-full bg-rose-500 text-[10px] font-bold"><span className="message-unread-value">{unreadCount > 99 ? "99+" : unreadCount}</span></span> : null}
                        </div>
                        <div className={presence.online ? "mt-1 truncate text-[10px] font-medium text-emerald-400" : "mt-1 truncate text-[10px] text-slate-500"}>{presence.label}</div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            }) : (
              <GlassCard className="text-sm text-slate-400">Других зарегистрированных участников пока нет.</GlassCard>
            )}
          </div>
        </Panel>

        <Panel className={`${recipient ? "flex" : "hidden lg:flex"} h-[calc(100dvh-11.5rem)] min-h-[430px] flex-col overflow-hidden p-0 lg:h-[68vh] lg:min-h-[560px]`}>
          {recipient ? (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-3 sm:px-5 sm:py-4">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <Link to="/messages" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 lg:hidden" aria-label="Вернуться к участникам">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                  <div className="chat-avatar-fallback grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400 to-sky-500 text-xs font-semibold">
                    {recipient.avatarUrl ? <img src={recipient.avatarUrl} alt={`Аватар ${recipient.name}`} className="h-full w-full object-cover" /> : initials(recipient.name) || <UserRound className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">{recipient.name}</div>
                    <div className="truncate text-xs text-slate-400">Уровень {recipient.level} · {formatXp(recipient.xp)} XP</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    {recipientPresence.online ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /> : null}
                    <span className={recipientPresence.online ? "relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" : "relative inline-flex h-2.5 w-2.5 rounded-full bg-slate-500"} />
                  </span>
                  <span className={recipientPresence.online ? "max-w-[45vw] break-words text-right text-[11px] font-medium leading-4 text-emerald-400 sm:max-w-52" : "max-w-[45vw] break-words text-right text-[11px] leading-4 text-slate-400 sm:max-w-52"}>{recipientPresence.label}</span>
                </div>
              </div>

              <div ref={messagesViewportRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-5">
                <div className="flex min-h-full flex-col justify-end gap-3">
                <AnimatePresence initial={false}>
                {messages.length ? messages.map((message) => {
                  const own = message.senderId === currentProfileId;
                  const reactions = Object.entries(message.reactions ?? {}).filter(([, users]) => users.length > 0);
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, x: own ? 24 : -24, scale: 0.96 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 360, damping: 28 }}
                      className={own ? "flex justify-end" : "flex justify-start"}
                    >
                      <div className={own ? "flex items-end justify-end gap-2" : "flex items-end gap-2"}>
                        {!own ? (
                          <div className="chat-avatar-fallback grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-cyan-400/15 text-[10px] font-semibold">
                            {recipient?.avatarUrl ? <img src={recipient.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(recipient?.name ?? "") || <UserRound className="h-3.5 w-3.5" />}
                          </div>
                        ) : null}
                        <div className="relative max-w-[86%] sm:max-w-[78%]">
                        <div className={own
                          ? `chat-message-bubble chat-message-bubble-own rounded-3xl rounded-br-md px-4 py-3 ${message.clientStatus === "failed" ? "ring-2 ring-rose-500/70" : ""}`
                          : "chat-message-bubble chat-message-bubble-incoming glass rounded-3xl rounded-bl-md px-4 py-3"}>
                          <div className="whitespace-pre-wrap break-words text-sm leading-6">{message.text}</div>
                          <div className={own ? "chat-message-meta mt-1 flex flex-wrap items-center justify-end gap-1.5 text-[11px]" : "chat-message-meta mt-1 text-[11px]"}>
                            <span>{formatMessageTime(message.createdAt)}</span>
                            {own && message.clientStatus === "sending" ? <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3 animate-pulse" /> Отправляется</span> : null}
                            {own && message.clientStatus === "failed" ? (
                              <button type="button" onClick={() => void retryMessage(message)} className="inline-flex items-center gap-1 font-semibold text-rose-950 underline decoration-rose-700/50 underline-offset-2" title="Повторить отправку">
                                <CircleAlert className="h-3 w-3" /> Не отправлено <RotateCcw className="h-3 w-3" />
                              </button>
                            ) : null}
                            {own && !message.clientStatus && message.readAt ? <span className="inline-flex items-center gap-1 font-semibold text-sky-950" title={`Прочитано ${formatMessageTime(message.readAt)}`}><CheckCheck className="h-3.5 w-3.5" /> Прочитано</span> : null}
                            {own && !message.clientStatus && !message.readAt && message.deliveredAt ? <span className="inline-flex items-center gap-1"><CheckCheck className="h-3.5 w-3.5" /> Доставлено</span> : null}
                            {own && !message.clientStatus && !message.readAt && !message.deliveredAt ? <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Отправлено</span> : null}
                          </div>
                        </div>

                        <div className={own ? "mt-1.5 flex flex-wrap items-center justify-end gap-1" : "mt-1.5 flex flex-wrap items-center gap-1"}>
                          {reactions.map(([emoji, users]) => {
                            const selected = users.includes(currentProfileId);
                            return (
                              <motion.button
                                whileTap={{ scale: 0.88 }}
                                type="button"
                                key={emoji}
                                onClick={() => void reactToMessage(message, emoji)}
                                disabled={reactingTo === `${message.id}:${emoji}`}
                                className={selected
                                  ? "chat-reaction-active rounded-full border border-cyan-300/40 bg-cyan-400/15 px-2 py-1 text-xs text-cyan-100"
                                  : "rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300 hover:bg-white/10"}
                                aria-label={`${selected ? "Убрать" : "Добавить"} реакцию ${emoji}`}
                              >
                                {emoji} <span className="ml-0.5 font-semibold">{users.length}</span>
                              </motion.button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => setReactionTargetId((current) => current === message.id ? null : message.id)}
                            disabled={Boolean(message.clientStatus)}
                            data-reaction-toggle
                            className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition hover:scale-110 hover:bg-white/10 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Добавить реакцию"
                          >
                            <SmilePlus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <AnimatePresence>
                          {reactionTargetId === message.id ? (
                            <motion.div
                              ref={reactionPickerRef}
                              initial={{ opacity: 0, y: 8, scale: 0.92 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.92 }}
                              className={own
                                ? "chat-reaction-picker glass absolute right-0 top-1 z-20 flex gap-1 rounded-2xl p-2 shadow-2xl"
                                : "chat-reaction-picker glass absolute left-0 top-1 z-20 flex gap-1 rounded-2xl p-2 shadow-2xl"}
                            >
                              {REACTION_EMOJIS.map((emoji) => (
                                <motion.button
                                  whileHover={{ scale: 1.24, y: -2 }}
                                  whileTap={{ scale: 0.9 }}
                                  type="button"
                                  key={emoji}
                                  onClick={() => void reactToMessage(message, emoji)}
                                  className="grid h-9 w-9 place-items-center rounded-xl text-lg transition hover:bg-white/10"
                                  aria-label={`Реакция ${emoji}`}
                                >
                                  {reactingTo === `${message.id}:${emoji}` ? <LoaderCircle className="h-4 w-4 animate-spin" /> : emoji}
                                </motion.button>
                              ))}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                        </div>
                        {own ? (
                          <div className="chat-avatar-fallback grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-cyan-400/15 text-[10px] font-semibold">
                            {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(user.name) || <UserRound className="h-3.5 w-3.5" />}
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  );
                }) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid h-full place-items-center text-center">
                    <div>
                      <motion.div animate={{ y: [0, -7, 0], rotate: [0, -4, 4, 0] }} transition={{ duration: 3.4, repeat: Infinity }}>
                        <MessageCircle className="mx-auto h-9 w-9 text-cyan-300" />
                      </motion.div>
                      <div className="mt-3 font-semibold text-white">Начните диалог с {recipient.name}</div>
                      <div className="mt-1 text-sm text-slate-400">Напишите первое сообщение или отправьте эмодзи.</div>
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
                </div>
              </div>

              <form onSubmit={submit} className="relative border-t border-white/10 p-3 sm:p-5">
                <AnimatePresence>
                  {error ? (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-3 rounded-xl bg-rose-400/10 px-3 py-2 text-sm text-rose-300">
                      {error}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <AnimatePresence>
                  {showEmojiPicker ? (
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      ref={emojiPickerRef}
                      className="chat-emoji-picker glass absolute bottom-full left-3 z-30 mb-3 grid grid-cols-6 gap-1 rounded-2xl p-2 sm:left-5 sm:grid-cols-8"
                    >
                      {MESSAGE_EMOJIS.map((emoji) => (
                        <motion.button
                          whileHover={{ scale: 1.2, rotate: [-4, 4, 0] }}
                          whileTap={{ scale: 0.88 }}
                          type="button"
                          key={emoji}
                          onClick={() => addEmoji(emoji)}
                          className="grid h-9 w-9 place-items-center rounded-xl text-xl transition hover:bg-white/10"
                          aria-label={`Добавить ${emoji}`}
                        >
                          {emoji}
                        </motion.button>
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 focus-within:border-cyan-300/40 focus-within:shadow-[0_0_24px_rgba(34,211,238,0.1)]">
                  <motion.button
                    ref={emojiToggleRef}
                    whileHover={{ scale: 1.08, rotate: 6 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => setShowEmojiPicker((current) => !current)}
                    className={showEmojiPicker
                      ? "chat-emoji-active grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-400/15 text-cyan-200"
                      : "grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-cyan-200"}
                    aria-label="Открыть панель эмодзи"
                  >
                    <SmilePlus className="h-5 w-5" />
                  </motion.button>
                  <textarea ref={textareaRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }} maxLength={1000} rows={1} className="max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-white outline-none" placeholder="Сообщение или эмодзи..." />
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}>
                    <Button type="submit" disabled={!draft.trim() || isSending} className="h-11 w-11 px-0" aria-label="Отправить сообщение">
                      {isSending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </motion.div>
                </div>
                <div className="chat-composer-status mt-2 flex min-h-5 items-center justify-end gap-3 text-xs text-slate-500">
                  <span className="chat-composer-counter shrink-0 rounded-full border px-2 py-0.5 tabular-nums">{draft.length}/1000</span>
                </div>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center px-5 text-center">
              <div>
                <MessageCircle className="mx-auto h-12 w-12 text-cyan-300" />
                <div className="mt-4 text-xl font-semibold text-white">Выберите собеседника</div>
                <div className="mt-2 text-sm text-slate-400">Откройте участника слева или нажмите «Написать» в рейтинге.</div>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};
