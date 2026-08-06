import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LoaderCircle, MessageCircle, Send, SmilePlus, Sparkles, UserRound } from "lucide-react";
import { BackButton, Badge, Button, GlassCard, Panel, TitleBlock } from "@/components/ui";
import {
  getConversation,
  getLatestMessage,
  markConversationRead,
  MESSAGE_EMOJIS,
  REACTION_EMOJIS,
  sendMessage,
  toggleMessageReaction,
  type ChatMessage,
} from "@/lib/chat";
import { useAuth } from "@/lib/auth";
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
  const currentProfileId = meta?.profile.id ?? "guest";
  const contacts = (meta?.leaderboard ?? []).filter((entry) => entry.id !== currentProfileId);
  const recipient = contacts.find((entry) => entry.id === recipientId) ?? null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionTargetId, setReactionTargetId] = useState<string | null>(null);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!recipientId || !user) {
      setMessages([]);
      return;
    }
    setShowEmojiPicker(false);
    setReactionTargetId(null);
    let active = true;
    const refresh = async () => {
      try {
        const nextMessages = await getConversation(currentProfileId, recipientId);
        if (active) {
          setMessages(nextMessages);
          markConversationRead(currentProfileId, recipientId, nextMessages);
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
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!recipient) return;
    setError("");
    setIsSending(true);
    try {
      const message = await sendMessage(currentProfileId, recipient.id, draft);
      setMessages((current) => [...current.filter((item) => item.id !== message.id), message]);
      setDraft("");
      setShowEmojiPicker(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось отправить сообщение");
    } finally {
      setIsSending(false);
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
      <TitleBlock eyebrow="Общение" title="Личные сообщения" description="Общайтесь, отправляйте эмодзи и оставляйте реакции на сообщения." right={<BackButton to="/leaderboard" />} />
      <div className="grid min-h-[68vh] gap-5 lg:grid-cols-[320px_1fr]">
        <Panel className="p-3 sm:p-4">
          <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Участники</div>
          <div className="space-y-2">
            {contacts.length ? contacts.map((contact) => {
              const latest = getLatestMessage(currentProfileId, contact.id);
              const active = contact.id === recipientId;
              return (
                <motion.div key={contact.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  <Link to={`/messages/${contact.id}`} className={active ? "block rounded-2xl border border-cyan-300/35 bg-cyan-400/10 p-3" : "block rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"}>
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/15 text-cyan-200"><UserRound className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{contact.name}</div>
                        <div className="mt-1 truncate text-xs text-slate-400">{latest?.text ?? "Начать диалог"}</div>
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

        <Panel className="flex min-h-[560px] flex-col overflow-hidden p-0">
          {recipient ? (
            <>
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-sky-500 text-slate-950"><UserRound className="h-5 w-5" /></div>
                  <div>
                    <div className="font-semibold text-white">{recipient.name}</div>
                    <div className="text-xs text-slate-400">Уровень {recipient.level} · {recipient.xp} XP</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </span>
                  <Badge tone="emerald">Автообновление</Badge>
                </div>
              </div>

              <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
                <AnimatePresence initial={false}>
                {messages.length ? messages.map((message) => {
                  const own = message.senderId === currentProfileId;
                  const reactions = Object.entries(message.reactions ?? {}).filter(([, users]) => users.length > 0);
                  return (
                    <motion.div
                      key={message.id}
                      layout
                      initial={{ opacity: 0, x: own ? 24 : -24, scale: 0.96 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 360, damping: 28 }}
                      className={own ? "flex justify-end" : "flex justify-start"}
                    >
                      <div className={own ? "relative max-w-[86%] sm:max-w-[78%]" : "relative max-w-[86%] sm:max-w-[78%]"}>
                        <div className={own ? "rounded-3xl rounded-br-md bg-gradient-to-br from-cyan-400 to-sky-500 px-4 py-3 text-slate-950 shadow-lg" : "glass rounded-3xl rounded-bl-md px-4 py-3"}>
                          <div className="whitespace-pre-wrap break-words text-sm leading-6">{message.text}</div>
                          <div className={own ? "mt-1 text-right text-[11px] text-slate-700" : "mt-1 text-[11px] text-slate-400"}>{formatMessageTime(message.createdAt)}</div>
                        </div>

                        <div className={own ? "mt-1.5 flex flex-wrap items-center justify-end gap-1" : "mt-1.5 flex flex-wrap items-center gap-1"}>
                          {reactions.map(([emoji, users]) => {
                            const selected = users.includes(currentProfileId);
                            return (
                              <motion.button
                                layout
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
                            className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition hover:scale-110 hover:bg-white/10 hover:text-cyan-200"
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
                <div ref={endRef} />
              </div>

              <form onSubmit={submit} className="border-t border-white/10 p-4 sm:p-5">
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
                      className="glass mb-3 grid grid-cols-8 gap-1 rounded-2xl p-2 sm:w-fit"
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
                  }} maxLength={1000} rows={1} className="max-h-32 min-h-11 flex-1 resize-none bg-transparent py-2 text-sm text-white outline-none" placeholder="Сообщение или эмодзи..." />
                  <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}>
                    <Button type="submit" disabled={!draft.trim() || isSending} className="h-11 w-11 px-0" aria-label="Отправить сообщение">
                      {isSending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </motion.div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-cyan-300" /> Реакции синхронизируются автоматически</span>
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
