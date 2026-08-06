import { getStore } from "@netlify/blobs";

type LeaderboardEntry = {
  id: string;
  name: string;
  xp: number;
  level: number;
  streak: number;
  bestStreak: number;
  attempts: number;
  accuracy: number;
  lastActiveAt: string | null;
};

const store = () => getStore({ name: "design-tests-leaderboard", consistency: "strong" });

const cleanNumber = (value: unknown, maximum = 10_000_000) =>
  Math.min(maximum, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0));

const cleanEntry = (value: Partial<LeaderboardEntry>): LeaderboardEntry | null => {
  const id = String(value.id ?? "").trim().toLowerCase().replace(/[^a-zа-я0-9-]+/giu, "-").slice(0, 80);
  const name = String(value.name ?? "").trim().slice(0, 40);
  if (!id || name.length < 2 || name.toLowerCase() === "гость") return null;
  return {
    id,
    name,
    xp: Math.round(cleanNumber(value.xp)),
    level: Math.max(1, Math.round(cleanNumber(value.level, 100_000))),
    streak: Math.round(cleanNumber(value.streak, 100_000)),
    bestStreak: Math.round(cleanNumber(value.bestStreak, 100_000)),
    attempts: Math.round(cleanNumber(value.attempts, 1_000_000)),
    accuracy: Math.round(cleanNumber(value.accuracy, 100) * 10) / 10,
    lastActiveAt: value.lastActiveAt ? String(value.lastActiveAt).slice(0, 40) : null,
  };
};

const listEntries = async () => {
  const leaderboard = store();
  const { blobs } = await leaderboard.list();
  const entries = await Promise.all(blobs.map((blob) => leaderboard.get(blob.key, { type: "json", consistency: "strong" })));
  return entries
    .map((entry) => cleanEntry((entry ?? {}) as Partial<LeaderboardEntry>))
    .filter((entry): entry is LeaderboardEntry => Boolean(entry))
    .sort((left, right) => right.xp - left.xp || left.name.localeCompare(right.name, "ru"))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
};

export default async (request: Request) => {
  try {
    if (request.method === "POST") {
      const payload = await request.json() as Partial<LeaderboardEntry> | { entries?: Partial<LeaderboardEntry>[] };
      const source: Partial<LeaderboardEntry>[] = "entries" in payload && Array.isArray(payload.entries)
        ? payload.entries
        : [payload as Partial<LeaderboardEntry>];
      const entries = source.map(cleanEntry).filter((entry): entry is LeaderboardEntry => Boolean(entry));
      if (!entries.length) return Response.json({ error: "Некорректный профиль" }, { status: 400 });
      const leaderboard = store();
      await Promise.all(entries.map(async (entry) => {
        const current = await leaderboard.get(entry.id, { type: "json", consistency: "strong" }) as LeaderboardEntry | null;
        await leaderboard.setJSON(entry.id, entry);
      }));
      return Response.json(await listEntries());
    }
    if (request.method === "GET") return Response.json(await listEntries());
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST" } });
  } catch (error) {
    console.error("Leaderboard function failed", error);
    return Response.json({ error: "Не удалось загрузить общий рейтинг" }, { status: 500 });
  }
};
