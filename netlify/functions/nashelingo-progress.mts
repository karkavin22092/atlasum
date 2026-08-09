import { getStore } from "@netlify/blobs";

type SubjectId = "it-design" | "management" | "economics" | "english";

type TheoryProgress = {
  subject: SubjectId;
  topic: string;
  completedAt: string;
};

type LevelProgress = TheoryProgress & {
  level: number;
  correctCount: number;
};

type ProgressSnapshot = {
  theoryProgress: TheoryProgress[];
  levelProgress: LevelProgress[];
};

type Session = {
  userId?: string;
  expiresAt?: string;
};

const progressStore = () => getStore({ name: "design-tests-nashelingo-progress", consistency: "strong" });
const sessionsStore = () => getStore({ name: "design-tests-auth-sessions", consistency: "strong" });
const subjects = new Set<SubjectId>(["it-design", "management", "economics", "english"]);

const hashHex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const cleanDate = (value: unknown) => {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
};

const cleanTheory = (value: unknown): TheoryProgress | null => {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<TheoryProgress>;
  const subject = String(item.subject ?? "") as SubjectId;
  const topic = String(item.topic ?? "").trim().slice(0, 180);
  return subjects.has(subject) && topic ? { subject, topic, completedAt: cleanDate(item.completedAt) } : null;
};

const cleanLevel = (value: unknown): LevelProgress | null => {
  const theory = cleanTheory(value);
  if (!theory || !value || typeof value !== "object") return null;
  const item = value as Partial<LevelProgress>;
  const level = Number(item.level);
  const correctCount = Number(item.correctCount);
  if (!Number.isInteger(level) || level < 0 || level > 4 || !Number.isFinite(correctCount)) return null;
  return { ...theory, level, correctCount: Math.max(0, Math.min(6, Math.round(correctCount))) };
};

const cleanSnapshot = (value: unknown): ProgressSnapshot => {
  const payload = value && typeof value === "object" ? value as Partial<ProgressSnapshot> : {};
  return {
    theoryProgress: (Array.isArray(payload.theoryProgress) ? payload.theoryProgress : []).map(cleanTheory).filter((item): item is TheoryProgress => Boolean(item)),
    levelProgress: (Array.isArray(payload.levelProgress) ? payload.levelProgress : []).map(cleanLevel).filter((item): item is LevelProgress => Boolean(item)),
  };
};

const mergeSnapshot = (current: ProgressSnapshot, incoming: ProgressSnapshot): ProgressSnapshot => {
  const theories = new Map<string, TheoryProgress>();
  [...current.theoryProgress, ...incoming.theoryProgress].forEach((item) => {
    const key = `${item.subject}:${item.topic}`;
    const old = theories.get(key);
    if (!old || item.completedAt < old.completedAt) theories.set(key, item);
  });

  const levels = new Map<string, LevelProgress>();
  [...current.levelProgress, ...incoming.levelProgress].forEach((item) => {
    const key = `${item.subject}:${item.topic}:${item.level}`;
    const old = levels.get(key);
    if (!old || item.correctCount > old.correctCount || (item.correctCount === old.correctCount && item.completedAt > old.completedAt)) levels.set(key, item);
  });

  return { theoryProgress: [...theories.values()], levelProgress: [...levels.values()] };
};

const authenticatedUserId = async (request: Request) => {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/iu, "").trim() ?? "";
  if (!token) return "";
  const session = await sessionsStore().get(await hashHex(token), { type: "json", consistency: "strong" }) as Session | null;
  return session?.userId && session.expiresAt && Date.parse(session.expiresAt) > Date.now() ? session.userId : "";
};

export default async (request: Request) => {
  try {
    const userId = await authenticatedUserId(request);
    if (!userId) return Response.json({ error: "Сессия не найдена" }, { status: 401 });
    const stored = cleanSnapshot(await progressStore().get(userId, { type: "json", consistency: "strong" }));
    if (request.method === "GET") return Response.json(stored);
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST" } });

    const merged = mergeSnapshot(stored, cleanSnapshot(await request.json()));
    await progressStore().setJSON(userId, merged);
    return Response.json(merged);
  } catch (error) {
    console.error("Nashelingo progress function failed", error);
    return Response.json({ error: "Не удалось синхронизировать прогресс" }, { status: 500 });
  }
};
