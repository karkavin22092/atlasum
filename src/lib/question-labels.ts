import type { Difficulty, QuestionType } from "@shared/types";

export const difficultyLabels: Record<Difficulty, string> = {
  easy: "Лёгкий",
  medium: "Средний",
  hard: "Сложный",
};

export const questionTypeLabels: Record<QuestionType, string> = {
  single: "Один ответ",
  multiple: "Несколько ответов",
  trueFalse: "Верно или неверно",
  matching: "Соответствие",
  sequence: "Последовательность",
  fill: "Ввод ответа",
  imageChoice: "Выбор по изображению",
  scenario: "Ситуационная задача",
};
