import type { Question, TopicMeta } from "@shared/types";
import { englishTenseTopicCatalog, generateEnglishMixedTenseQuestions, generateEnglishTenseQuestions } from "./english-tenses-content";

export const englishTopicCatalog: Array<TopicMeta & { concepts: never[]; process: string[]; imageSet: string[] }> = [
  { key: "english-academic-vocabulary", title: "Академическая и научная лексика", description: "Лексика для учебных, научных и исследовательских текстов.", source: "Программа экзамена по английскому языку, 2025", color: "from-rose-400 to-fuchsia-600", subject: "english", concepts: [], process: [], imageSet: [] },
  { key: "english-business-vocabulary", title: "Деловая и экономическая лексика", description: "Лексика для делового общения, рынка и экономики.", source: "Программа экзамена по английскому языку, 2025", color: "from-rose-400 to-fuchsia-600", subject: "english", concepts: [], process: [], imageSet: [] },
  { key: "english-collocations", title: "Сочетаемость и фразовые глаголы", description: "Устойчивые сочетания и фразовые глаголы уровня B2.", source: "Программа экзамена по английскому языку, 2025", color: "from-rose-400 to-fuchsia-600", subject: "english", concepts: [], process: [], imageSet: [] },
  { key: "english-tenses", title: "Времена и согласование времен", description: "Временные формы и их связь в контексте.", source: "Программа экзамена по английскому языку, 2025", color: "from-rose-400 to-fuchsia-600", subject: "english", concepts: [], process: [], imageSet: [] },
  { key: "english-voice-modals", title: "Залог и модальные глаголы", description: "Пассивный залог, модальные значения и их формы.", source: "Программа экзамена по английскому языку, 2025", color: "from-rose-400 to-fuchsia-600", subject: "english", concepts: [], process: [], imageSet: [] },
  { key: "english-nonfinite", title: "Инфинитив, герундий и причастия", description: "Неличные формы глагола в академическом контексте.", source: "Программа экзамена по английскому языку, 2025", color: "from-rose-400 to-fuchsia-600", subject: "english", concepts: [], process: [], imageSet: [] },
  { key: "english-articles-pronouns", title: "Артикли и местоимения", description: "Выбор артиклей, определителей и местоимений.", source: "Программа экзамена по английскому языку, 2025", color: "from-rose-400 to-fuchsia-600", subject: "english", concepts: [], process: [], imageSet: [] },
  { key: "english-comparison", title: "Степени сравнения", description: "Сравнительные конструкции и усилители значения.", source: "Программа экзамена по английскому языку, 2025", color: "from-rose-400 to-fuchsia-600", subject: "english", concepts: [], process: [], imageSet: [] },
  { key: "english-conditionals", title: "Условные предложения", description: "Реальные, нереальные и смешанные условия.", source: "Программа экзамена по английскому языку, 2025", color: "from-rose-400 to-fuchsia-600", subject: "english", concepts: [], process: [], imageSet: [] },
  { key: "english-clauses", title: "Сложноподчиненные предложения", description: "Союзы, относительные и придаточные предложения.", source: "Программа экзамена по английскому языку, 2025", color: "from-rose-400 to-fuchsia-600", subject: "english", concepts: [], process: [], imageSet: [] },
  { key: "english-reported-speech", title: "Прямая и косвенная речь", description: "Передача высказываний, вопросов и просьб.", source: "Программа экзамена по английскому языку, 2025", color: "from-rose-400 to-fuchsia-600", subject: "english", concepts: [], process: [], imageSet: [] },
  { key: "english-text-skills", title: "Термины и связность текста", description: "Соответствия терминов и восстановление логики текста.", source: "Программа экзамена по английскому языку, 2025", color: "from-rose-400 to-fuchsia-600", subject: "english", concepts: [], process: [], imageSet: [] },
  ...englishTenseTopicCatalog.map((topic) => ({ ...topic, concepts: [], process: [], imageSet: [] })),
];

type ChoiceSeed = { sentence: string; answer: string; distractors: [string, string, string]; explanation: string; topic: string };

const academic = "Академическая и научная лексика";
const business = "Деловая и экономическая лексика";
const grammar = "Времена и согласование времен";
const source = "Программа экзамена по английскому языку, 2025";

const vocabulary: ChoiceSeed[] = [
  ["The results provide strong ___ for the proposed model.", "evidence", "advice", "occasion", "permission", "Evidence is information that supports a claim; the other options do not fit the meaning of research results."],
  ["The researchers reached a clear ___ after comparing the data.", "conclusion", "condition", "competition", "contribution", "A conclusion is the final judgement drawn from evidence after an analysis."],
  ["The survey included a representative ___ of first-year students.", "sample", "example", "selection", "part", "A sample is the group selected from a larger population for a study."],
  ["The report identifies a significant ___ between income and education.", "correlation", "conflict", "contrast", "consequence", "Correlation describes a statistical relationship between two variables."],
  ["The author supports the argument by ___ several recent studies.", "citing", "mentioning", "quoting", "referring", "To cite a study is to name it as a formal source of support for an argument."],
  ["The experiment was repeated to ___ the original findings.", "verify", "avoid", "predict", "replace", "To verify findings means to check that they are accurate or reproducible."],
  ["The new data may ___ the earlier interpretation.", "challenge", "assure", "prevent", "protect", "To challenge an interpretation is to cast doubt on it with new evidence."],
  ["The article gives a brief ___ of the research method.", "overview", "inspection", "review", "vision", "An overview is a short general description rather than a detailed analysis."],
  ["The theory is based on a set of basic ___.", "assumptions", "instructions", "expectations", "attitudes", "Assumptions are ideas accepted as a starting point for reasoning."],
  ["The study has several ___, including its small sample size.", "limitations", "permissions", "circumstances", "requirements", "Limitations are factors that restrict what a study can reliably show."],
  ["The findings are ___ with previous research in this area.", "consistent", "familiar", "similar", "regular", "Consistent means in agreement with earlier results or evidence."],
  ["The team used a ___ approach that combined interviews and statistics.", "mixed-methods", "double-sided", "two-level", "joint", "A mixed-methods approach combines qualitative and quantitative research methods."],
  ["The hypothesis was not ___ by the available evidence.", "supported", "supplied", "suggested", "surrounded", "Evidence supports a hypothesis when the results are compatible with its prediction."],
  ["The researchers tried to ___ bias in the questionnaire.", "minimize", "decrease", "remove", "reduce", "Minimize is the standard academic verb for making an unwanted effect as small as possible."],
  ["The paper makes a useful ___ to the debate.", "contribution", "communication", "comparison", "connection", "A contribution is a valuable addition to a field of knowledge or discussion."],
  ["The data were collected over a five-year ___.", "period", "season", "stage", "moment", "A period is a defined length of time used for observation or measurement."],
  ["The model can be applied to a wide ___ of practical problems.", "range", "degree", "scope", "scale", "The phrase 'a wide range of' means many different kinds of something."],
  ["The paper ___ the need for further investigation.", "highlights", "brightens", "marks", "focuses", "To highlight a need is to draw special attention to it."],
  ["The conclusion should be treated with ___ because the data are limited.", "caution", "attention", "care", "warning", "Caution is needed when evidence is insufficient for a strong conclusion."],
  ["The findings were published in a ___ journal.", "peer-reviewed", "well-read", "double-checked", "expert-led", "A peer-reviewed journal evaluates submissions through independent academic reviewers."],
  ["The company plans to ___ production next year.", "expand", "extend", "increase", "develop", "Expand production is the usual collocation for increasing productive capacity."],
  ["Higher costs may ___ the firm's profit margin.", "reduce", "damage", "lower", "destroy", "Costs reduce a profit margin because they take away from revenue."],
  ["The manager asked for a detailed ___ of the project risks.", "assessment", "estimate", "inspection", "measurement", "An assessment is a systematic evaluation, here of the risks involved."],
  ["The firm gained a competitive ___ by improving delivery time.", "advantage", "benefit", "success", "priority", "A competitive advantage is a feature that helps a firm perform better than rivals."],
  ["The policy is intended to ___ investment in new technology.", "encourage", "allow", "support", "persuade", "Encourage investment means to create conditions that make investment more likely."],
  ["The market has shown steady ___ over the last quarter.", "growth", "increase", "rise", "development", "Growth is the standard noun for a sustained expansion of a market or economy."],
  ["The supplier failed to meet the agreed ___.", "deadline", "schedule", "timetable", "date", "A deadline is the latest agreed time by which work must be completed."],
  ["The board approved the annual ___ for the new department.", "budget", "balance", "account", "cost", "A budget is a planned allocation of money for a period or project."],
  ["The company needs to ___ its customer base.", "retain", "hold", "keep", "save", "Retain customers is the established business collocation for keeping existing customers."],
  ["The contract includes a clause on data ___.", "confidentiality", "privacy", "security", "protection", "Confidentiality means that information must not be disclosed to unauthorized people."],
  ["The company decided to ___ the launch until the software was stable.", "postpone", "delay", "cancel", "suspend", "Postpone means to arrange for something planned to happen at a later time."],
  ["The partners reached an ___ after several rounds of talks.", "agreement", "arrangement", "appointment", "understanding", "Reach an agreement is the usual expression for successfully concluding negotiations."],
  ["The proposal is financially ___ only if demand remains high.", "viable", "possible", "useful", "profitable", "Viable means capable of working successfully in practice, including financially."],
  ["The firm is trying to ___ its dependence on one supplier.", "reduce", "limit", "decrease", "weaken", "Reduce dependence is the standard way to describe lowering reliance on one source."],
  ["The campaign aims to raise public ___ of the service.", "awareness", "knowledge", "attention", "interest", "Awareness is knowledge that something exists or is important."],
  ["The CEO will ___ the proposal at the next meeting.", "put forward", "bring up", "take over", "look into", "Put forward means to formally present an idea or proposal for consideration."],
  ["The consultant was asked to ___ a report by Friday.", "draw up", "set up", "take up", "make up", "Draw up means to prepare an official document such as a report or contract."],
  ["The team needs to ___ the cause of the error.", "look into", "look after", "look down on", "look forward to", "Look into means to investigate a problem or situation."],
  ["The company had to ___ the outdated equipment.", "phase out", "put off", "turn down", "break out", "Phase out means to remove something gradually rather than all at once."],
  ["The new rule will ___ in force next month.", "come", "go", "take", "bring", "The fixed expression is 'come into force' for a rule that starts to apply."],
  ["The customer decided to ___ the offer because the terms were unclear.", "turn down", "give up", "take on", "call off", "Turn down means to reject an offer or proposal."],
  ["The figures should be ___ with last year's results.", "compared", "measured", "tested", "counted", "Compare figures with earlier results to identify change or difference."],
  ["The firm wants to ___ a new market in Asia.", "enter", "join", "attend", "arrive", "A company enters a market when it begins selling or operating there."],
  ["The decision will have a long-term ___ on employment.", "impact", "effect", "influence", "result", "Impact is the strongest and most common collocation for a significant effect in this context."],
  ["The analyst gave a realistic ___ of future demand.", "forecast", "prediction", "expectation", "prospect", "A forecast is an informed statement about what is likely to happen in the future."],
  ["The price increase was a direct ___ of higher transport costs.", "result", "reason", "effect", "cause", "A result is an outcome caused by an earlier event; higher costs are the cause here."],
  ["The government introduced measures to ___ inflation.", "tackle", "handle", "solve", "manage", "Tackle is the standard verb for taking action against a serious problem such as inflation."],
  ["The business must ___ with environmental regulations.", "comply", "agree", "adapt", "match", "Comply with means to act according to a rule, law, or regulation."],
  ["The department is responsible for ___ customer complaints.", "handling", "dealing", "solving", "working", "Handle complaints is the usual collocation for managing them as part of a job."],
  ["The project depends ___ obtaining external funding.", "on", "from", "at", "with", "The adjective 'dependent' and the verb 'depend' are followed by the preposition 'on'."],
].map(([sentence, answer, first, second, third, explanation], index) => ({ sentence, answer, distractors: [first, second, third], explanation, topic: index >= 35 ? "Сочетаемость и фразовые глаголы" : sentence.includes("company") || sentence.includes("market") || sentence.includes("firm") || sentence.includes("business") || sentence.includes("supplier") || sentence.includes("customer") || sentence.includes("contract") || sentence.includes("CEO") || sentence.includes("government") ? business : academic }));

const grammarSeeds: ChoiceSeed[] = [
  ["By the time the lecture starts, the students ___ the reading list.", "will have received", "receive", "had received", "are receiving", "Future perfect is used for an action completed before a specified future time."],
  ["She said that she ___ the data the previous evening.", "had checked", "has checked", "was checking", "checks", "In reported speech, past simple usually shifts to past perfect when the action was earlier."],
  ["If the figures ___ reliable, we can use them in the report.", "are", "were", "will be", "had been", "The first conditional uses present simple in the if-clause for a real future possibility."],
  ["If the team ___ more time, it would revise the whole proposal.", "had", "has", "will have", "had had", "The second conditional uses past simple to describe an unreal present situation."],
  ["If they had tested the system earlier, they ___ the error.", "would have found", "will find", "would find", "had found", "The third conditional combines past perfect with would have plus past participle."],
  ["The report ___ before the meeting tomorrow.", "will be completed", "will complete", "is completing", "has completed", "The passive is required because the report receives the action of completion."],
  ["All applications ___ by an independent panel.", "are assessed", "assess", "have assessing", "are assessing", "Present simple passive describes a regular procedure performed on applications."],
  ["The results ___ yet, so no conclusion can be drawn.", "have not been published", "did not publish", "are not publishing", "had not published", "Present perfect passive links a past action with its current relevance."],
  ["You ___ cite every source used in the literature review.", "must", "might", "would", "used to", "Must expresses a strict academic requirement."],
  ["The difference ___ be caused by a change in the sample size.", "may", "should", "must", "ought", "May expresses a possible explanation without claiming certainty."],
  ["Students are expected ___ their work independently.", "to complete", "completing", "complete", "to completing", "After 'be expected', English uses the to-infinitive."],
  ["The researcher avoided ___ a claim without evidence.", "making", "to make", "make", "made", "Avoid is followed by a gerund, not an infinitive."],
  ["___ the survey, the team noticed several inconsistencies.", "While analysing", "To analyse", "Having analyse", "Analysed", "A present participle clause can show an action happening at the same time as the main action."],
  ["The documents need ___ before they are uploaded.", "checking", "to check", "check", "checked", "After 'need', a gerund can have passive meaning: the documents need to be checked."],
  ["It is essential that every participant ___ informed consent.", "give", "gives", "gave", "will give", "After 'essential that', formal English can use the subjunctive base form 'give'."],
  ["The equipment, along with the manuals, ___ stored in Room 12.", "is", "are", "were", "have", "The subject is 'equipment'; the phrase beginning with 'along with' does not change the verb number."],
  ["Neither the manager nor the assistants ___ available yesterday.", "were", "was", "has been", "is", "With neither/nor, the verb normally agrees with the nearer plural noun 'assistants'."],
  ["There is ___ useful information in the appendix.", "a great deal of", "many", "a few", "several", "Information is uncountable, so 'a great deal of' is appropriate."],
  ["The committee discussed ___ proposal in detail.", "the", "a", "an", "no article", "'The' refers to the specific proposal already known in the discussion."],
  ["___ research was conducted in several regions.", "The", "A", "An", "Some of", "The definite article is used because the sentence refers to a particular research project."],
  ["This is ___ most convincing explanation so far.", "the", "a", "an", "no article", "Superlatives normally take the definite article."],
  ["The revised method is ___ efficient than the previous one.", "more", "most", "much", "very", "A two-syllable adjective such as 'efficient' forms the comparative with 'more'."],
  ["The later results were ___ less variable than the first set.", "far", "very", "too", "enough", "Far is an intensifier that can modify a comparative form."],
  ["The manager asked ___ the report had been sent.", "whether", "that", "what", "which", "Whether introduces an indirect yes/no question."],
  ["The analyst explained ___ the figures had changed.", "why", "that", "which", "whose", "Why introduces the reason in an indirect question."],
  ["The article, ___ was published last month, has attracted attention.", "which", "that", "where", "what", "A non-defining relative clause uses 'which' and is separated by commas."],
  ["The colleague ___ advice I followed works in finance.", "whose", "who", "which", "whom", "Whose shows possession: the advice belongs to the colleague."],
  ["She asked me ___ I could send the file that day.", "if", "what", "that", "how", "If is used to report a yes/no question."],
  ["The tutor said, 'Do not copy the text.' He told us ___ the text.", "not to copy", "do not copy", "not copy", "not copying", "Reported negative commands use 'told + object + not to-infinitive'."],
  ["They said, 'We have finished.' They said that they ___ finished.", "had", "have", "were", "would", "Present perfect usually shifts back to past perfect in reported speech."],
  ["The results are ___ surprising to ignore.", "too", "enough", "so", "such", "Too plus adjective plus to-infinitive expresses an excessive degree that prevents the action."],
  ["The sample was not large enough ___ reliable conclusions.", "to support", "supporting", "support", "to supporting", "Enough plus adjective is followed by a to-infinitive to state the result or purpose."],
  ["I would rather the meeting ___ online tomorrow.", "were held", "is held", "will be held", "has been held", "After 'would rather' about another person, past simple expresses a present or future preference."],
  ["No sooner ___ the presentation started than the screen froze.", "had", "has", "did", "was", "After 'no sooner' at the start of a sentence, past perfect inversion is used."],
  ["Hardly had we arrived ___ the discussion began.", "when", "than", "that", "while", "The fixed pattern joins 'hardly' with 'when' for two closely connected past events."],
  ["The report is believed ___ by several experts.", "to have been reviewed", "to review", "having reviewed", "to be reviewing", "This passive reporting structure uses perfect infinitive because the review happened earlier."],
  ["He regrets ___ the deadline, but he cannot change it now.", "missing", "to miss", "miss", "missed", "Regret plus gerund refers to being sorry about an action already done."],
  ["Remember ___ the data before you close the program.", "to save", "saving", "save", "saved", "Remember plus to-infinitive refers to a duty that must still be performed."],
  ["The proposal ___ by the board before any funds were released.", "had been approved", "was approved", "has approved", "had approved", "Past perfect passive shows approval was completed before the later past action."],
  ["Not only ___ the figures inaccurate, but the source was outdated too.", "were", "was", "are", "have", "After negative fronting, English uses subject-auxiliary inversion; 'figures' is plural."],
].map(([sentence, answer, first, second, third, explanation], index) => ({
  sentence,
  answer,
  distractors: [first, second, third],
  explanation,
  topic: [2, 3, 4].includes(index) ? "Условные предложения"
    : index < 2 || index === 39 ? grammar
      : index < 10 ? "Залог и модальные глаголы"
        : index < 15 ? "Инфинитив, герундий и причастия"
          : index < 21 ? "Артикли и местоимения"
            : index < 23 ? "Степени сравнения"
              : index < 26 || index === 33 || index === 34 ? "Сложноподчиненные предложения"
                : index < 30 ? "Прямая и косвенная речь"
                  : "Времена и согласование времен",
}));

const contexts = ["a seminar on research methods", "an annual business review", "a university workshop", "a policy briefing", "a project meeting", "a conference presentation", "a market analysis class", "a laboratory report", "a finance case study", "a dissertation draft"];

const optionOrder = (correct: string, distractors: string[], seed: number) => {
  const values = [correct, ...distractors];
  const rotated = values.map((_, index) => values[(index + seed) % values.length]);
  return rotated.map((text, index) => ({ id: `option-${index + 1}`, text, isCorrect: text === correct }));
};

const variants = (seed: ChoiceSeed, index: number, category: "vocabulary" | "grammar", item: number): Question[] =>
  contexts.map((context, variant) => {
    const options = optionOrder(seed.answer, seed.distractors, item + variant);
    const id = `q-english-${category}-${String(index).padStart(3, "0")}-${variant + 1}`;
    return {
      id,
      topic: seed.topic,
      difficulty: variant < 3 ? "easy" : variant < 8 ? "medium" : "hard",
      type: "single",
      question: `In ${context}, choose the best option: ${seed.sentence.replace(/\.$/u, "")}?`,
      options,
      correct: options.find((option) => option.isCorrect)?.id ?? "option-1",
      explanation: `${seed.explanation} Context: ${context}.`,
      source,
      tags: ["english", category, seed.topic.toLowerCase()],
      meta: { concept: `english-${category}-${index}-${variant + 1}`, englishCategory: category },
    };
  });

const terms = [
  ["hypothesis", "a testable prediction about the relationship between variables"],
  ["methodology", "the overall system of methods used in a study"],
  ["variable", "a factor that can change or take different values"],
  ["validity", "the extent to which a method measures what it claims to measure"],
  ["reliability", "the consistency of a measurement or research result"],
  ["stakeholder", "a person or group affected by an organisation's decisions"],
  ["revenue", "money earned by a business from selling goods or services"],
  ["expenditure", "money spent by an organisation or government"],
  ["inflation", "a general increase in prices over time"],
  ["incentive", "something that encourages a person or organisation to act"],
  ["benchmark", "a standard used to compare performance or quality"],
  ["sustainability", "the ability to continue an activity without exhausting resources"],
  ["innovation", "a new idea, method, or product introduced into use"],
  ["regulation", "an official rule that controls an activity"],
  ["productivity", "the amount produced for a given amount of input"],
  ["constraint", "a limit that restricts what can be done"],
  ["outcome", "the result produced by an action or process"],
  ["framework", "a basic structure that supports analysis or decision-making"],
  ["coherence", "logical connection between the parts of a text"],
  ["paraphrase", "a restatement of an idea in different words"],
] as const;

const matchingQuestions = (): Question[] => Array.from({ length: 50 }, (_, index) => {
  const selected = Array.from({ length: 4 }, (_, offset) => terms[(index + offset * 3) % terms.length]);
  const left = selected.map(([term]) => term);
  const right = selected.map(([, definition], offset) => selected[(offset + index + 1) % selected.length][1] ?? definition);
  const pairs = selected.map(([leftTerm, definition]) => ({ left: leftTerm, right: definition }));
  return {
    id: `q-english-matching-${String(index + 1).padStart(3, "0")}`,
    topic: "Термины и связность текста",
    difficulty: index < 15 ? "easy" : index < 38 ? "medium" : "hard",
    type: "matching",
    question: `Match the four academic or economic terms with their definitions in set ${index + 1}?`,
    options: left.map((text, optionIndex) => ({ id: `left-${optionIndex + 1}`, text })),
    correct: pairs,
    explanation: `Each definition identifies the central function of its term in set ${index + 1}; match meaning rather than a familiar-looking word.`,
    source,
    tags: ["english", "matching", "terms"],
    meta: { concept: `english-matching-${index + 1}`, englishCategory: "matching", left, right },
  };
});

const sequenceTopics = ["a research abstract", "a funding proposal", "a market report", "a laboratory summary", "a conference email", "a policy memo", "a literature review", "a project update", "a business case", "a data commentary"];

const sequenceQuestions = (): Question[] => Array.from({ length: 50 }, (_, index) => {
  const label = sequenceTopics[index % sequenceTopics.length];
  const steps = [
    `State the purpose of ${label}.`,
    "Present the main evidence or method.",
    "Explain the key result or implication.",
    "Finish with the next action or conclusion.",
  ];
  const shuffled = steps.map((_, offset) => steps[(offset + index + 1) % steps.length]);
  return {
    id: `q-english-sequence-${String(index + 1).padStart(3, "0")}`,
    topic: "Термины и связность текста",
    difficulty: index < 15 ? "easy" : index < 38 ? "medium" : "hard",
    type: "sequence",
    question: `Put the sentences in the most logical order for ${label} number ${index + 1}?`,
    options: shuffled.map((text, optionIndex) => ({ id: `step-${optionIndex + 1}`, text })),
    correct: { items: shuffled, correctOrder: steps },
    explanation: `In text ${index + 1}, a clear ${label} moves from purpose to evidence, then interpretation, and ends with a conclusion or action.`,
    source,
    tags: ["english", "sequence", "text-cohesion"],
    meta: { concept: `english-sequence-${index + 1}`, englishCategory: "sequence", steps },
  };
});

export const generateEnglishQuestionBank = (): Question[] => [
  ...vocabulary.flatMap((seed, index) => variants(seed, index + 1, "vocabulary", index)),
  ...grammarSeeds.flatMap((seed, index) => variants(seed, index + 1, "grammar", index)),
  ...generateEnglishTenseQuestions(),
  ...generateEnglishMixedTenseQuestions(),
  ...matchingQuestions(),
  ...sequenceQuestions(),
];
