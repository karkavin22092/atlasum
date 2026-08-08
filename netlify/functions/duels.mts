import { getStore } from "@netlify/blobs";
import questionData from "../../data/questions.json";
import { dashboardMeta } from "../../server/content";
import { uniqueQuestions } from "../../shared/question-uniqueness";

type SubjectId = "it-design" | "management" | "economics";
type DuelStatus = "pending" | "active" | "finished" | "cancelled" | "declined";
type DuelAnswer = { questionId: string; answer: unknown };
type DuelQuestion = {
  id: string;
  topic: string;
  difficulty: string;
  type: string;
  question: string;
  options: Array<{ id: string; text: string; image?: string }>;
  correct: unknown;
  explanation: string;
  source: string;
  tags: string[];
  media?: { kind: "image"; src: string; alt: string };
  meta?: Record<string, unknown>;
};
type DuelPlayer = { id: string; name: string; avatarUrl: string | null };
type DuelAttempt = { answers: DuelAnswer[]; score: number; submittedAt: string | null; complete: boolean; leftAt?: string | null };
type DuelRecord = {
  id: string;
  inviter: DuelPlayer;
  invitee: DuelPlayer;
  subject: SubjectId;
  questions: DuelQuestion[];
  status: DuelStatus;
  createdAt: string;
  expiresAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  winnerId: string | null;
  result: "win" | "draw" | "cancelled" | null;
  cancelReason: string | null;
  answers: Record<string, DuelAttempt>;
  rewardXp: Record<string, number>;
  rewardsApplied: boolean;
};
type LeaderboardEntry = { id?: string; name?: string; avatarUrl?: string | null; xp?: number; level?: number; lastSeenAt?: string | null; rewardedDuelIds?: string[] };

const ADMIN_ID = "lonexnesss";
const MATCH_DURATION_MS = 10 * 60 * 1000;
const INVITE_DURATION_MS = 30 * 1000;
const TOTAL_QUESTIONS = 10;
const duelStore = () => getStore({ name: "design-tests-duels", consistency: "strong" });
const leaderboardStore = () => getStore({ name: "design-tests-leaderboard", consistency: "strong" });
const sessionsStore = () => getStore({ name: "design-tests-auth-sessions", consistency: "strong" });
const notificationsStore = () => getStore({ name: "design-tests-notifications", consistency: "strong" });
const questions = questionData as unknown as DuelQuestion[];

const cleanId = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-zа-я0-9-]+/giu, "-").slice(0, 80);
const jsonError = (message: string, status: number) => Response.json({ error: message }, { status });
const hashHex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
const getSessionUserId = async (request: Request) => {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return "";
  const session = await sessionsStore().get(await hashHex(token), { type: "json", consistency: "strong" }) as { userId?: string; expiresAt?: string } | null;
  if (!session?.userId || !session.expiresAt || Date.parse(session.expiresAt) <= Date.now()) return "";
  return cleanId(session.userId);
};
const isOnline = (entry: LeaderboardEntry | null) => Boolean(entry?.lastSeenAt && Date.now() - Date.parse(String(entry.lastSeenAt)) < 90_000);
const getPlayer = async (id: string) => {
  const entry = await leaderboardStore().get(id, { type: "json", consistency: "strong" }) as LeaderboardEntry | null;
  if (!entry?.id || !entry.name) return null;
  return { id, name: String(entry.name), avatarUrl: typeof entry.avatarUrl === "string" ? entry.avatarUrl : null } satisfies DuelPlayer;
};
const publicQuestion = ({ correct: _correct, options, ...question }: DuelQuestion) => ({
  ...question,
  options: options.map(({ id, text, image }) => ({ id, text, image })),
  correct: "__hidden__",
});
const publicDuel = (duel: DuelRecord, viewerId: string) => ({
  ...duel,
  questions: duel.questions.map(publicQuestion),
  opponent: duel.inviter.id === viewerId ? duel.invitee : duel.inviter,
  you: duel.inviter.id === viewerId ? duel.inviter : duel.invitee,
  yourAttempt: duel.answers[viewerId] ?? null,
  scores: { [duel.inviter.id]: duel.answers[duel.inviter.id]?.score ?? null, [duel.invitee.id]: duel.answers[duel.invitee.id]?.score ?? null },
  answers: undefined,
});
const notify = async (userId: string, type: string, title: string, message: string, duelId: string) => {
  const id = `${type}-${duelId}`;
  await notificationsStore().setJSON(`${userId}/${id}`, { id, userId, type, title, message, bugId: duelId, xpAwarded: 0, createdAt: new Date().toISOString(), readAt: null }, { onlyIfNew: true });
};
const removeInviteNotification = (userId: string, duelId: string) =>
  notificationsStore().delete(`${userId}/duel-invite-${duelId}`);
const subjectQuestions = (subject: SubjectId) => {
  const allowed = new Set(dashboardMeta.topics.filter((topic) => topic.subject === subject).map((topic) => topic.title));
  const pool = questions.filter((question) => allowed.has(question.topic));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return uniqueQuestions(shuffled, TOTAL_QUESTIONS);
};
const normalizeText = (value: string) => value.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/giu, "");
const isCorrect = (question: DuelQuestion, answer: unknown) => {
  if (answer === "__timeout__" || answer === "__skipped__" || answer === undefined || answer === null) return false;
  if (["single", "scenario", "imageChoice"].includes(question.type)) return String(answer) === String(question.correct);
  if (question.type === "trueFalse") return answer === question.correct;
  if (question.type === "multiple") {
    const expected = Array.isArray(question.correct) ? question.correct.map(String).sort() : [];
    const actual = Array.isArray(answer) ? answer.map(String).sort() : [];
    return expected.length === actual.length && expected.every((item, index) => item === actual[index]);
  }
  if (question.type === "fill") {
    const correct = question.correct as { answer: string; acceptable?: string[] };
    return [correct.answer, ...(correct.acceptable ?? [])].map(normalizeText).includes(normalizeText(String(answer)));
  }
  if (question.type === "matching") {
    const expected = (question.correct as Array<{ left: string; right: string }>).map((pair) => `${pair.left}::${pair.right}`).sort();
    const actual = Array.isArray(answer) ? answer.map((pair) => `${String((pair as { left?: string }).left ?? "")}::${String((pair as { right?: string }).right ?? "")}`).sort() : [];
    return expected.length === actual.length && expected.every((item, index) => item === actual[index]);
  }
  if (question.type === "sequence") {
    const expected = (question.correct as { correctOrder: string[] }).correctOrder.map(normalizeText);
    const actual = Array.isArray(answer) ? answer.map((item) => normalizeText(String(item))) : [];
    return expected.length === actual.length && expected.every((item, index) => item === actual[index]);
  }
  return false;
};

const listDuels = async () => {
  const store = duelStore();
  const { blobs } = await store.list();
  const values = await Promise.all(blobs.map((blob) => store.get(blob.key, { type: "json", consistency: "strong" })));
  return values.filter((value): value is DuelRecord => Boolean(value && typeof value === "object"));
};
const getDuel = (id: string) => duelStore().get(id, { type: "json", consistency: "strong" }) as Promise<DuelRecord | null>;
const saveDuel = (duel: DuelRecord) => duelStore().setJSON(duel.id, duel);
const updateDuel = async (id: string, updater: (current: DuelRecord) => DuelRecord) => {
  const store = duelStore();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const stored = await store.getWithMetadata(id, { type: "json", consistency: "strong" });
    if (!stored?.etag || !stored.data) return null;
    const current = stored.data as DuelRecord;
    const updated = updater(current);
    if (updated === current) return current;
    const result = await store.setJSON(id, updated, { onlyIfMatch: stored.etag });
    if (result.modified) return updated;
  }
  return getDuel(id);
};

const expirePending = async (duel: DuelRecord) => {
  if (duel.status !== "pending") return duel;
  const inviter = await leaderboardStore().get(duel.inviter.id, { type: "json", consistency: "strong" }) as LeaderboardEntry | null;
  if (Date.now() < Date.parse(duel.expiresAt) && isOnline(inviter)) return duel;
  const updated = await updateDuel(duel.id, (current) => current.status === "pending"
    ? { ...current, status: "cancelled", cancelReason: "Приглашение отменено: приглашающий вышел или срок ожидания истёк." }
    : current) ?? duel;
  if (updated.status === "cancelled") await removeInviteNotification(updated.invitee.id, updated.id);
  return updated;
};

const awardXp = async (userId: string, duelId: string, amount: number) => {
  if (amount <= 0) return;
  const store = leaderboardStore();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const stored = await store.getWithMetadata(userId, { type: "json", consistency: "strong" });
    if (!stored?.etag || !stored.data) return;
    const current = stored.data as LeaderboardEntry;
    const rewarded = Array.isArray(current.rewardedDuelIds) ? current.rewardedDuelIds : [];
    if (rewarded.includes(duelId)) return;
    const xp = Math.max(0, Number(current.xp) || 0) + amount;
    const updated = { ...current, xp, level: Math.floor(xp / 250) + 1, rewardedDuelIds: [...rewarded, duelId].slice(-500) };
    const result = await store.setJSON(userId, updated, { onlyIfMatch: stored.etag });
    if (result.modified) return;
  }
};

const applyRewards = async (duel: DuelRecord) => {
  if (duel.rewardsApplied || duel.status !== "finished") return duel;
  const store = duelStore();
  const stored = await store.getWithMetadata(duel.id, { type: "json", consistency: "strong" });
  if (!stored?.etag || !stored.data) return duel;
  const current = stored.data as DuelRecord;
  if (current.rewardsApplied) return current;
  const claimed = { ...current, rewardsApplied: true };
  const result = await store.setJSON(duel.id, claimed, { onlyIfMatch: stored.etag });
  if (!result.modified) return (await getDuel(duel.id)) ?? duel;
  await Promise.all(Object.entries(duel.rewardXp).map(([userId, amount]) => awardXp(userId, duel.id, amount)));
  const winnerName = duel.winnerId === duel.inviter.id ? duel.inviter.name : duel.winnerId === duel.invitee.id ? duel.invitee.name : "Никто";
  await Promise.all([
    notify(duel.inviter.id, "duel-finished", "Игра 1 на 1 завершена", duel.result === "draw" ? "Ничья. Награда не начислена." : `${winnerName} победил. Ваша награда: +${duel.rewardXp[duel.inviter.id] ?? 0} XP.`, duel.id),
    notify(duel.invitee.id, "duel-finished", "Игра 1 на 1 завершена", duel.result === "draw" ? "Ничья. Награда не начислена." : `${winnerName} победил. Ваша награда: +${duel.rewardXp[duel.invitee.id] ?? 0} XP.`, duel.id),
  ]);
  return claimed;
};

const finishIfReady = async (duel: DuelRecord) => {
  if (duel.status !== "active") return duel;
  const finished = await updateDuel(duel.id, (current) => {
    if (current.status !== "active") return current;
    const left = Object.values(current.answers).some((attempt) => Boolean(attempt.leftAt));
    const bothSubmitted = Boolean(current.answers[current.inviter.id]?.submittedAt && current.answers[current.invitee.id]?.submittedAt);
    const expired = Date.now() >= Date.parse(current.startedAt ?? current.createdAt) + MATCH_DURATION_MS;
    const leftPlayerId = current.answers[current.inviter.id]?.leftAt ? current.inviter.id : current.answers[current.invitee.id]?.leftAt ? current.invitee.id : null;
    const remainingPlayerId = leftPlayerId ? leftPlayerId === current.inviter.id ? current.invitee.id : current.inviter.id : null;
    const remainingComplete = remainingPlayerId ? Boolean(current.answers[remainingPlayerId]?.complete) : false;
    if (left && !remainingComplete && !expired) return current;
    if (!left && !bothSubmitted && !expired) return current;
    const inviterAttempt = current.answers[current.inviter.id] ?? { answers: [], score: 0, submittedAt: null, complete: false };
    const inviteeAttempt = current.answers[current.invitee.id] ?? { answers: [], score: 0, submittedAt: null, complete: false };
    const inviterComplete = inviterAttempt.complete && !inviterAttempt.leftAt;
    const inviteeComplete = inviteeAttempt.complete && !inviteeAttempt.leftAt;
    let winnerId: string | null = null;
    if (inviterComplete && !inviteeComplete) winnerId = current.inviter.id;
    else if (inviteeComplete && !inviterComplete) winnerId = current.invitee.id;
    else if (inviterComplete && inviteeComplete && inviterAttempt.score !== inviteeAttempt.score) winnerId = inviterAttempt.score > inviteeAttempt.score ? current.inviter.id : current.invitee.id;
    const loserId = winnerId ? winnerId === current.inviter.id ? current.invitee.id : current.inviter.id : null;
    const rewardXp: Record<string, number> = {};
    if (winnerId) rewardXp[winnerId] = 150;
    const loserAttempt = loserId === current.inviter.id ? inviterAttempt : loserId === current.invitee.id ? inviteeAttempt : null;
    if (loserId && loserAttempt?.complete && loserAttempt.score > TOTAL_QUESTIONS / 2) rewardXp[loserId] = 50;
    return {
      ...current,
      status: "finished",
      finishedAt: new Date().toISOString(),
      winnerId,
      result: winnerId ? "win" : "draw",
      rewardXp,
      rewardsApplied: false,
      answers: { [current.inviter.id]: inviterAttempt, [current.invitee.id]: inviteeAttempt },
    };
  });
  return finished ? applyRewards(finished) : duel;
};

export default async (request: Request) => {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) return jsonError("Войдите в аккаунт заново", 401);
    const url = new URL(request.url);
    const action = String(url.searchParams.get("action") ?? "");

    if (request.method === "GET") {
      if (action === "state") {
        const duel = await getDuel(String(url.searchParams.get("id") ?? ""));
        if (!duel || (duel.inviter.id !== userId && duel.invitee.id !== userId)) return jsonError("Игра не найдена", 404);
        const current = await applyRewards(await finishIfReady(await expirePending(duel)));
        return Response.json(publicDuel(current, userId));
      }
      const all = await listDuels();
      const visible = [] as DuelRecord[];
      for (const duel of all) {
        if (duel.inviter.id !== userId && duel.invitee.id !== userId) continue;
        const current = await applyRewards(await finishIfReady(await expirePending(duel)));
        if (["pending", "active", "finished", "cancelled", "declined"].includes(current.status)) visible.push(current);
      }
      return Response.json(visible.sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, 30).map((duel) => publicDuel(duel, userId)));
    }

    const payload = await request.json() as Record<string, unknown>;
    if (request.method === "POST" && payload.action === "invite") {
      const opponentId = cleanId(payload.opponentId);
      if (!opponentId || opponentId === userId) return jsonError("Выберите другого игрока", 400);
      const subject: SubjectId = payload.subject === "management" || payload.subject === "economics" ? payload.subject : "it-design";
      const [inviter, invitee, storedOpponent] = await Promise.all([getPlayer(userId), getPlayer(opponentId), leaderboardStore().get(opponentId, { type: "json", consistency: "strong" }) as Promise<LeaderboardEntry | null>]);
      if (!inviter || !invitee || !isOnline(storedOpponent)) return jsonError("Игрок сейчас не в сети", 409);
      const existing = (await listDuels()).find((candidate) =>
        ["pending", "active"].includes(candidate.status)
        && (candidate.inviter.id === userId || candidate.invitee.id === userId || candidate.inviter.id === opponentId || candidate.invitee.id === opponentId));
      if (existing) return jsonError("У одного из игроков уже есть ожидающее приглашение или активная игра", 409);
      const now = new Date();
      const duel: DuelRecord = {
        id: crypto.randomUUID(), inviter, invitee, subject, questions: subjectQuestions(subject), status: "pending",
        createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + INVITE_DURATION_MS).toISOString(), startedAt: null, finishedAt: null,
        winnerId: null, result: null, cancelReason: null, answers: {}, rewardXp: {}, rewardsApplied: false,
      };
      await saveDuel(duel);
      const subjectLabel = subject === "management" ? "менеджменту" : subject === "economics" ? "экономике" : "ИТ и графике";
      await notify(opponentId, "duel-invite", "Вас пригласили в игру 1 на 1", `${inviter.name} предлагает сыграть 10 вопросов по ${subjectLabel}.`, duel.id);
      return Response.json(publicDuel(duel, userId), { status: 201 });
    }

    const duelId = String(payload.id ?? "");
    const duel = await getDuel(duelId);
    if (!duel || (duel.inviter.id !== userId && duel.invitee.id !== userId)) return jsonError("Игра не найдена", 404);
    if (request.method === "POST" && payload.action === "accept") {
      const pending = await expirePending(duel);
      if (pending.invitee.id !== userId || pending.status !== "pending") return jsonError("Приглашение уже недоступно", 409);
      const activeElsewhere = (await listDuels()).some((candidate) => candidate.status === "active" && candidate.id !== duel.id && (candidate.inviter.id === userId || candidate.invitee.id === userId));
      if (activeElsewhere) return jsonError("Сначала завершите текущую игру 1 на 1", 409);
      const now = new Date().toISOString();
      const active = await updateDuel(duel.id, (current) => current.status === "pending" && current.invitee.id === userId
        ? { ...current, status: "active", startedAt: now, expiresAt: new Date(Date.now() + MATCH_DURATION_MS).toISOString() }
        : current);
      if (!active || active.status !== "active") return jsonError("Приглашение уже недоступно", 409);
      await removeInviteNotification(active.invitee.id, active.id);
      return Response.json(publicDuel(active, userId));
    }
    if (request.method === "POST" && payload.action === "decline") {
      if (duel.invitee.id !== userId || duel.status !== "pending") return jsonError("Приглашение уже недоступно", 409);
      const declined = await updateDuel(duel.id, (current) => current.status === "pending" && current.invitee.id === userId
        ? { ...current, status: "declined", cancelReason: `${current.invitee.name} отклонил приглашение.` }
        : current);
      if (!declined || declined.status !== "declined") return jsonError("Приглашение уже недоступно", 409);
      await removeInviteNotification(duel.invitee.id, duel.id);
      return Response.json(publicDuel(declined, userId));
    }
    if (request.method === "POST" && payload.action === "cancel") {
      if (duel.inviter.id !== userId || duel.status !== "pending") return jsonError("Приглашение уже недоступно", 409);
      const cancelled = await updateDuel(duel.id, (current) => current.status === "pending" && current.inviter.id === userId
        ? { ...current, status: "cancelled", cancelReason: "Приглашающий вышел до начала игры." }
        : current);
      if (!cancelled || cancelled.status !== "cancelled") return jsonError("Приглашение уже недоступно", 409);
      await removeInviteNotification(duel.invitee.id, duel.id);
      return Response.json(publicDuel(cancelled, userId));
    }
    if (request.method === "POST" && payload.action === "leave") {
      if (duel.status !== "active") return Response.json(publicDuel(duel, userId));
      const leftAt = new Date().toISOString();
      const left = await updateDuel(duel.id, (current) => current.status === "active"
        ? { ...current, answers: { ...current.answers, [userId]: { answers: [], score: 0, submittedAt: leftAt, complete: false, leftAt } } }
        : current);
      if (!left) return jsonError("Игра не найдена", 404);
      const opponentId = duel.inviter.id === userId ? duel.invitee.id : duel.inviter.id;
      await notify(opponentId, "duel-opponent-left", "Соперник вышел", "Соперник покинул игру. Ответьте на все 10 вопросов, чтобы получить +150 XP.", duel.id);
      return Response.json(publicDuel(await finishIfReady(left), userId));
    }
    if (request.method === "POST" && payload.action === "submit") {
      if (duel.status !== "active") return jsonError("Игра уже завершена", 409);
      const submitted = Array.isArray(payload.answers) ? payload.answers as DuelAnswer[] : [];
      const submittedAt = new Date().toISOString();
      const updated = await updateDuel(duel.id, (current) => {
        if (current.status !== "active") return current;
        const safeAnswers = current.questions.map((question) => submitted.find((answer) => answer.questionId === question.id) ?? { questionId: question.id, answer: "__timeout__" });
        const score = safeAnswers.reduce((total, answer) => total + (isCorrect(current.questions.find((question) => question.id === answer.questionId)!, answer.answer) ? 1 : 0), 0);
        return { ...current, answers: { ...current.answers, [userId]: { answers: safeAnswers, score, submittedAt, complete: safeAnswers.length === TOTAL_QUESTIONS } } };
      });
      if (!updated || updated.status !== "active") return jsonError("Игра уже завершена", 409);
      return Response.json(publicDuel(await finishIfReady(updated), userId));
    }
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST" } });
  } catch (error) {
    console.error("Duels function failed", error);
    return jsonError("Не удалось обработать игру 1 на 1", 500);
  }
};
