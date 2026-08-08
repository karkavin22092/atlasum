import type { SubjectId } from "@shared/types";

const timelineDescriptions: Record<SubjectId, string> = {
  "it-design": "Соберите этапы жизненного цикла ИС.",
  management: "Расставьте этапы управленческого процесса.",
  economics: "Восстановите последовательность экономического процесса.",
  english: "Расставьте фразы или этапы задания в верном порядке.",
};

export const gameDescription = (gameKey: string, subject: SubjectId, fallback: string) =>
  gameKey === "timeline" ? timelineDescriptions[subject] : fallback;
