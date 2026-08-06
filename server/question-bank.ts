import { topicCatalog } from "./content";
import type {
  Difficulty,
  FillQuestion,
  MatchingItem,
  Question,
  QuestionOption,
  QuestionType,
  SequenceQuestion,
} from "@shared/types";

const DIFFICULTY_CYCLE: Difficulty[] = [
  "easy",
  "easy",
  "easy",
  "medium",
  "medium",
  "medium",
  "medium",
  "medium",
  "hard",
  "hard",
];

const QUESTION_TYPE_CYCLE: QuestionType[] = [
  "single",
  "multiple",
  "trueFalse",
  "fill",
  "scenario",
  "matching",
  "sequence",
  "imageChoice",
  "single",
  "multiple",
  "trueFalse",
  "scenario",
];

const IMAGE_POOL = [
  "/assets/icon-info.svg",
  "/assets/icon-lock.svg",
  "/assets/icon-database.svg",
  "/assets/icon-network.svg",
  "/assets/icon-code.svg",
  "/assets/icon-palette.svg",
  "/assets/icon-vector.svg",
  "/assets/icon-grid.svg",
];

const hashSeed = (value: string) => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const createRandom = (seed: string) => mulberry32(hashSeed(seed));

export const shuffle = <T,>(items: T[], seed: string) => {
  const random = createRandom(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/giu, "-")
    .replace(/^-+|-+$/g, "");

const unique = <T,>(values: T[]) => Array.from(new Set(values));

const sentenceCase = (value: string) => value[0].toUpperCase() + value.slice(1);

const pick = <T,>(values: T[], seed: string) => values[Math.floor(createRandom(seed)() * values.length)];

const pickMany = <T,>(values: T[], count: number, seed: string) =>
  shuffle(values, seed).slice(0, Math.min(count, values.length));

const buildOptions = (
  correctText: string,
  distractors: string[],
  seed: string,
  count = 4,
) => {
  const options = unique([correctText, ...pickMany(distractors, count - 1, seed)]).slice(0, count);
  return shuffle(
    options.map((text, index) => ({
      id: `opt-${index + 1}`,
      text,
      isCorrect: text === correctText,
    })),
    `${seed}:options`,
  );
};

const pickVisual = (topicKey: string, conceptKey: string, seed: string) => {
  const index = hashSeed(`${topicKey}:${conceptKey}:${seed}`) % IMAGE_POOL.length;
  return IMAGE_POOL[index];
};

const buildMatching = (topicKey: string, seed: string, termDefs: Array<{ term: string; definition: string }>) => {
  const left = shuffle(termDefs.map((item) => item.term), `${seed}:left`);
  const right = shuffle(termDefs.map((item) => item.definition), `${seed}:right`);
  const correct: MatchingItem[] = termDefs.map((item) => ({ left: item.term, right: item.definition }));
  return {
    options: left.map((text, index) => ({
      id: `left-${index + 1}`,
      text,
    })) as QuestionOption[],
    meta: { left, right },
    correct,
  };
};

const buildSequence = (steps: string[], seed: string) => {
  const shuffledSteps = shuffle(steps, `${seed}:sequence`);
  return {
    options: shuffledSteps.map((text, index) => ({
      id: `step-${index + 1}`,
      text,
    })) as QuestionOption[],
    correct: {
      items: shuffledSteps,
      correctOrder: steps,
    } satisfies SequenceQuestion,
  };
};

const buildFill = (prompt: string, answer: string, seed: string, distractors: string[]) => {
  const fill = {
    prompt,
    answer,
    acceptable: unique([answer, ...distractors.slice(0, 2)]),
  } satisfies FillQuestion;

  const options = shuffle(
    unique([answer, ...distractors]).map((text, index) => ({
      id: `fill-${index + 1}`,
      text,
    })),
    `${seed}:fill`,
  );
  return { correct: fill, options };
};

export const generateQuestionBank = (): Question[] => {
  const questions: Question[] = [];

  for (const topic of topicCatalog) {
    const concepts = topic.concepts;
    const termPairs = concepts.map((concept) => ({ term: concept.term, definition: concept.definition }));

    for (let index = 0; index < 60; index += 1) {
      const concept = concepts[index % concepts.length];
      const secondary = concepts[(index + 1) % concepts.length];
      const tertiary = concepts[(index + 2) % concepts.length];
      const difficulty = DIFFICULTY_CYCLE[index % DIFFICULTY_CYCLE.length];
      const template = QUESTION_TYPE_CYCLE[index % QUESTION_TYPE_CYCLE.length];
      const serial = String(index + 1).padStart(2, "0");
      const id = `q-${topic.key}-${serial}`;
      const seed = `${topic.key}:${id}`;
      const commonTags = [
        topic.key,
        difficulty,
        template,
        concept.keyword,
        ...concept.term.toLowerCase().split(/\s+/g),
      ];

      let question: Question;

      switch (template) {
        case "single": {
          const options = buildOptions(
            concept.definition,
            [secondary.definition, tertiary.definition, concept.hint, concept.scenario],
            seed,
          );
          question = {
            id,
            topic: topic.title,
            difficulty,
            type: template,
            question: `Что лучше всего описывает термин «${concept.term}»?`,
            options,
            correct: options.find((option) => option.isCorrect)?.id ?? options[0].id,
            explanation: `${concept.term} означает: ${concept.definition}`,
            source: topic.source,
            tags: commonTags,
            meta: { concept: concept.term },
          };
          break;
        }
        case "multiple": {
          const correctTexts = unique([
            concept.definition,
            concept.scenario,
          ]);
          const distractorTexts = unique([
            secondary.definition,
            tertiary.definition,
            concept.hint,
            `Неверно: ${concept.distractors[0]}`,
          ]);
          const options = shuffle(
            [
              ...correctTexts.map((text, idx) => ({
                id: `multi-c-${idx + 1}`,
                text,
                isCorrect: true,
              })),
              ...pickMany(distractorTexts, 2, `${seed}:multi`).map((text, idx) => ({
                id: `multi-w-${idx + 1}`,
                text,
                isCorrect: false,
              })),
            ],
            `${seed}:multi-options`,
          );
          question = {
            id,
            topic: topic.title,
            difficulty,
            type: template,
            question: `Выберите все верные утверждения о понятии «${concept.term}».`,
            options,
            correct: options.filter((option) => option.isCorrect).map((option) => option.id),
            explanation: `${concept.term}: ${concept.definition}. В учебной ситуации подходит и ${concept.scenario}.`,
            source: topic.source,
            tags: commonTags,
            meta: { concept: concept.term, count: 2 },
          };
          break;
        }
        case "trueFalse": {
          const statement = `${concept.term} связано с понятием ${secondary.term}.`;
          const isTrue = index % 2 === 0;
          const options = [
            { id: "true", text: "Верно" },
            { id: "false", text: "Неверно" },
          ];
          question = {
            id,
            topic: topic.title,
            difficulty,
            type: template,
            question: isTrue
              ? `${concept.term} действительно относится к ${topic.title.toLowerCase()}?`
              : `Верно ли, что ${statement}`,
            options,
            correct: isTrue,
            explanation: isTrue
              ? `${concept.term}: ${concept.definition}`
              : `На самом деле ${concept.term} ближе к ${concept.keyword}, а не к ${secondary.term}.`,
            source: topic.source,
            tags: commonTags,
            meta: { concept: concept.term, statement },
          };
          break;
        }
        case "fill": {
          const prompt = `Заполните пропуск: «${concept.term}» — это ${concept.definition.replace(
            concept.term.toLowerCase(),
            "_____",
          )}`;
          const { correct, options } = buildFill(
            prompt,
            concept.term,
            seed,
            [secondary.term, tertiary.term, concept.keyword],
          );
          question = {
            id,
            topic: topic.title,
            difficulty,
            type: template,
            question: prompt,
            options,
            correct,
            explanation: `${concept.term}: ${concept.definition}`,
            source: topic.source,
            tags: commonTags,
            meta: { concept: concept.term },
          };
          break;
        }
        case "scenario": {
          const options = buildOptions(
            concept.term,
            [secondary.term, tertiary.term, concept.keyword, topic.title],
            seed,
          );
          question = {
            id,
            topic: topic.title,
            difficulty,
            type: template,
            question: `Практическая ситуация: ${concept.scenario} Какое понятие описано?`,
            options,
            correct: options.find((option) => option.isCorrect)?.id ?? options[0].id,
            explanation: `${concept.term} подходит лучше всего, потому что ${concept.definition.toLowerCase()}`,
            source: topic.source,
            tags: [...commonTags, "scenario"],
            meta: { concept: concept.term },
          };
          break;
        }
        case "matching": {
          const matchingSet = pickMany(termPairs, Math.min(4, termPairs.length), seed);
          const matching = buildMatching(topic.key, seed, matchingSet);
          question = {
            id,
            topic: topic.title,
            difficulty,
            type: template,
            question: `Соотнесите термины и определения по теме «${topic.title}».`,
            options: matching.options,
            correct: matching.correct,
            explanation: `Пара правильна, если термин соответствует своему определению. В этой теме важно помнить: ${concept.term} — ${concept.definition}`,
            source: topic.source,
            tags: [...commonTags, "matching"],
            meta: { left: matching.meta.left, right: matching.meta.right },
          };
          break;
        }
        case "sequence": {
          const steps = topic.process.slice(0, Math.min(5, topic.process.length));
          const sequence = buildSequence(steps, seed);
          question = {
            id,
            topic: topic.title,
            difficulty,
            type: template,
            question: `Расставьте этапы в правильном порядке для темы «${topic.title}».`,
            options: sequence.options,
            correct: sequence.correct,
            explanation: `Последовательность строится так: ${steps.join(" → ")}.`,
            source: topic.source,
            tags: [...commonTags, "sequence"],
            meta: { steps },
          };
          break;
        }
        case "imageChoice": {
          const correctImage = pickVisual(topic.key, concept.term, seed);
          const distractors = IMAGE_POOL.filter((asset) => asset !== correctImage).slice(0, 3);
          const images = shuffle([correctImage, ...distractors], `${seed}:images`);
          const options = images.map((image, optionIndex) => ({
            id: `img-${optionIndex + 1}`,
            text: topic.title,
            image,
            isCorrect: image === correctImage,
          }));
          question = {
            id,
            topic: topic.title,
            difficulty,
            type: template,
            question: `Выберите изображение, которое лучше всего подходит к понятию «${concept.term}».`,
            options,
            correct: options.find((option) => option.isCorrect)?.id ?? options[0].id,
            explanation: `Для понятия «${concept.term}» наиболее уместен визуальный образ, связанный с темой ${topic.title}.`,
            source: topic.source,
            tags: [...commonTags, "image"],
            media: { kind: "image", src: correctImage, alt: concept.term },
            meta: { concept: concept.term, image: correctImage },
          };
          break;
        }
        default:
          const options = buildOptions(concept.definition, concept.distractors, seed);
          question = {
            id,
            topic: topic.title,
            difficulty,
            type: "single",
            question: `Что означает термин «${concept.term}»?`,
            options,
            correct: options.find((option) => option.isCorrect)?.id ?? options[0].id,
            explanation: `${concept.term}: ${concept.definition}`,
            source: topic.source,
            tags: commonTags,
          };
      }

      questions.push(question);
    }
  }

  return questions;
};

export const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/giu, "")
    .trim();

export const normalizeMultiAnswer = (answer: unknown) => {
  if (Array.isArray(answer)) {
    return answer.map((item) => String(item)).sort();
  }
  if (typeof answer === "string") {
    return answer
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .sort();
  }
  return [];
};

export const evaluateQuestion = (question: Question, answer: unknown) => {
  const whyWrong = (() => {
    if (question.type === "matching") {
      return "Нужно сопоставить каждый термин с точным определением, а не с похожей формулировкой.";
    }
    if (question.type === "sequence") {
      return "Здесь важен порядок этапов. Попробуйте вспомнить процесс по шагам.";
    }
    if (question.type === "fill") {
      return "Проверьте ключевой термин в определении и повторите формулировку.";
    }
    if (question.type === "multiple") {
      return "В этом вопросе может быть несколько верных вариантов, поэтому нужно выбрать все подходящие утверждения.";
    }
    return "Правильный вариант отличается либо по смыслу, либо по конкретному термину.";
  })();

  switch (question.type) {
    case "single":
    case "scenario":
    case "imageChoice": {
      return {
        isCorrect: String(answer) === String(question.correct),
        whyWrong,
      };
    }
    case "trueFalse": {
      return {
        isCorrect: Boolean(answer) === Boolean(question.correct),
        whyWrong,
      };
    }
    case "multiple": {
      const expected = normalizeMultiAnswer(question.correct);
      const received = normalizeMultiAnswer(answer);
      const isCorrect = expected.length === received.length && expected.every((item, index) => item === received[index]);
      return { isCorrect, whyWrong };
    }
    case "fill": {
      const correct = question.correct as FillQuestion;
      const received = normalizeText(String(answer ?? ""));
      const acceptable = [correct.answer, ...(correct.acceptable ?? [])].map(normalizeText);
      return {
        isCorrect: acceptable.includes(received),
        whyWrong,
      };
    }
    case "matching": {
      const received = Array.isArray(answer)
        ? answer
            .map((item) => {
              if (typeof item === "object" && item) {
                const pair = item as { left?: string; right?: string };
                return `${pair.left ?? ""}::${pair.right ?? ""}`;
              }
              return String(item);
            })
            .sort()
        : [];
      const expected = (question.correct as MatchingItem[])
        .map((item) => `${item.left}::${item.right}`)
        .sort();
      return {
        isCorrect: received.length === expected.length && received.every((item, index) => item === expected[index]),
        whyWrong,
      };
    }
    case "sequence": {
      const received = normalizeMultiAnswer(answer);
      const correctOrder = (question.correct as SequenceQuestion).correctOrder.map(normalizeText);
      return {
        isCorrect:
          received.length === correctOrder.length &&
          received.map(normalizeText).every((item, index) => item === correctOrder[index]),
        whyWrong,
      };
    }
    default:
      return {
        isCorrect: false,
        whyWrong,
      };
  }
};

export const getCorrectAnswerPreview = (question: Question) => {
  switch (question.type) {
    case "single":
    case "scenario":
    case "imageChoice":
      return question.options.find((option) => option.id === question.correct)?.text ?? "";
    case "trueFalse":
      return Boolean(question.correct) ? "Верно" : "Неверно";
    case "multiple":
      return question.options.filter((option) => Array.isArray(question.correct) && question.correct.includes(option.id)).map((option) => option.text);
    case "fill":
      return (question.correct as FillQuestion).answer;
    case "matching":
      return (question.correct as MatchingItem[]).map((pair) => `${pair.left} → ${pair.right}`);
    case "sequence":
      return (question.correct as SequenceQuestion).correctOrder;
    default:
      return "";
  }
};

export const buildQuestionBankSummary = () => ({
  total: topicCatalog.length * 60,
  topics: topicCatalog.map((topic) => ({
    key: topic.key,
    title: topic.title,
    questions: 60,
  })),
});

export const topicKeys = topicCatalog.map((topic) => topic.key);

export const getTopicByKey = (topicKey: string) => topicCatalog.find((topic) => topic.key === topicKey);

export const getTopicByTitle = (title: string) => topicCatalog.find((topic) => topic.title === title);
