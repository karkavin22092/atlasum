import type { FillQuestion, Question } from "./types.js";

const SERVICE_METADATA = /\s*Раздел\s+«[^»]+»\s*,?\s*вариант\s+\d+\.?\s*$/iu;

export const hasLegacyQuestionMetadata = (text: string) => SERVICE_METADATA.test(text);

const cleanFillPrompt = (text: string, answer: string) => {
  const oldPrompt = text.match(/^Заполните\s+пропуск:\s*«[^»]+»\s*[—-]\s*это\s+(.+?)\.?$/iu);
  if (!oldPrompt) return text;
  const definition = oldPrompt[1].trim().replace(/[.!?]+$/u, "");
  if (!definition || !answer) return text;
  return `Какой термин соответствует определению: «${definition}»?`;
};

export const sanitizeQuestionText = (question: Question): Question => {
  let text = question.question.trim().replace(SERVICE_METADATA, "").trim();
  if (question.type === "fill") {
    text = cleanFillPrompt(text, (question.correct as FillQuestion).answer);
  }
  return text === question.question ? question : { ...question, question: text };
};
