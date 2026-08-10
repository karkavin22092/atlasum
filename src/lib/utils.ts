import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const pluralizeRu = (count: number, one: string, few: string, many: string) => {
  const absolute = Math.abs(count);
  const mod100 = absolute % 100;
  const mod10 = absolute % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
};

export const countLabel = (count: number, one: string, few: string, many: string) =>
  `${count} ${pluralizeRu(count, one, few, many)}`;

export const shuffleArray = <T,>(items: T[], seed = Date.now().toString()) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const random = () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const formatDuration = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export const formatXp = (xp: number) => {
  const value = Math.max(0, xp);
  if (value < 1_000) return String(value);
  const compact = Math.floor((value / 1_000) * 10) / 10;
  return `${Number.isInteger(compact) ? compact.toFixed(0) : compact.toFixed(1)}k`;
};

export const dateKey = (value = new Date()) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Novosibirsk" }).format(value);

export const MAX_LEVEL = 30;

const levelTitles = [
  "Новичок",
  "Любопытный",
  "Стажёр",
  "Практик",
  "Искатель",
  "Потничок",
  "Умница",
  "Знаток",
  "Шустрик",
  "Крутой чел",
  "Упорный",
  "Тактик",
  "Собранный",
  "Достигатор",
  "Мозговитый",
  "Уверенный",
  "Закалённый",
  "Кремень",
  "Мастер",
  "Навигатор",
  "Эксперт",
  "Наставник",
  "Профи",
  "Гуру",
  "Титан знаний",
  "Легенда практики",
  "Архитектор знаний",
  "Хранитель курса",
  "Абсолют",
  "Атласум",
] as const;

/** XP for the transition from this level to the next one. */
export const xpRequiredForNextLevel = (level: number) => {
  const currentLevel = Math.max(1, Math.floor(level));
  if (currentLevel === 1) return 250;
  if (currentLevel === 2) return 500;
  return 800 + (currentLevel - 3) * 300;
};

/** Total XP required to reach the start of a level. */
export const xpToReachLevel = (level: number) => {
  const targetLevel = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
  let requiredXp = 0;
  for (let currentLevel = 1; currentLevel < targetLevel; currentLevel += 1) {
    requiredXp += xpRequiredForNextLevel(currentLevel);
  }
  return requiredXp;
};

export const levelFromXp = (xp: number) => {
  const safeXp = Math.max(0, xp);
  let level = 1;
  while (level < MAX_LEVEL && safeXp >= xpToReachLevel(level + 1)) level += 1;
  return level;
};

export const levelLabel = (level: number) => levelTitles[Math.min(
  levelTitles.length - 1,
  Math.max(0, Math.floor(level) - 1),
)];
