import { getStore } from "@netlify/blobs";

type LeaderboardEntry = {
  id: string;
  name: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  streak: number;
  bestStreak: number;
  attempts: number;
  accuracy: number;
  lastActiveAt: string | null;
  lastSeenAt: string | null;
  rewardedBugIds: string[];
};

const store = () => getStore({ name: "design-tests-leaderboard", consistency: "strong" });
const usersStore = () => getStore({ name: "design-tests-auth-users", consistency: "strong" });
const DELETED_USER_IDS = new Set(["test"]);
const MAX_LEVEL = 30;

const xpRequiredForNextLevel = (level: number) => {
  if (level === 1) return 250;
  if (level === 2) return 500;
  return 800 + (Math.max(3, level) - 3) * 300;
};

const levelFromXp = (xp: number) => {
  const safeXp = Math.max(0, xp);
  let level = 1;
  let requiredXp = 0;
  while (level < MAX_LEVEL) {
    requiredXp += xpRequiredForNextLevel(level);
    if (safeXp < requiredXp) break;
    level += 1;
  }
  return level;
};

const purgeDeletedAccounts = async () => {
  const leaderboard = store();
  await Promise.all([...DELETED_USER_IDS].map((userId) => leaderboard.delete(userId)));

  const maintenance = getStore({ name: "design-tests-maintenance", consistency: "strong" });
  const markerKey = "purged-test-account-v1";
  if (await maintenance.get(markerKey, { consistency: "strong" })) return;

  const messages = getStore({ name: "design-tests-messages", consistency: "strong" });
  const inbox = getStore({ name: "design-tests-message-inbox", consistency: "strong" });
  const [messageList, inboxList] = await Promise.all([messages.list(), inbox.list()]);
  const messageValues = await Promise.all(messageList.blobs.map(async (blob) => ({
    key: blob.key,
    value: await messages.get(blob.key, { type: "json", consistency: "strong" }) as { senderId?: string; recipientId?: string } | null,
  })));
  const inboxValues = await Promise.all(inboxList.blobs.map(async (blob) => ({
    key: blob.key,
    value: await inbox.get(blob.key, { type: "json", consistency: "strong" }) as { senderId?: string; recipientId?: string } | null,
  })));
  const belongsToDeletedUser = (value: { senderId?: string; recipientId?: string } | null) =>
    Boolean(value && (DELETED_USER_IDS.has(value.senderId ?? "") || DELETED_USER_IDS.has(value.recipientId ?? "")));
  await Promise.all([
    ...messageValues.filter((item) => belongsToDeletedUser(item.value)).map((item) => messages.delete(item.key)),
    ...inboxValues.filter((item) => belongsToDeletedUser(item.value)).map((item) => inbox.delete(item.key)),
  ]);
  await maintenance.set(markerKey, new Date().toISOString());
};

const cleanNumber = (value: unknown, maximum = 10_000_000) =>
  Math.min(maximum, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0));

const cleanTimestamp = (value: unknown) => {
  const text = String(value ?? "");
  return text && !Number.isNaN(Date.parse(text)) ? new Date(text).toISOString() : null;
};

const cleanAvatar = (value: unknown) => {
  const avatar = typeof value === "string" ? value : "";
  return avatar.startsWith("data:image/") && avatar.length <= 350_000 ? avatar : null;
};

const cleanUserId = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-zа-я0-9-]+/giu, "-").slice(0, 80);

const cleanEntry = (value: Partial<LeaderboardEntry>): LeaderboardEntry | null => {
  const id = String(value.id ?? "").trim().toLowerCase().replace(/[^a-zа-я0-9-]+/giu, "-").slice(0, 80);
  const name = String(value.name ?? "").trim().slice(0, 40);
  if (!id || name.length < 2 || name.toLowerCase() === "гость" || DELETED_USER_IDS.has(id) || DELETED_USER_IDS.has(name.toLowerCase())) return null;
  return {
    id,
    name,
    avatarUrl: cleanAvatar(value.avatarUrl),
    xp: Math.round(cleanNumber(value.xp)),
    level: levelFromXp(cleanNumber(value.xp)),
    streak: Math.round(cleanNumber(value.streak, 100_000)),
    bestStreak: Math.round(cleanNumber(value.bestStreak, 100_000)),
    attempts: Math.round(cleanNumber(value.attempts, 1_000_000)),
    accuracy: Math.round(cleanNumber(value.accuracy, 100) * 10) / 10,
    lastActiveAt: cleanTimestamp(value.lastActiveAt),
    lastSeenAt: cleanTimestamp(value.lastSeenAt),
    rewardedBugIds: Array.isArray(value.rewardedBugIds)
      ? [...new Set(value.rewardedBugIds.map(String).filter(Boolean))].slice(-1000)
      : [],
  };
};

const listUserStates = async () => {
  const users = usersStore();
  const { blobs } = await users.list();
  const values = await Promise.all(blobs.map((blob) => users.get(blob.key, { type: "json", consistency: "strong" }) as Promise<{ id?: string; avatarUrl?: string | null; bannedAt?: string } | null>));
  return new Map(values.filter((user): user is { id: string; avatarUrl?: string | null; bannedAt?: string } => Boolean(user?.id)).map((user) => [cleanUserId(user.id), { avatarUrl: cleanAvatar(user.avatarUrl), banned: Boolean(user.bannedAt) }]));
};

const listEntries = async () => {
  const leaderboard = store();
  const [{ blobs }, users] = await Promise.all([leaderboard.list(), listUserStates()]);
  const entries = await Promise.all(blobs.map((blob) => leaderboard.get(blob.key, { type: "json", consistency: "strong" })));
  return entries
    .map((entry) => cleanEntry((entry ?? {}) as Partial<LeaderboardEntry>))
    .filter((entry): entry is LeaderboardEntry => Boolean(entry))
    .filter((entry) => !users.get(entry.id)?.banned)
    .map((entry) => ({ ...entry, avatarUrl: users.get(entry.id)?.avatarUrl ?? entry.avatarUrl ?? null }))
    .sort((left, right) => right.xp - left.xp || left.name.localeCompare(right.name, "ru"))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
};

export default async (request: Request) => {
  try {
    await purgeDeletedAccounts();
    if (request.method === "POST") {
      const payload = await request.json() as Partial<LeaderboardEntry> | { entries?: Partial<LeaderboardEntry>[] };
      const source: Partial<LeaderboardEntry>[] = "entries" in payload && Array.isArray(payload.entries)
        ? payload.entries
        : [payload as Partial<LeaderboardEntry>];
      const entries = source.map(cleanEntry).filter((entry): entry is LeaderboardEntry => Boolean(entry));
      if (!entries.length) return Response.json({ error: "Некорректный профиль" }, { status: 400 });
      const leaderboard = store();
      await Promise.all(entries.map(async (entry) => {
        const stored = await leaderboard.get(entry.id, { type: "json", consistency: "strong" }) as Partial<LeaderboardEntry> | null;
        const current = stored ? cleanEntry(stored) : null;
        const incomingHasNewerProgress = !current || entry.xp >= current.xp;
        const incomingHasMoreAttempts = !current || entry.attempts >= current.attempts;
        const latestActivity = [current?.lastActiveAt, entry.lastActiveAt]
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1) ?? null;
        const merged: LeaderboardEntry = current ? {
          ...entry,
          avatarUrl: entry.avatarUrl ?? current.avatarUrl ?? null,
          xp: Math.max(current.xp, entry.xp),
          level: levelFromXp(Math.max(current.xp, entry.xp)),
          streak: incomingHasNewerProgress ? entry.streak : current.streak,
          bestStreak: Math.max(current.bestStreak, entry.bestStreak),
          attempts: Math.max(current.attempts, entry.attempts),
          accuracy: incomingHasMoreAttempts ? entry.accuracy : current.accuracy,
          lastActiveAt: latestActivity,
          lastSeenAt: entry.lastSeenAt ?? current.lastSeenAt,
          rewardedBugIds: [...new Set([...current.rewardedBugIds, ...entry.rewardedBugIds])].slice(-1000),
        } : entry;
        await leaderboard.setJSON(entry.id, merged);
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
