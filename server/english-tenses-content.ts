import type { Question, TopicMeta } from "@shared/types";

type EnglishTenseSpec = {
  key: string;
  title: string;
  description: string;
  formula: string;
  markers: string[];
  form: (verb: Verb, subject: Subject) => string;
  distractors: (verb: Verb, subject: Subject) => string[];
  explanation: string;
};

type Verb = {
  base: string;
  third: string;
  past: string;
  participle: string;
  ing: string;
  object: string;
  ruPresent: string;
  ruPast: string;
  ruPerfect: string;
  ruInfinitive: string;
  ruObject: string;
};

type Subject = {
  text: string;
  singular: boolean;
  ruText?: string;
};

const source = "Практическая грамматика английского языка A2-B1";
const color = "from-fuchsia-400 to-pink-500";

const verbs: Verb[] = [
  { base: "work", third: "works", past: "worked", participle: "worked", ing: "working", object: "on a small project", ruPresent: "работает", ruPast: "работал", ruPerfect: "поработал", ruInfinitive: "работать", ruObject: "над небольшим проектом" },
  { base: "study", third: "studies", past: "studied", participle: "studied", ing: "studying", object: "a new topic", ruPresent: "изучает", ruPast: "изучал", ruPerfect: "изучил", ruInfinitive: "изучать", ruObject: "новую тему" },
  { base: "make", third: "makes", past: "made", participle: "made", ing: "making", object: "a simple plan", ruPresent: "составляет", ruPast: "составил", ruPerfect: "составил", ruInfinitive: "составлять", ruObject: "простой план" },
  { base: "write", third: "writes", past: "wrote", participle: "written", ing: "writing", object: "a short message", ruPresent: "пишет", ruPast: "написал", ruPerfect: "написал", ruInfinitive: "писать", ruObject: "короткое сообщение" },
  { base: "visit", third: "visits", past: "visited", participle: "visited", ing: "visiting", object: "a quiet museum", ruPresent: "посещает", ruPast: "посетил", ruPerfect: "посетил", ruInfinitive: "посещать", ruObject: "тихий музей" },
  { base: "cook", third: "cooks", past: "cooked", participle: "cooked", ing: "cooking", object: "a healthy dinner", ruPresent: "готовит", ruPast: "готовил", ruPerfect: "приготовил", ruInfinitive: "готовить", ruObject: "полезный ужин" },
  { base: "build", third: "builds", past: "built", participle: "built", ing: "building", object: "a small model", ruPresent: "строит", ruPast: "строил", ruPerfect: "построил", ruInfinitive: "строить", ruObject: "небольшую модель" },
  { base: "teach", third: "teaches", past: "taught", participle: "taught", ing: "teaching", object: "a useful lesson", ruPresent: "преподаёт", ruPast: "преподавал", ruPerfect: "провёл", ruInfinitive: "преподавать", ruObject: "полезный урок" },
  { base: "choose", third: "chooses", past: "chose", participle: "chosen", ing: "choosing", object: "the best option", ruPresent: "выбирает", ruPast: "выбрал", ruPerfect: "выбрал", ruInfinitive: "выбирать", ruObject: "лучший вариант" },
  { base: "prepare", third: "prepares", past: "prepared", participle: "prepared", ing: "preparing", object: "a class presentation", ruPresent: "готовит", ruPast: "готовил", ruPerfect: "подготовил", ruInfinitive: "готовить", ruObject: "презентацию для занятия" },
];

const subjects: Subject[] = [
  { text: "Mia", singular: true },
  { text: "Daniel", singular: true },
  { text: "Anna", singular: true },
  { text: "Leo", singular: true },
  { text: "Sofia", singular: true },
  { text: "Max", singular: true },
  { text: "Emma", singular: true },
  { text: "Noah", singular: true },
  { text: "Liam", singular: true },
  { text: "Olivia", singular: true },
  { text: "Tom and Ana", singular: false, ruText: "Том и Ана" },
  { text: "The students", singular: false, ruText: "Студенты" },
  { text: "My friends", singular: false, ruText: "Мои друзья" },
  { text: "Our teachers", singular: false, ruText: "Наши преподаватели" },
  { text: "The children", singular: false, ruText: "Дети" },
];

const have = (subject: Subject) => subject.singular ? "has" : "have";
const be = (subject: Subject) => subject.singular ? "is" : "are";
const pastBe = (subject: Subject) => subject.singular ? "was" : "were";

type RussianVerbForm = {
  present: [string, string];
  past: [string, string, string];
  perfect: [string, string, string];
  future: [string, string];
  infinitive: string;
  object: string;
};

const russianVerbForms: Record<string, RussianVerbForm> = {
  work: { present: ["работает", "работают"], past: ["работал", "работала", "работали"], perfect: ["поработал", "поработала", "поработали"], future: ["поработает", "поработают"], infinitive: "работать", object: "над небольшим проектом" },
  study: { present: ["изучает", "изучают"], past: ["изучал", "изучала", "изучали"], perfect: ["изучил", "изучила", "изучили"], future: ["изучит", "изучат"], infinitive: "изучать", object: "новую тему" },
  make: { present: ["составляет", "составляют"], past: ["составлял", "составляла", "составляли"], perfect: ["составил", "составила", "составили"], future: ["составит", "составят"], infinitive: "составлять", object: "простой план" },
  write: { present: ["пишет", "пишут"], past: ["писал", "писала", "писали"], perfect: ["написал", "написала", "написали"], future: ["напишет", "напишут"], infinitive: "писать", object: "короткое сообщение" },
  visit: { present: ["посещает", "посещают"], past: ["посещал", "посещала", "посещали"], perfect: ["посетил", "посетила", "посетили"], future: ["посетит", "посетят"], infinitive: "посещать", object: "тихий музей" },
  cook: { present: ["готовит", "готовят"], past: ["готовил", "готовила", "готовили"], perfect: ["приготовил", "приготовила", "приготовили"], future: ["приготовит", "приготовят"], infinitive: "готовить", object: "полезный ужин" },
  build: { present: ["строит", "строят"], past: ["строил", "строила", "строили"], perfect: ["построил", "построила", "построили"], future: ["построит", "построят"], infinitive: "строить", object: "небольшую модель" },
  teach: { present: ["проводит", "проводят"], past: ["проводил", "проводила", "проводили"], perfect: ["провёл", "провела", "провели"], future: ["проведёт", "проведут"], infinitive: "проводить", object: "полезный урок" },
  choose: { present: ["выбирает", "выбирают"], past: ["выбирал", "выбирала", "выбирали"], perfect: ["выбрал", "выбрала", "выбрали"], future: ["выберет", "выберут"], infinitive: "выбирать", object: "лучший вариант" },
  prepare: { present: ["готовит", "готовят"], past: ["готовил", "готовила", "готовили"], perfect: ["подготовил", "подготовила", "подготовили"], future: ["подготовит", "подготовят"], infinitive: "готовить", object: "презентацию для занятия" },
};

const russianSubjects: Record<string, { text: string; gender: "m" | "f" | "plural" }> = {
  Mia: { text: "Мия", gender: "f" }, Daniel: { text: "Дэниел", gender: "m" }, Anna: { text: "Анна", gender: "f" }, Leo: { text: "Лео", gender: "m" }, Sofia: { text: "София", gender: "f" }, Max: { text: "Макс", gender: "m" }, Emma: { text: "Эмма", gender: "f" }, Noah: { text: "Ноа", gender: "m" }, Liam: { text: "Лиам", gender: "m" }, Olivia: { text: "Оливия", gender: "f" },
  "Tom and Ana": { text: "Том и Ана", gender: "plural" }, "The students": { text: "Студенты", gender: "plural" }, "My friends": { text: "Мои друзья", gender: "plural" }, "Our teachers": { text: "Наши преподаватели", gender: "plural" }, "The children": { text: "Дети", gender: "plural" },
};

export const englishTenseTopicCatalog: TopicMeta[] = [
  ["present-simple", "Present Simple", "Настоящее простое время: привычки, факты и регулярные действия.", "do/does + base verb", "время настоящее"],
  ["present-continuous", "Present Continuous", "Настоящее длительное время: действие происходит сейчас или временно.", "am/is/are + verb-ing", "действие в процессе"],
  ["present-perfect", "Present Perfect", "Настоящее совершённое время: результат или опыт к настоящему моменту.", "have/has + past participle", "результат сейчас"],
  ["present-perfect-continuous", "Present Perfect Continuous", "Настоящее совершённое длительное время: действие длится до настоящего момента.", "have/has been + verb-ing", "длительность до сейчас"],
  ["past-simple", "Past Simple", "Прошедшее простое время: завершённое действие в прошлом.", "past form", "завершённое прошлое"],
  ["past-continuous", "Past Continuous", "Прошедшее длительное время: процесс в определённый момент прошлого.", "was/were + verb-ing", "процесс в прошлом"],
  ["past-perfect", "Past Perfect", "Прошедшее совершённое время: одно прошлое действие произошло раньше другого.", "had + past participle", "более раннее прошлое"],
  ["past-perfect-continuous", "Past Perfect Continuous", "Прошедшее совершённое длительное время: длительность до момента в прошлом.", "had been + verb-ing", "длительность до прошлого"],
  ["future-simple", "Future Simple", "Будущее простое время: решение, обещание или действие в будущем.", "will + base verb", "будущее действие"],
  ["future-continuous", "Future Continuous", "Будущее длительное время: процесс в определённый момент будущего.", "will be + verb-ing", "процесс в будущем"],
  ["future-perfect", "Future Perfect", "Будущее совершённое время: действие завершится к моменту в будущем.", "will have + past participle", "результат к будущему моменту"],
  ["future-perfect-continuous", "Future Perfect Continuous", "Будущее совершённое длительное время: длительность к моменту в будущем.", "will have been + verb-ing", "длительность к будущему"],
].map(([key, title, description]) => ({
  key: `english-tense-${key}`,
  title,
  description,
  source,
  color,
  subject: "english",
}));

export const englishTenseMixedTopic: TopicMeta = {
  key: "english-tenses-mixed-exam",
  title: "Все времена английского языка (только экзамен)",
  description: "Смешанный блок по всем 12 временам: 200 вопросов, доступен только в экзамене.",
  source,
  color,
  subject: "english",
  examOnly: true,
};

englishTenseTopicCatalog.push(englishTenseMixedTopic);

const topicByKey = (key: string) => englishTenseTopicCatalog.find((topic) => topic.key === key)!;

const specs: EnglishTenseSpec[] = [
  {
    key: "present-simple",
    title: "Present Simple",
    description: "Настоящее простое время",
    formula: "do/does + base verb",
    markers: ["every day", "on Mondays", "usually", "often", "after breakfast", "at weekends", "twice a week", "in the evening", "when the class starts", "before dinner"],
    form: (verb, subject) => subject.singular ? verb.third : verb.base,
    distractors: (verb, subject) => [verb.base, verb.past, `${be(subject)} ${verb.ing}`],
    explanation: "Present Simple используется для привычки, факта или повторяющегося действия. С третьим лицом единственного числа к смысловому глаголу добавляется окончание -s или -es.",
  },
  {
    key: "present-continuous",
    title: "Present Continuous",
    description: "Настоящее длительное время",
    formula: "am/is/are + verb-ing",
    markers: ["now", "at the moment", "this week", "today", "right now", "currently", "these days", "this afternoon", "while we are talking", "for the next hour"],
    form: (verb, subject) => `${be(subject)} ${verb.ing}`,
    distractors: (verb, subject) => [subject.singular ? verb.third : verb.base, `${pastBe(subject)} ${verb.ing}`, `will ${verb.base}`],
    explanation: "Present Continuous показывает действие, которое идёт сейчас или длится временно. После формы to be нужен причастный оборот с окончанием -ing.",
  },
  {
    key: "present-perfect",
    title: "Present Perfect",
    description: "Настоящее совершённое время",
    formula: "have/has + past participle",
    markers: ["already", "just", "recently", "so far", "this month", "many times", "never", "once this year", "today", "up to now"],
    form: (verb, subject) => `${have(subject)} ${verb.participle}`,
    distractors: (verb, subject) => [verb.past, `${be(subject)} ${verb.ing}`, `will ${verb.base}`],
    explanation: "Present Perfect связывает прошлое действие с настоящим результатом или опытом. Используется have/has и третья форма глагола, а точный момент обычно не называется.",
  },
  {
    key: "present-perfect-continuous",
    title: "Present Perfect Continuous",
    description: "Настоящее совершённое длительное время",
    formula: "have/has been + verb-ing",
    markers: ["for two hours", "since 8 a.m.", "all morning", "lately", "recently", "for a week", "since Monday", "all afternoon", "over the last hour", "these days"],
    form: (verb, subject) => `${have(subject)} been ${verb.ing}`,
    distractors: (verb, subject) => [`${have(subject)} ${verb.participle}`, `${pastBe(subject)} ${verb.ing}`, `will be ${verb.ing}`],
    explanation: "Present Perfect Continuous подчёркивает длительность действия, которое началось раньше и продолжается или только что закончилось. В конструкции нужны have/has, been и форма -ing.",
  },
  {
    key: "past-simple",
    title: "Past Simple",
    description: "Прошедшее простое время",
    formula: "past form",
    markers: ["yesterday", "last Monday", "two days ago", "in 2024", "this morning", "after the lesson", "when I was at school", "last weekend", "earlier today", "on Friday"],
    form: (verb) => verb.past,
    distractors: (verb, subject) => [subject.singular ? verb.third : verb.base, `${pastBe(subject)} ${verb.ing}`, `will ${verb.base}`],
    explanation: "Past Simple обозначает завершённое действие в прошлом, часто с указанием времени. В утвердительном предложении используется вторая форма глагола.",
  },
  {
    key: "past-continuous",
    title: "Past Continuous",
    description: "Прошедшее длительное время",
    formula: "was/were + verb-ing",
    markers: ["at 7 p.m. yesterday", "when I called", "while the rain was falling", "all evening", "this time last week", "during the lesson", "at noon", "when the teacher arrived", "between five and six", "while we were waiting"],
    form: (verb, subject) => `${pastBe(subject)} ${verb.ing}`,
    distractors: (verb, subject) => [verb.past, subject.singular ? verb.third : verb.base, `${have(subject)} ${verb.participle}`],
    explanation: "Past Continuous описывает процесс в конкретный момент прошлого или фон для другого события. Нужна прошедшая форма to be и причастие с -ing.",
  },
  {
    key: "past-perfect",
    title: "Past Perfect",
    description: "Прошедшее совершённое время",
    formula: "had + past participle",
    markers: ["before the meeting started", "by the time we arrived", "before lunch", "when the bus came", "by 10 a.m.", "before the teacher checked", "before the film began", "when the guests arrived", "before the shop opened", "by the end of the lesson"],
    form: (verb) => `had ${verb.participle}`,
    distractors: (verb, subject) => [verb.past, `${pastBe(subject)} ${verb.ing}`, `will have ${verb.participle}`],
    explanation: "Past Perfect показывает, что одно действие завершилось раньше другого действия в прошлом. Для всех лиц используется had и третья форма глагола.",
  },
  {
    key: "past-perfect-continuous",
    title: "Past Perfect Continuous",
    description: "Прошедшее совершённое длительное время",
    formula: "had been + verb-ing",
    markers: ["for two hours before the test", "since morning when she left", "all day before the trip", "for a week before the exam", "for three hours when he arrived", "since Monday before the break", "all afternoon before dinner", "for months before the change", "for ten minutes when the bell rang", "all night before sunrise"],
    form: (verb) => `had been ${verb.ing}`,
    distractors: (verb, subject) => [`had ${verb.participle}`, `${pastBe(subject)} ${verb.ing}`, `will have been ${verb.ing}`],
    explanation: "Past Perfect Continuous подчёркивает, сколько длилось действие до другого момента в прошлом. В конструкции неизменяемые had been сочетаются с формой -ing.",
  },
  {
    key: "future-simple",
    title: "Future Simple",
    description: "Будущее простое время",
    formula: "will + base verb",
    markers: ["tomorrow", "next week", "soon", "later today", "in two days", "after dinner", "when the course ends", "next month", "one day", "in the evening"],
    form: (verb) => `will ${verb.base}`,
    distractors: (verb, subject) => [verb.past, `${be(subject)} ${verb.ing}`, `will have ${verb.participle}`],
    explanation: "Future Simple используется для будущего действия, обещания или решения. После will всегда ставится начальная форма глагола без окончания -s.",
  },
  {
    key: "future-continuous",
    title: "Future Continuous",
    description: "Будущее длительное время",
    formula: "will be + verb-ing",
    markers: ["at 8 tomorrow", "this time next week", "all morning tomorrow", "when you call", "during the flight", "at noon on Friday", "while you are away", "next Saturday evening", "at the same time tomorrow", "between 6 and 7"],
    form: (verb) => `will be ${verb.ing}`,
    distractors: (verb, subject) => [`will ${verb.base}`, `${pastBe(subject)} ${verb.ing}`, `will have ${verb.participle}`],
    explanation: "Future Continuous показывает процесс, который будет идти в определённый момент будущего. После will be используется форма глагола с окончанием -ing.",
  },
  {
    key: "future-perfect",
    title: "Future Perfect",
    description: "Будущее совершённое время",
    formula: "will have + past participle",
    markers: ["by Friday", "by the end of the month", "before noon tomorrow", "by 2030", "when you arrive", "by next summer", "before the course begins", "by the time the guests come", "by then", "by the end of the day"],
    form: (verb) => `will have ${verb.participle}`,
    distractors: (verb, subject) => [`will ${verb.base}`, `will be ${verb.ing}`, `had ${verb.participle}`],
    explanation: "Future Perfect обозначает действие, которое завершится к определённому моменту в будущем. Формула состоит из will have и третьей формы глагола.",
  },
  {
    key: "future-perfect-continuous",
    title: "Future Perfect Continuous",
    description: "Будущее совершённое длительное время",
    formula: "will have been + verb-ing",
    markers: ["for three hours by noon", "for a month by Friday", "since Monday by the end of the week", "for two years by 2028", "all morning by 12", "for six weeks by exam day", "since sunrise by lunch", "for ten days by next Tuesday", "for a year by the time you arrive", "for five hours by evening"],
    form: (verb) => `will have been ${verb.ing}`,
    distractors: (verb, subject) => [`will have ${verb.participle}`, `will be ${verb.ing}`, `had been ${verb.ing}`],
    explanation: "Future Perfect Continuous подчёркивает длительность действия к моменту в будущем. После will have been используется форма глагола с окончанием -ing.",
  },
];

const optionOrder = (correct: string, distractors: string[], seed: number) => {
  const values = [correct, ...distractors.filter((item) => item !== correct)];
  const rotated = values.map((_, index) => values[(index + seed) % values.length]);
  return rotated.map((text, index) => ({ id: `option-${index + 1}`, text, isCorrect: text === correct }));
};

export const isEnglishTenseTopic = (title: string) => englishTenseTopicCatalog.some((topic) => topic.title === title);

const generateLegacyEnglishTenseQuestions = (): Question[] => specs.flatMap((spec) => {
  const topic = topicByKey(`english-tense-${spec.key}`);
  return subjects.flatMap((subject, subjectIndex) => verbs.map((verb, verbIndex) => {
    const index = subjectIndex * verbs.length + verbIndex;
    const marker = spec.markers[verbIndex];
    const correct = spec.form(verb, subject);
    const sentence = `${subject.text} ___ ${verb.object} ${marker}`;
    const explanationLead = spec.explanation.split(/(?<=[.!?])\s+/u)[0].replace(/[.!?]$/u, "");
    const safeMarker = marker.replace(/\./gu, "");
    const explanation = `${explanationLead}. В предложении с подлежащим «${subject.text}» подсказка «${safeMarker}» требует форму «${correct}».`;
    const options = optionOrder(correct, spec.distractors(verb, subject), index + subjectIndex);
    return {
      id: `q-english-tense-${spec.key}-${String(index + 1).padStart(3, "0")}`,
      topic: topic.title,
      difficulty: index < 45 ? "easy" : index < 125 ? "medium" : "hard",
      type: "single",
      question: `Choose the correct verb form for the ${spec.title} sentence: ${sentence}?`,
      options,
      correct: options.find((option) => option.isCorrect)?.id ?? "option-1",
      explanation,
      source,
      tags: ["english", "grammar", "tenses", spec.key, "a2-b1"],
      meta: { concept: `english-tense-${spec.key}-${index + 1}`, englishCategory: "grammar", tenseKey: spec.key },
    } satisfies Question;
  }));
});

const generateLegacyEnglishMixedTenseQuestions = (): Question[] => Array.from({ length: 200 }, (_, index) => {
  const spec = specs[index % specs.length];
  const subject = subjects[(index * 7) % subjects.length];
  const verb = verbs[(index * 3) % verbs.length];
  const marker = spec.markers[(index * 5) % spec.markers.length];
  const correct = spec.form(verb, subject);
  const sentence = `${subject.text} ___ ${verb.object} ${marker}`;
  const safeMarker = marker.replace(/\./gu, "");
  const options = optionOrder(correct, spec.distractors(verb, subject), index + 3);
  return {
    id: `q-english-tenses-mixed-${String(index + 1).padStart(3, "0")}`,
    topic: englishTenseMixedTopic.title,
    difficulty: index < 60 ? "easy" : index < 165 ? "medium" : "hard",
    type: "single",
      question: `Choose the correct verb form: ${sentence}?`,
    options,
    correct: options.find((option) => option.isCorrect)?.id ?? "option-1",
    explanation: `Нужно определить время по смыслу и маркеру «${safeMarker}». В варианте ${index + 1} правильна форма ${spec.title}: «${correct}».`,
    source,
    tags: ["english", "grammar", "tenses", "mixed", "exam-only", "a2-b1"],
    meta: { concept: `english-tenses-mixed-${index + 1}`, englishCategory: "grammar", tenseKey: "mixed" },
  } satisfies Question;
});

const taskKinds = ["choice", "form-fill", "ru-to-en", "en-to-ru", "sequence", "marker-choice", "already-yet"] as const;
type TenseTaskKind = (typeof taskKinds)[number];

const russianPluralForms: Record<string, string> = {
  работает: "работают",
  изучает: "изучают",
  составляет: "составляют",
  пишет: "пишут",
  посещает: "посещают",
  готовит: "готовят",
  строит: "строят",
  "преподаёт": "преподают",
  выбирает: "выбирают",
  работал: "работали",
  изучал: "изучали",
  составил: "составили",
  написал: "написали",
  посетил: "посетили",
  готовил: "готовили",
  строил: "строили",
  преподавал: "преподавали",
  выбрал: "выбрали",
  поработал: "поработали",
  изучил: "изучили",
  провёл: "провели",
  приготовил: "приготовили",
  построил: "построили",
  подготовил: "подготовили",
};

const legacyRussianSentence = (spec: EnglishTenseSpec, subject: Subject, verb: Verb) => {
  const person = subject.text;
  const present = subject.singular ? verb.ruPresent : (russianPluralForms[verb.ruPresent] ?? verb.ruPresent);
  const past = subject.singular ? verb.ruPast : (russianPluralForms[verb.ruPast] ?? verb.ruPast);
  const perfect = subject.singular ? verb.ruPerfect : (russianPluralForms[verb.ruPerfect] ?? verb.ruPerfect);
  const object = verb.ruObject;
  switch (spec.key) {
    case "present-simple": return `${person} обычно ${present} ${object}.`;
    case "present-continuous": return `${person} сейчас ${present} ${object}.`;
    case "present-perfect": return `${person} уже ${perfect} ${object}.`;
    case "present-perfect-continuous": return `${person} уже некоторое время ${present} ${object}.`;
    case "past-simple": return `${person} вчера ${past} ${object}.`;
    case "past-continuous": return `${person} в тот момент ${past} ${object}.`;
    case "past-perfect": return `${person} уже ${perfect} ${object} до другого события.`;
    case "past-perfect-continuous": return `${person} до этого некоторое время ${past} ${object}.`;
    case "future-simple": return `${person} завтра будет ${verb.ruInfinitive} ${object}.`;
    case "future-continuous": return `${person} завтра в это время будет ${verb.ruInfinitive} ${object}.`;
    case "future-perfect": return `${person} уже ${perfect} ${object} к этому моменту.`;
    case "future-perfect-continuous": return `${person} будет уже некоторое время ${verb.ruInfinitive} ${object} к этому моменту.`;
    default: return `${person} ${verb.ruPresent} ${object}.`;
  }
};

const russianSentence = (spec: EnglishTenseSpec, subject: Subject, verb: Verb) => {
  const russianSubject = russianSubjects[subject.text];
  const russianVerb = russianVerbForms[verb.base];
  if (!russianSubject || !russianVerb) return legacyRussianSentence(spec, subject, verb);
  const plural = russianSubject.gender === "plural";
  const form = (forms: [string, string, string]) => plural ? forms[2] : russianSubject.gender === "f" ? forms[1] : forms[0];
  const present = plural ? russianVerb.present[1] : russianVerb.present[0];
  const future = plural ? russianVerb.future[1] : russianVerb.future[0];
  const text = subject.text;
  const { object } = russianVerb;

  switch (spec.key) {
    case "present-simple": return `${text} обычно ${present} ${object}.`;
    case "present-continuous": return `${text} сейчас ${present} ${object}.`;
    case "present-perfect": return `${text} уже ${form(russianVerb.perfect)} ${object}.`;
    case "present-perfect-continuous": return `${text} уже некоторое время ${present} ${object}.`;
    case "past-simple": return `${text} вчера ${form(russianVerb.past)} ${object}.`;
    case "past-continuous": return `${text} в тот момент ${form(russianVerb.past)} ${object}.`;
    case "past-perfect": return `${text} уже ${form(russianVerb.perfect)} ${object} до того, как произошло другое событие.`;
    case "past-perfect-continuous": return `${text} до этого некоторое время ${form(russianVerb.past)} ${object}.`;
    case "future-simple": return `${text} завтра будет ${russianVerb.infinitive} ${object}.`;
    case "future-continuous": return `${text} завтра в это время будет ${russianVerb.infinitive} ${object}.`;
    case "future-perfect": return `К этому моменту ${text} уже ${future} ${object}.`;
    case "future-perfect-continuous": return `К этому моменту ${text} будет уже некоторое время ${russianVerb.infinitive} ${object}.`;
    default: return `${text} ${present} ${object}.`;
  }
};

const englishSentence = (spec: EnglishTenseSpec, subject: Subject, verb: Verb, marker = "") => {
  const verbForm = spec.form(verb, subject);
  if (marker === "already" && spec.key === "present-perfect") {
    const [auxiliary, ...rest] = verbForm.split(" ");
    return `${subject.text} ${auxiliary} already ${rest.join(" ")} ${verb.object}.`;
  }
  return `${subject.text} ${verbForm} ${verb.object}${marker ? ` ${marker}` : ""}.`;
};

const rotateWords = <T,>(items: T[], shift: number) => items.map((_, index) => items[(index + shift) % items.length]);

const uniqueSequenceTokens = (sentence: string) => {
  const words = sentence.replace(/[.!?]/gu, "").split(/\s+/u);
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (let index = 0; index < words.length; index += 1) {
    let token = words[index];
    if (seen.has(token.toLowerCase()) && index + 1 < words.length) {
      token = `${token} ${words[index + 1]}`;
      index += 1;
    }
    tokens.push(token);
    seen.add(token.toLowerCase());
  }
  const occurrences = new Map<string, number>();
  return tokens.map((token) => {
    const key = token.toLowerCase();
    const occurrence = occurrences.get(key) ?? 0;
    occurrences.set(key, occurrence + 1);
    return occurrence === 0 ? token : `${token}${"\u2060".repeat(occurrence)}`;
  });
};

const contractionVariants = (answer: string) => {
  const variants = [answer];
  if (answer.includes("will not")) variants.push(answer.replaceAll("will not", "won't"));
  if (answer.includes("do not")) variants.push(answer.replaceAll("do not", "don't"));
  if (answer.includes("does not")) variants.push(answer.replaceAll("does not", "doesn't"));
  if (answer.includes("is not")) variants.push(answer.replaceAll("is not", "isn't"));
  if (answer.includes("are not")) variants.push(answer.replaceAll("are not", "aren't"));
  if (answer.includes("was not")) variants.push(answer.replaceAll("was not", "wasn't"));
  if (answer.includes("were not")) variants.push(answer.replaceAll("were not", "weren't"));
  return Array.from(new Set(variants));
};

const translationMarker = (spec: EnglishTenseSpec) => {
  switch (spec.key) {
    case "present-simple": return "usually";
    case "present-continuous": return "now";
    case "present-perfect": return "already";
    case "present-perfect-continuous": return "for some time";
    case "past-simple": return "yesterday";
    case "past-continuous": return "at that moment";
    case "past-perfect": return "before another event";
    case "past-perfect-continuous": return "for some time before that";
    case "future-simple": return "tomorrow";
    case "future-continuous": return "at this time tomorrow";
    case "future-perfect": return "by this time";
    case "future-perfect-continuous": return "for some time by this time";
    default: return "";
  }
};

const markerTaskByTense: Record<string, { english: string; russian: string }> = {
  "present-simple": { english: "usually", russian: "обычно" },
  "present-continuous": { english: "right now", russian: "прямо сейчас" },
  "present-perfect": { english: "already", russian: "уже" },
  "present-perfect-continuous": { english: "for two hours", russian: "уже два часа" },
  "past-simple": { english: "yesterday", russian: "вчера" },
  "past-continuous": { english: "at that moment", russian: "в тот момент" },
  "past-perfect": { english: "before the meeting started", russian: "до начала встречи" },
  "past-perfect-continuous": { english: "for two hours before the test", russian: "два часа до теста" },
  "future-simple": { english: "tomorrow", russian: "завтра" },
  "future-continuous": { english: "at this time tomorrow", russian: "завтра в это время" },
  "future-perfect": { english: "by Friday", russian: "к пятнице" },
  "future-perfect-continuous": { english: "for two hours by Friday", russian: "уже два часа к пятнице" },
};

const buildTenseQuestion = (
  spec: EnglishTenseSpec,
  topic: TopicMeta,
  subject: Subject,
  verb: Verb,
  index: number,
  id: string,
  markerIndex = index,
): Question => {
  const marker = spec.markers[markerIndex % spec.markers.length];
  const correctForm = spec.form(verb, subject);
  const translationEnglish = englishSentence(spec, subject, verb, translationMarker(spec));
  const russian = russianSentence(spec, subject, verb);
  const explanationLead = spec.explanation.split(/(?<=[.!?])\s+/u)[0].replace(/[.!?]$/u, "");
  const safeMarker = marker.replace(/\./gu, "");
  const explanationContext = topic.key === englishTenseMixedTopic.key ? "В смешанном экзаменационном варианте" : "В этом примере";
  const explanation = `${explanationLead}. ${explanationContext} маркер «${safeMarker}» и смысл фразы «${russian.slice(0, -1)}» требуют формы «${correctForm}».`;
  const taskOffset = [...spec.key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const kind: TenseTaskKind = taskKinds[(index + taskOffset) % taskKinds.length];
  const instruction = (text: string) => text;
  const mixedContext = topic.key === englishTenseMixedTopic.key
    ? ["During the workshop", "In the weekly report", "At the evening class", "Before the meeting", "On the project timeline"][index % 5]
    : "";
  const promptContext = mixedContext ? `${mixedContext}: ` : "";
  const common = {
    id,
    topic: topic.title,
    difficulty: (index < 45 ? "easy" : index < 125 ? "medium" : "hard") as Question["difficulty"],
    explanation,
    source,
    tags: ["english", "grammar", "tenses", spec.key, "a2-b1"],
    // Keep the game-facing label useful to a learner; internal question IDs stay internal.
    meta: { concept: `${subject.text}: ${spec.title} — ${verb.base}`, englishCategory: "grammar", tenseKey: spec.key },
  };

  if (kind === "choice") {
    const options = optionOrder(correctForm, spec.distractors(verb, subject), index + 1);
    return { ...common, type: "single", question: `${promptContext}${instruction("Choose the correct verb form")}: ${subject.text} ___ ${verb.object} ${marker}?`, options, correct: options.find((option) => option.isCorrect)?.id ?? "option-1" } satisfies Question;
  }

  if (kind === "form-fill") {
    return { ...common, type: "fill", question: `${promptContext}${instruction(`Complete the ${spec.title} sentence`)}: ${subject.text} ___ ${verb.object} ${marker}?`, options: [], correct: { prompt: "", answer: correctForm, acceptable: contractionVariants(correctForm) } } satisfies Question;
  }

  if (kind === "ru-to-en") {
    return { ...common, type: "fill", question: `${promptContext}${instruction("Translate into English")}: «${russian}»?`, options: [], correct: { prompt: "", answer: translationEnglish, acceptable: contractionVariants(translationEnglish) } } satisfies Question;
  }

  if (kind === "en-to-ru") {
    return { ...common, type: "fill", question: `${promptContext}${instruction("Translate into Russian")}: “${translationEnglish}”?`, options: [], correct: { prompt: "", answer: russian, acceptable: [russian] } } satisfies Question;
  }

  if (kind === "already-yet" && spec.key === "present-perfect") {
    const negativeSentence = `${subject.text} ${have(subject)} not ${verb.participle} ${verb.object} ___`;
    const options = optionOrder("yet", ["already", "ago", "tomorrow"], index + 1);
    return {
      ...common,
      type: "single",
      question: `${promptContext}${instruction("Choose the word that completes the negative sentence")}: ${negativeSentence}?`,
      options,
      correct: options.find((option) => option.isCorrect)?.id ?? "option-1",
      explanation: `В отрицательной фразе «${subject.text} ${have(subject)} not ${verb.participle} ${verb.object}» слово yet ставится в конце и означает «ещё». Оно показывает, что действие «${verb.object}» пока не завершено.`,
    } satisfies Question;
  }

  if (kind === "marker-choice" || kind === "already-yet") {
    const markerTask = markerTaskByTense[spec.key];
    const distractors = ["yesterday", "at the moment", "by Friday", "already", "usually"].filter((item) => item !== markerTask.english).slice(0, 3);
    const options = optionOrder(markerTask.english, distractors, index + 1);
    return {
      ...common,
      type: "single",
      question: `${promptContext}${instruction(`Choose the English time expression for «${markerTask.russian}»`)}: ${subject.text} ${correctForm} ${verb.object} ___?`,
      options,
      correct: options.find((option) => option.isCorrect)?.id ?? "option-1",
      explanation: `Выражение «${markerTask.english}» означает «${markerTask.russian}» и даёт нужную подсказку для ${spec.title}. В теме «${topic.title}» фраза «${subject.text} ${correctForm} ${verb.object}» требует именно этот смысловой маркер, а остальные варианты передают другой контекст.`,
    } satisfies Question;
  }

  const targetWords = uniqueSequenceTokens(index % 2 === 0 ? translationEnglish : russian);
  const shuffledWords = rotateWords(targetWords, (index * 3 + 1) % targetWords.length);
  const sourceText = index % 2 === 0 ? `the Russian sentence «${russian}»` : `the English sentence “${translationEnglish}”`;
  return {
    ...common,
    type: "sequence",
    question: `${promptContext}${instruction("Arrange the words into a correct")} ${index % 2 === 0 ? "English" : "Russian"} sentence from ${sourceText}?`,
    options: shuffledWords.map((text, optionIndex) => ({ id: `word-${optionIndex + 1}`, text })),
    correct: { items: shuffledWords, correctOrder: targetWords },
  } satisfies Question;
};

export const generateEnglishTenseQuestions = (): Question[] => specs.flatMap((spec) => {
  const topic = topicByKey(`english-tense-${spec.key}`);
  return subjects.flatMap((subject, subjectIndex) => verbs.map((verb, verbIndex) => {
    const index = subjectIndex * verbs.length + verbIndex;
    return buildTenseQuestion(spec, topic, subject, verb, index, `q-english-tense-${spec.key}-${String(index + 1).padStart(3, "0")}`);
  }));
});

export const generateEnglishMixedTenseQuestions = (): Question[] => Array.from({ length: 200 }, (_, index) => {
  const spec = specs[index % specs.length];
  const slot = Math.floor(index / specs.length);
  const subject = subjects[slot % subjects.length];
  const verb = verbs[Math.floor(slot / subjects.length) % verbs.length];
  return buildTenseQuestion(spec, englishTenseMixedTopic, subject, verb, index, `q-english-tenses-mixed-${String(index + 1).padStart(3, "0")}`, slot);
});
