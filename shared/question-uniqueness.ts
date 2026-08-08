type QuestionLike = {
  id?: string;
  question: string;
  topic?: string;
  type?: string;
  meta?: unknown;
};

export type QuestionUniquenessState = {
  ids: Set<string>;
  prompts: Set<string>;
  semantics: Set<string>;
};

const normalize = (value: string) =>
  value.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/giu, "");

const metaRecord = (question: QuestionLike) =>
  question.meta && typeof question.meta === "object" && !Array.isArray(question.meta)
    ? question.meta as Record<string, unknown>
    : {};

export const questionSemanticKeys = (question: QuestionLike) => {
  const meta = metaRecord(question);
  const keys = new Set<string>();
  const concept = typeof meta.concept === "string" ? normalize(meta.concept) : "";
  if (concept) keys.add(`concept:${concept}`);

  if (Array.isArray(meta.left)) {
    for (const term of meta.left) {
      const normalized = normalize(String(term));
      if (normalized) keys.add(`concept:${normalized}`);
    }
  }

  if (question.type === "sequence") {
    const steps = Array.isArray(meta.steps) ? meta.steps.map(String).map(normalize).filter(Boolean) : [];
    keys.add(`sequence:${normalize(question.topic ?? "")}:${steps.join("-")}`);
  }

  if (keys.size === 0) keys.add(`prompt:${normalize(question.question)}`);
  return [...keys];
};

export const createQuestionUniquenessState = (): QuestionUniquenessState => ({
  ids: new Set<string>(),
  prompts: new Set<string>(),
  semantics: new Set<string>(),
});

export const tryAddUniqueQuestion = (state: QuestionUniquenessState, question: QuestionLike) => {
  const id = question.id ?? "";
  const prompt = normalize(question.question);
  const semantics = questionSemanticKeys(question);
  if ((id && state.ids.has(id)) || state.prompts.has(prompt) || semantics.some((key) => state.semantics.has(key))) {
    return false;
  }

  if (id) state.ids.add(id);
  state.prompts.add(prompt);
  semantics.forEach((key) => state.semantics.add(key));
  return true;
};

export const uniqueQuestions = <T extends QuestionLike>(questions: T[], limit = Number.POSITIVE_INFINITY) => {
  const state = createQuestionUniquenessState();
  const selected: T[] = [];
  for (const question of questions) {
    if (!tryAddUniqueQuestion(state, question)) continue;
    selected.push(question);
    if (selected.length >= limit) break;
  }
  return selected;
};
