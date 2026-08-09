import type { NashelingoLevelProgress, NashelingoTheoryProgress } from "@shared/types";

type StoredSessionUser = {
  id: string;
  authToken?: string;
};

export type NashelingoProgressSnapshot = {
  theoryProgress: NashelingoTheoryProgress[];
  levelProgress: NashelingoLevelProgress[];
};

const USERS_KEY = "design-tests-users-v1";
const SESSION_KEY = "design-tests-session-v1";

const emptySnapshot = (): NashelingoProgressSnapshot => ({ theoryProgress: [], levelProgress: [] });

const activeAuthToken = () => {
  if (typeof window === "undefined") return "";
  try {
    const activeId = window.localStorage.getItem(SESSION_KEY);
    const users = JSON.parse(window.localStorage.getItem(USERS_KEY) ?? "[]") as StoredSessionUser[];
    return users.find((user) => user.id === activeId)?.authToken ?? "";
  } catch {
    return "";
  }
};

const mergeByKey = <T extends { completedAt: string }>(
  values: T[],
  keyOf: (value: T) => string,
  pick: (current: T, incoming: T) => T,
) => Array.from(values.reduce((items, value) => {
  const key = keyOf(value);
  const current = items.get(key);
  items.set(key, current ? pick(current, value) : value);
  return items;
}, new Map<string, T>()).values());

export const mergeNashelingoProgress = (...snapshots: NashelingoProgressSnapshot[]): NashelingoProgressSnapshot => ({
  theoryProgress: mergeByKey(
    snapshots.flatMap((snapshot) => snapshot.theoryProgress),
    (item) => `${item.subject}:${item.topic}`,
    (current, incoming) => current.completedAt <= incoming.completedAt ? current : incoming,
  ),
  levelProgress: mergeByKey(
    snapshots.flatMap((snapshot) => snapshot.levelProgress),
    (item) => `${item.subject}:${item.topic}:${item.level}`,
    (current, incoming) => incoming.correctCount > current.correctCount
      || (incoming.correctCount === current.correctCount && incoming.completedAt > current.completedAt)
      ? incoming
      : current,
  ),
});

export const syncNashelingoProgress = async (snapshot: NashelingoProgressSnapshot) => {
  if (!import.meta.env.PROD) return null;
  const authToken = activeAuthToken();
  if (!authToken) return null;

  try {
    const response = await fetch("/.netlify/functions/nashelingo-progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(snapshot),
    });
    if (!response.ok) return null;
    return await response.json() as NashelingoProgressSnapshot;
  } catch {
    return null;
  }
};

export const emptyNashelingoProgress = emptySnapshot;
