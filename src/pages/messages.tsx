import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, CheckCheck, CircleAlert, Clock3, LoaderCircle, MessageCircle, RotateCcw, Send, SmilePlus, Sparkles, UserRound } from "lucide-react";
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
  type ChatMessage,
} from "@/lib/chat";
import { useAuth } from "@/lib/auth";
import { getPresence } from "@/lib/presence";
import type { AppPageProps } from "./types";

const formatMessageTime = (value: string) => new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
}).format(new Date(value));

export const MessagesPage = ({ meta }: AppPageProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { recipientId } = useParams();
  const location = useLocation();
  const currentProfileId = user?.id ?? "guest";
  const contacts = (meta?.leaderboard ?? []).filter((entry) => entry.id !== currentProfileId);
  const recipient = contacts.find((entry) => entry.id === recipientId) ?? null;
  const recipientPresence = getPresence(recipient?.lastSeenAt);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
    const refresh = async () => {
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
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5_000);
    return () => {
      active = false;
      window.clearInterval(interval);
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
        <Panel className={`${recipient ? "hidden lg:block" : "block"} p-3 sm:p-4`}>
          <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Участники</div>
          <div className="space-y-2">
            {contacts.length ? contacts.map((contact) => {
              const latest = getLatestMessage(currentProfileId, contact.id);
              const active = contact.id === recipientId;
              const presence = getPresence(contact.lastSeenAt);
              return (
                <motion.div key={contact.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  <Link to={`/messages/${contact.id}`} className={active ? "block rounded-2xl border border-cyan-300/35 bg-cyan-400/10 p-3" : "block rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"}>
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/15 text-cyan-200"><UserRound className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={presence.online ? "h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "h-2 w-2 shrink-0 rounded-full bg-slate-500"} />
                          <div className="truncate text-sm font-semibold text-white">{contact.name}</div>
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-400">{latest?.text ?? "Начать диалог"}</div>
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
                  <div className="hidden h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-sky-500 text-slate-950 sm:grid"><UserRound className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">{recipient.name}</div>
                    <div className="truncate text-xs text-slate-400">Уровень {recipient.level} · {recipient.xp} XP</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    {recipientPresence.online ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /> : null}
                    <span className={recipientPresence.online ? "relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" : "relative inline-flex h-2.5 w-2.5 rounded-full bg-slate-500"} />
                  </span>
                  <span className={recipientPresence.online ? "max-w-24 truncate text-xs font-medium text-emerald-400 sm:max-w-52" : "max-w-24 truncate text-right text-xs text-slate-400 sm:max-w-52"}>{recipientPresence.label}</span>
                </div>
              </div>

              <div ref={messagesViewportRef} className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-5">
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
                      <div className={own ? "relative max-w-[86%] sm:max-w-[78%]" : "relative max-w-[86%] sm:max-w-[78%]"}>
                        <div className={own
                          ? `rounded-3xl rounded-br-md bg-gradient-to-br from-cyan-400 to-sky-500 px-4 py-3 text-slate-950 shadow-lg ${message.clientStatus === "failed" ? "ring-2 ring-rose-500/70" : ""}`
                          : "glass rounded-3xl rounded-bl-md px-4 py-3"}>
                          <div className="whitespace-pre-wrap break-words text-sm leading-6">{message.text}</div>
                          <div className={own ? "mt-1 flex flex-wrap items-center justify-end gap-1.5 text-[11px] text-slate-700" : "mt-1 text-[11px] text-slate-400"}>
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
                            className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition hover:scale-110 hover:bg-white/10 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Добавить реакцию"
                          >
                            <SmilePlus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <AnimatePresence>
                          {reactionTargetId === message.id ? (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.92 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.92 }}
                              className={own
                                ? "glass absolute bottom-9 right-0 z-20 flex gap-1 rounded-2xl p-2 shadow-2xl"
                                : "glass absolute bottom-9 left-0 z-20 flex gap-1 rounded-2xl p-2 shadow-2xl"}
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

              <form onSubmit={submit} className="border-t border-white/10 p-3 sm:p-5">
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
                      className="glass mb-3 grid grid-cols-6 gap-1 rounded-2xl p-2 sm:w-fit sm:grid-cols-8"
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
                  }} maxLength={1000} rows={1} className="max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm text-white outline-none" placeholder="Сообщение или эмодзи..." />
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}>
                    <Button type="submit" disabled={!draft.trim() || isSending} className="h-11 w-11 px-0" aria-label="Отправить сообщение">
                      {isSending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </motion.div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span className="hidden items-center gap-1.5 sm:flex"><Sparkles className="h-3.5 w-3.5 text-cyan-300" /> Реакции синхронизируются автоматически</span>
                  <span>{draft.length}/1000</span>
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
