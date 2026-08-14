import { QUESTION_BANK_TOTAL, questionCountForTopic, topicCatalog, type TopicConcept } from "./content";
import { generateEnglishQuestionBank } from "./english-content";
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
  "single",
  "single",
  "multiple",
  "trueFalse",
  "scenario",
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

const containsAnswerTerm = (text: string, term: string) => {
  const normalizedText = text.toLowerCase().replace(/ё/g, "е");
  const normalizedTerm = term.toLowerCase().replace(/ё/g, "е");
  if (normalizedTerm.length >= 4) return normalizedText.includes(normalizedTerm);
  const escapedTerm = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-zа-я0-9])${escapedTerm}([^a-zа-я0-9]|$)`, "iu").test(normalizedText);
};

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
  const texts = unique([correctText, ...pickMany(distractors, count - 1, seed)]).slice(0, count);
  return shuffle(texts, `${seed}:options`).map((text, index) => ({
      id: `opt-${index + 1}`,
      text,
      isCorrect: text === correctText,
    }));
};

const getCorrectOptionId = (options: QuestionOption[]) => {
  const correctOption = options.find((option) => option.isCorrect);
  if (!correctOption) {
    throw new Error("Не удалось сформировать правильный вариант ответа.");
  }
  return correctOption.id;
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
    acceptable: [answer],
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

const cleanClause = (value: string) =>
  value.trim().replace(/\s+/g, " ").replace(/[.!?]+$/u, "");

const shortExplanation = (first: string, second?: string) =>
  [first, second]
    .filter((part): part is string => Boolean(part?.trim()))
    .slice(0, 2)
    .map((part) => `${cleanClause(part)}.`)
    .join(" ");

const explanationDetail = (concept: TopicConcept, variant: number) => {
  const details = [
    `Пример: ${cleanClause(concept.scenario)}`,
    `Так это работает на практике: ${cleanClause(concept.scenario)}`,
    `В учебной ситуации это видно так: ${cleanClause(concept.scenario)}`,
    `Именно это назначение показано в примере: ${cleanClause(concept.scenario)}`,
    `Практический контекст: ${cleanClause(concept.scenario)}`,
    `Этот пример раскрывает термин: ${cleanClause(concept.scenario)}`,
    `Важна роль понятия в ситуации: ${cleanClause(concept.scenario)}`,
    `Поэтому здесь подходит этот термин: ${cleanClause(concept.scenario)}`,
    `Это не характеристика похожего понятия: ${cleanClause(concept.scenario)}`,
    `Смысл термина проявляется в действии: ${cleanClause(concept.scenario)}`,
    `В контексте задачи следует помнить: ${cleanClause(concept.scenario)}`,
    `Проверка на примере: ${cleanClause(concept.scenario)}`,
  ];
  return details[variant % details.length];
};

const conceptExplanation = (concept: TopicConcept, variant: number) =>
  shortExplanation(
    `«${concept.term}» — ${cleanClause(concept.definition)}`,
    explanationDetail(concept, variant),
  );

const falseStatementExplanation = (concept: TopicConcept, secondary: TopicConcept, variant: number) => {
  const distinctions = [
    `Описание в утверждении относится к «${secondary.term}», а не к «${concept.term}»`,
    `В утверждении смешаны разные понятия: описан «${secondary.term}»`,
    `Фраза раскрывает «${secondary.term}»: ${cleanClause(secondary.definition)}`,
    `Для «${concept.term}» такое определение не подходит: оно относится к «${secondary.term}»`,
    `Признак из утверждения характерен для «${secondary.term}», поэтому ответ «верно» был бы ошибкой`,
    `Здесь под определение «${secondary.term}» подставили другой термин`,
    `Проверяемый термин - «${concept.term}», но предложение описывает «${secondary.term}»`,
    `Это неверное соответствие: определение принадлежит «${secondary.term}»`,
    `Формулировка проверяет различие между «${concept.term}» и «${secondary.term}»`,
    `У «${concept.term}» иное назначение, чем описано в утверждении`,
    `В предложении назван «${concept.term}», но признаки взяты у «${secondary.term}»`,
    `Сопоставление неверно: описание нужно отнести к «${secondary.term}»`,
  ];
  return shortExplanation(
    distinctions[variant % distinctions.length],
    `«${concept.term}» — ${cleanClause(concept.definition)}`,
  );
};

export const generateQuestionBank = (): Question[] => {
  const questions: Question[] = [];

  for (const topic of topicCatalog) {
    if (topic.subject === "english") continue;
    const concepts = topic.concepts;
    const termPairs = concepts.map((concept) => ({ term: concept.term, definition: concept.definition }));
    const questionCount = questionCountForTopic(topic);

    for (let index = 0; index < questionCount; index += 1) {
      const concept = concepts[index % concepts.length];
      const secondary = concepts[(index + 1) % concepts.length];
      const tertiary = concepts[(index + 2) % concepts.length];
      const difficulty = DIFFICULTY_CYCLE[index % DIFFICULTY_CYCLE.length];
      const template = QUESTION_TYPE_CYCLE[index % QUESTION_TYPE_CYCLE.length];
      const serial = String(index + 1).padStart(2, "0");
      const id = `q-${topic.key}-${serial}`;
      const seed = `${topic.key}:${id}`;
      const promptVariantCount = ["single", "multiple", "trueFalse", "scenario"].includes(template) ? 6 : 5;
      const promptOccurrence = Array.from({ length: index }, (_, previousIndex) => previousIndex)
        .filter((previousIndex) => QUESTION_TYPE_CYCLE[previousIndex % QUESTION_TYPE_CYCLE.length] === template
          && (["sequence", "matching"].includes(template) || previousIndex % concepts.length === index % concepts.length))
        .length;
      const promptVariant = promptOccurrence % promptVariantCount;
      const promptRound = Math.floor(promptOccurrence / promptVariantCount);
      const otherConcepts = concepts.filter((item) => item.term !== concept.term);
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
            otherConcepts.map((item) => item.definition),
            seed,
          );
          const prompts = [
            `Что лучше всего описывает термин «${concept.term}»?`,
            `Какое определение соответствует понятию «${concept.term}»?`,
            `Что означает понятие «${concept.term}»?`,
            `Как следует понимать термин «${concept.term}»?`,
            `Какова точная характеристика понятия «${concept.term}»?`,
            `Какое утверждение наиболее точно раскрывает понятие «${concept.term}»?`,
          ];
          question = {
            id,
            topic: topic.title,
            difficulty,
            type: template,
            question: prompts[promptVariant],
            options,
            correct: getCorrectOptionId(options),
            explanation: conceptExplanation(concept, promptOccurrence),
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
            ...otherConcepts.map((item) => item.definition),
          ]);
          const options = shuffle(
            [
              ...correctTexts.map((text) => ({
                text,
                isCorrect: true,
              })),
              ...pickMany(distractorTexts, 2, `${seed}:multi`).map((text) => ({
                text,
                isCorrect: false,
              })),
            ],
            `${seed}:multi-options`,
          ).map((option, optionIndex) => ({ ...option, id: `opt-${optionIndex + 1}` }));
          question = {
            id,
            topic: topic.title,
            difficulty,
            type: template,
            question: [
              `Какие утверждения о понятии «${concept.term}» верны?`,
              `Что верно характеризует понятие «${concept.term}»?`,
              `Какие формулировки правильно раскрывают термин «${concept.term}»?`,
              `Какие утверждения точно относятся к термину «${concept.term}»?`,
              `Что можно верно сказать о понятии «${concept.term}»?`,
              `Какие два утверждения корректно описывают понятие «${concept.term}»?`,
            ][promptVariant],
            options,
            correct: options.filter((option) => option.isCorrect).map((option) => option.id),
            explanation: shortExplanation(
              `Оба верных утверждения относятся к «${concept.term}»: ${cleanClause(concept.definition)}`,
              explanationDetail(concept, promptOccurrence),
            ),
            source: topic.source,
            tags: commonTags,
            meta: { concept: concept.term, count: 2 },
          };
          break;
        }
        case "trueFalse": {
          const trueFalseIndex = QUESTION_TYPE_CYCLE.slice(0, (index % QUESTION_TYPE_CYCLE.length) + 1).filter((type) => type === "trueFalse").length
            + Math.floor(index / QUESTION_TYPE_CYCLE.length) * QUESTION_TYPE_CYCLE.filter((type) => type === "trueFalse").length;
          const isTrue = trueFalseIndex % 2 === 1;
          const options = [
            { id: "true", text: "Верно" },
            { id: "false", text: "Неверно" },
          ];
          const statement = `${concept.term} — ${isTrue ? concept.definition : secondary.definition}`;
          question = {
            id,
            topic: topic.title,
            difficulty,
            type: template,
            question: [
              `Верно ли утверждение: «${statement}»?`,
              `Является ли верным утверждение: «${statement}»?`,
              `Соответствует ли истине утверждение: «${statement}»?`,
              `Правильно ли дано определение: «${statement}»?`,
              `Можно ли считать верным утверждение: «${statement}»?`,
              `Верно ли определено понятие в утверждении: «${statement}»?`,
            ][promptVariant],
            options,
            correct: isTrue,
            explanation: isTrue
              ? shortExplanation(
                  `Утверждение верно: «${concept.term}» — ${cleanClause(concept.definition)}`,
                  explanationDetail(concept, promptOccurrence),
                )
              : falseStatementExplanation(concept, secondary, promptOccurrence),
            source: topic.source,
            tags: commonTags,
            meta: { concept: concept.term, statement: isTrue ? concept.definition : secondary.definition },
          };
          break;
        }
        case "fill": {
          const prompt = [
            `Какой термин соответствует определению: «${concept.definition}»?`,
            `Как называется понятие, которое означает: «${concept.definition}»?`,
            `Какое понятие описано определением: «${concept.definition}»?`,
            `Какой термин нужно назвать по определению: «${concept.definition}»?`,
            `Как называется объект или явление со следующим определением: «${concept.definition}»?`,
          ][promptVariant];
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
            explanation: shortExplanation(
              `Искомый термин — «${concept.term}»: ${cleanClause(concept.definition)}`,
              explanationDetail(concept, promptOccurrence),
            ),
            source: topic.source,
            tags: commonTags,
            meta: { concept: concept.term },
          };
          break;
        }
        case "scenario": {
          // A hint such as "web protocol" is too vague to be a standalone task.
          // Use the complete definition when the real example already names the answer.
          const scenarioClue = [concept.scenario, concept.definition, concept.hint]
            .find((text) => !containsAnswerTerm(text, concept.term)) ?? concept.definition;
          const options = buildOptions(
            concept.term,
            otherConcepts.map((item) => item.term),
            seed,
          );
          question = {
            id,
            topic: topic.title,
            difficulty,
            type: template,
            question: [
              `${scenarioClue} Какое понятие описано в этой ситуации?`,
              `${scenarioClue} Какой термин точнее всего подходит к примеру?`,
              `${scenarioClue} Как называется показанное здесь понятие?`,
              `${scenarioClue} Какое понятие иллюстрирует этот пример?`,
              `${scenarioClue} Какой термин следует применить к этой ситуации?`,
              `${scenarioClue} Как называется соответствующее этой ситуации понятие?`,
            ][promptVariant],
            options,
            correct: getCorrectOptionId(options),
            explanation: shortExplanation(
              `В ситуации показано понятие «${concept.term}»: ${cleanClause(concept.definition)}`,
              explanationDetail(concept, promptOccurrence),
            ),
            source: topic.source,
            tags: [...commonTags, "scenario"],
            meta: { concept: concept.term },
          };
          break;
        }
        case "matching": {
          const matchingSet = pickMany(termPairs, Math.min(4, termPairs.length), seed);
          const matching = buildMatching(topic.key, seed, matchingSet);
          const matchingTerms = [...matching.meta.left].sort((left, right) => left.localeCompare(right, "ru")).join(", ");
          question = {
            id,
            topic: topic.title,
            difficulty,
            type: template,
            question: [
              `Как правильно соотнести с определениями термины «${matchingTerms}»?`,
              `Какие определения соответствуют терминам «${matchingTerms}»?`,
              `Как сопоставить с точными значениями понятия «${matchingTerms}»?`,
              `Какие пары нужно составить для терминов «${matchingTerms}»?`,
              `Как распределить определения между терминами «${matchingTerms}»?`,
            ][promptVariant],
            options: matching.options,
            correct: matching.correct,
            explanation: shortExplanation(
              `Верные соответствия: ${matching.correct.map((pair) => `«${pair.left}» — ${cleanClause(pair.right)}`).join("; ")}`,
              explanationDetail(concept, promptOccurrence),
            ),
            source: topic.source,
            tags: [...commonTags, "matching"],
            meta: { left: matching.meta.left, right: matching.meta.right },
          };
          break;
        }
        case "sequence": {
          // Topic "process" fields were historically used as an artificial order for
          // every concept. They are not always a real workflow, so asking the user to
          // sort them teaches a false relationship. Keep the question count but turn
          // this slot into an applied, answer-safe identification question.
          const scenarioClue = [concept.scenario, concept.definition, concept.hint]
            .find((text) => !containsAnswerTerm(text, concept.term)) ?? concept.definition;
          const options = buildOptions(
            concept.term,
            otherConcepts.map((item) => item.term),
            seed,
          );
          question = {
            id,
            topic: topic.title,
            difficulty,
            type: "scenario",
            question: [
              `В ситуации «${scenarioClue}» какой термин подходит точнее всего?`,
              `Какое понятие описывает ситуацию: «${scenarioClue}»?`,
              `Как называется объект или действие в примере: «${scenarioClue}»?`,
              `Какой термин нужно выбрать для ситуации: «${scenarioClue}»?`,
              `В каком понятии отражён этот пример: «${scenarioClue}»?`,
            ][promptVariant],
            options,
            correct: getCorrectOptionId(options),
            explanation: shortExplanation(
              `В примере описано понятие «${concept.term}»: ${cleanClause(concept.definition)}`,
              explanationDetail(concept, promptOccurrence),
            ),
            source: topic.source,
            tags: [...commonTags, "scenario", "applied"],
            meta: { concept: concept.term, replacesSequence: true },
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
            correct: getCorrectOptionId(options),
            explanation: conceptExplanation(concept, promptOccurrence),
            source: topic.source,
            tags: commonTags,
          };
      }

      if (promptRound > 0) {
        const followUps = [
          `Вспомните практический контекст: ${cleanClause(concept.scenario)}`,
          `Ориентируйтесь на назначение понятия: ${cleanClause(concept.definition)}`,
          `Сопоставьте формулировку с примером: ${cleanClause(concept.scenario)}`,
          `Проверьте, какое понятие описывает действие: ${cleanClause(concept.scenario)}`,
        ];
        question.question = `${question.question.slice(0, -1)}. ${followUps[(promptRound - 1) % followUps.length]}?`;
      }

      question.meta = { ...(question.meta ?? {}), concept: concept.term, hint: concept.hint };

      questions.push(question);
    }
  }

  questions.push(...generateEnglishQuestionBank());

  validateQuestionBank(questions);
  return questions;
};

const sameValues = (left: string[], right: string[]) =>
  left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index]);

const requireValid = (condition: boolean, questionId: string, message: string) => {
  if (!condition) {
    throw new Error(`Ошибка в банке вопросов (${questionId}): ${message}`);
  }
};

export const validateQuestionBank = (questions: Question[]) => {
  const expectedTotal = QUESTION_BANK_TOTAL;
  if (questions.length !== expectedTotal) {
    throw new Error(`Ожидалось ${expectedTotal} вопросов, получено ${questions.length}.`);
  }

  const ids = new Set<string>();
  const prompts = new Map<string, string>();
  const explanations = new Map<string, string>();

  for (const question of questions) {
    requireValid(!ids.has(question.id), question.id, "идентификатор должен быть уникальным");
    requireValid(!prompts.has(question.question), question.id, `текст вопроса должен быть уникальным; совпадает с ${prompts.get(question.question) ?? "неизвестным вопросом"}`);
    requireValid(!/Раздел «.+», вариант \d+/iu.test(question.question), question.id, "в тексте осталась служебная приписка");
    requireValid(question.question.trim().endsWith("?"), question.id, "текст должен содержать только вопрос");
    const explanationSentences = question.explanation.trim().split(/(?<=[.!?])\s+/u).filter(Boolean);
    requireValid(Boolean(question.explanation.trim()), question.id, "пояснение не должно быть пустым");
    requireValid(explanationSentences.length <= 2, question.id, "пояснение должно содержать не больше двух предложений");
    requireValid(!question.explanation.startsWith("В условии нужно"), question.id, "обнаружено общее шаблонное пояснение");
    requireValid(!explanations.has(question.explanation), question.id, `пояснение должно быть отдельным; совпадает с ${explanations.get(question.explanation) ?? "неизвестным вопросом"}`);
    ids.add(question.id);
    prompts.set(question.question, question.id);
    explanations.set(question.explanation, question.id);

    const topic = topicCatalog.find((item) => item.title === question.topic);
    requireValid(Boolean(topic), question.id, "неизвестная тема");
    if (!topic) continue;

    const optionIds = question.options.map((option) => option.id);
    const optionTexts = question.options.map((option) => option.text.trim());
    requireValid(new Set(optionIds).size === optionIds.length, question.id, "идентификаторы ответов повторяются");
    requireValid(new Set(optionTexts).size === optionTexts.length, question.id, "варианты ответов повторяются");
    requireValid(optionTexts.every(Boolean), question.id, "найден пустой вариант ответа");

    const conceptName = typeof question.meta?.concept === "string" ? question.meta.concept : "";
    const concept = topic.concepts.find((item) => item.term === conceptName);

    if (topic.subject === "english") continue;

    if (question.type === "single" || question.type === "scenario") {
      const correctId = String(question.correct);
      const correctOption = question.options.find((option) => option.id === correctId);
      requireValid(Boolean(correctOption), question.id, "правильный вариант отсутствует в списке");
      requireValid(question.options.filter((option) => option.isCorrect).length === 1, question.id, "должен быть ровно один правильный вариант");
      requireValid(correctOption?.isCorrect === true, question.id, "поле correct не совпадает с отмеченным вариантом");
      requireValid(Boolean(concept), question.id, "не найдено исходное понятие");
      if (!correctOption || !concept) continue;

      if (question.type === "single") {
        requireValid(correctOption.text === concept.definition, question.id, "правильный ответ не совпадает с определением понятия");
      } else if (question.type === "scenario") {
        requireValid(correctOption.text === concept.term, question.id, "ответ на ситуацию не совпадает с исходным понятием");
        requireValid(!containsAnswerTerm(question.question, concept.term), question.id, "правильный термин указан прямо в условии");
      }
      continue;
    }

    if (question.type === "multiple") {
      requireValid(Boolean(concept), question.id, "не найдено исходное понятие");
      const correctIds = Array.isArray(question.correct) ? question.correct.map(String) : [];
      const markedIds = question.options.filter((option) => option.isCorrect).map((option) => option.id);
      requireValid(correctIds.length >= 2, question.id, "должно быть не менее двух правильных ответов");
      requireValid(sameValues(correctIds, markedIds), question.id, "поле correct не совпадает с отмеченными ответами");
      if (concept) {
        const correctTexts = question.options.filter((option) => correctIds.includes(option.id)).map((option) => option.text);
        requireValid(sameValues(correctTexts, [concept.definition, concept.scenario]), question.id, "правильные утверждения не соответствуют исходным данным");
      }
      continue;
    }

    if (question.type === "trueFalse") {
      requireValid(typeof question.correct === "boolean", question.id, "ответ должен быть логическим значением");
      requireValid(sameValues(optionIds, ["true", "false"]), question.id, "нужны только ответы «Верно» и «Неверно»");
      requireValid(Boolean(concept), question.id, "не найдено исходное понятие");
      if (concept) {
        const statement = typeof question.meta?.statement === "string" ? question.meta.statement : "";
        requireValid(question.correct ? statement === concept.definition : statement !== concept.definition, question.id, "метка истинности не соответствует утверждению");
        if (!question.correct) {
          requireValid(topic.concepts.some((item) => item.term !== concept.term && item.definition === statement), question.id, "ложное утверждение не связано с проверяемыми данными");
        }
      }
      continue;
    }

    if (question.type === "fill") {
      const answer = question.correct as FillQuestion;
      requireValid(Boolean(concept), question.id, "не найдено исходное понятие");
      requireValid(answer.answer === concept?.term, question.id, "ответ не совпадает с термином из определения");
      requireValid((answer.acceptable ?? []).every((item) => item === answer.answer), question.id, "в допустимые ответы попал посторонний термин");
      requireValid(Boolean(concept && question.question.includes(concept.definition)), question.id, "вопрос не содержит проверяемое определение");
      requireValid(!containsAnswerTerm(question.question, answer.answer), question.id, "ответ указан прямо в вопросе с вводом текста");
      continue;
    }

    if (question.type === "matching") {
      const pairs = question.correct as MatchingItem[];
      requireValid(Array.isArray(pairs) && pairs.length >= 2, question.id, "недостаточно пар для сопоставления");
      requireValid(pairs.every((pair) => topic.concepts.some((item) => item.term === pair.left && item.definition === pair.right)), question.id, "найдена неверная пара термин — определение");
      requireValid(sameValues(pairs.map((pair) => pair.left), (question.meta?.left as string[]) ?? []), question.id, "список терминов не совпадает с эталоном");
      requireValid(sameValues(pairs.map((pair) => pair.right), (question.meta?.right as string[]) ?? []), question.id, "список определений не совпадает с эталоном");
      continue;
    }

    if (question.type === "sequence") {
      const sequence = question.correct as SequenceQuestion;
      const expectedOrder = topic.process.slice(0, Math.min(5, topic.process.length));
      requireValid(sameValues(sequence.items, expectedOrder), question.id, "набор этапов не совпадает с процессом темы");
      requireValid(sequence.correctOrder.every((item, index) => item === expectedOrder[index]), question.id, "правильный порядок этапов искажён");
      requireValid(sameValues(optionTexts, expectedOrder), question.id, "варианты этапов не совпадают с эталоном");
    }
  }

  return true;
};

export const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("won't", "will not")
    .replaceAll("wont", "will not")
    .replaceAll("don't", "do not")
    .replaceAll("dont", "do not")
    .replaceAll("doesn't", "does not")
    .replaceAll("doesnt", "does not")
    .replaceAll("isn't", "is not")
    .replaceAll("isnt", "is not")
    .replaceAll("aren't", "are not")
    .replaceAll("arent", "are not")
    .replaceAll("wasn't", "was not")
    .replaceAll("wasnt", "was not")
    .replaceAll("weren't", "were not")
    .replaceAll("werent", "were not")
    .replaceAll("haven't", "have not")
    .replaceAll("havent", "have not")
    .replaceAll("hasn't", "has not")
    .replaceAll("hasnt", "has not")
    .replaceAll("hadn't", "had not")
    .replaceAll("hadnt", "had not")
    .replaceAll("can't", "cannot")
    .replaceAll("cant", "cannot")
    .replaceAll("couldn't", "could not")
    .replaceAll("couldnt", "could not")
    .replaceAll("shouldn't", "should not")
    .replaceAll("shouldnt", "should not")
    .replaceAll("wouldn't", "would not")
    .replaceAll("wouldnt", "would not")
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
      const received = Array.isArray(answer) ? answer.map((item) => normalizeText(String(item))) : [];
      const correctOrder = (question.correct as SequenceQuestion).correctOrder.map(normalizeText);
      return {
        isCorrect:
          received.length === correctOrder.length &&
          received.every((item, index) => item === correctOrder[index]),
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
    case "multiple": {
      const correct = question.correct as string[];
      return question.options.filter((option) => correct.includes(option.id)).map((option) => option.text);
    }
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

export const getUserAnswerPreview = (question: Question, answer: unknown): unknown => {
  if (answer === "__skipped__") return "Вопрос пропущен";
  if (answer === "__timeout__") return "Время вышло";
  switch (question.type) {
    case "single":
    case "scenario":
    case "imageChoice":
      return question.options.find((option) => option.id === String(answer))?.text ?? String(answer ?? "");
    case "trueFalse":
      return answer === true ? "Верно" : answer === false ? "Неверно" : "Нет ответа";
    case "multiple": {
      const selectedIds = Array.isArray(answer) ? answer.map(String) : [];
      return selectedIds.map((id) => question.options.find((option) => option.id === id)?.text ?? id);
    }
    case "fill":
      return String(answer ?? "");
    case "matching":
      return Array.isArray(answer)
        ? answer.map((item) => {
            const pair = item as Partial<MatchingItem>;
            return `${pair.left ?? ""} → ${pair.right ?? ""}`;
          })
        : [];
    case "sequence":
      return Array.isArray(answer) ? answer.map(String) : [];
    default:
      return answer;
  }
};

export const buildQuestionBankSummary = () => ({
  total: QUESTION_BANK_TOTAL,
  topics: topicCatalog.map((topic) => ({
    key: topic.key,
    title: topic.title,
    questions: questionCountForTopic(topic),
  })),
});

export const topicKeys = topicCatalog.map((topic) => topic.key);

export const getTopicByKey = (topicKey: string) => topicCatalog.find((topic) => topic.key === topicKey);

export const getTopicByTitle = (title: string) => topicCatalog.find((topic) => topic.title === title);
