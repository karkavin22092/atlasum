import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { MessageCircle, Send, UserRound } from "lucide-react";
import { BackButton, Badge, Button, GlassCard, Panel, TitleBlock } from "@/components/ui";
import { getConversation, getLatestMessage, sendMessage, type ChatMessage } from "@/lib/chat";
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
  const { recipientId } = useParams();
  const location = useLocation();
  const currentProfileId = meta?.profile.id ?? "guest";
  const contacts = (meta?.leaderboard ?? []).filter((entry) => entry.id !== currentProfileId);
  const recipient = contacts.find((entry) => entry.id === recipientId) ?? null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!recipientId || !user) {
      setMessages([]);
      return;
    }
    let active = true;
    const refresh = async () => {
      try {
        const nextMessages = await getConversation(currentProfileId, recipientId);
        if (active) {
          setMessages(nextMessages);
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
  }, [currentProfileId, recipientId, user]);

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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось отправить сообщение");
    } finally {
      setIsSending(false);
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
      <TitleBlock eyebrow="Общение" title="Личные сообщения" description="Выберите зарегистрированного участника и начните диалог." right={<BackButton to="/leaderboard" />} />
      <div className="grid min-h-[68vh] gap-5 lg:grid-cols-[320px_1fr]">
        <Panel className="p-3 sm:p-4">
          <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Участники</div>
          <div className="space-y-2">
            {contacts.length ? contacts.map((contact) => {
              const latest = getLatestMessage(currentProfileId, contact.id);
              const active = contact.id === recipientId;
              return (
                <Link key={contact.id} to={`/messages/${contact.id}`} className={active ? "block rounded-2xl border border-cyan-300/35 bg-cyan-400/10 p-3" : "block rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"}>
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/15 text-cyan-200"><UserRound className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{contact.name}</div>
                      <div className="mt-1 truncate text-xs text-slate-400">{latest?.text ?? "Начать диалог"}</div>
                    </div>
                  </div>
                </Link>
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
                <Badge tone="emerald">Участник</Badge>
              </div>

              <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
                {messages.length ? messages.map((message) => {
                  const own = message.senderId === currentProfileId;
                  return (
                    <div key={message.id} className={own ? "flex justify-end" : "flex justify-start"}>
                      <div className={own ? "max-w-[82%] rounded-3xl rounded-br-md bg-gradient-to-br from-cyan-400 to-sky-500 px-4 py-3 text-slate-950 shadow-lg" : "glass max-w-[82%] rounded-3xl rounded-bl-md px-4 py-3"}>
                        <div className="whitespace-pre-wrap break-words text-sm leading-6">{message.text}</div>
                        <div className={own ? "mt-1 text-right text-[11px] text-slate-700" : "mt-1 text-[11px] text-slate-400"}>{formatMessageTime(message.createdAt)}</div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="grid h-full place-items-center text-center">
                    <div>
                      <MessageCircle className="mx-auto h-9 w-9 text-cyan-300" />
                      <div className="mt-3 font-semibold text-white">Начните диалог с {recipient.name}</div>
                      <div className="mt-1 text-sm text-slate-400">Напишите первое сообщение.</div>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <form onSubmit={submit} className="border-t border-white/10 p-4 sm:p-5">
                {error ? <div className="mb-3 text-sm text-rose-300">{error}</div> : null}
                <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-white/5 p-2 pl-4 focus-within:border-cyan-300/40">
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }} maxLength={1000} rows={1} className="max-h-32 min-h-11 flex-1 resize-none bg-transparent py-2 text-sm text-white outline-none" placeholder="Напишите сообщение..." />
                  <Button type="submit" disabled={!draft.trim() || isSending} className="h-11 w-11 px-0" aria-label="Отправить сообщение"><Send className="h-4 w-4" /></Button>
                </div>
                <div className="mt-2 text-right text-xs text-slate-500">{draft.length}/1000</div>
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
