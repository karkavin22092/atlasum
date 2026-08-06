import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { evaluateQuestion, generateQuestionBank } from "../server/question-bank.js";
import type { FillQuestion, Question, SequenceQuestion } from "../shared/types.js";

const root = process.cwd();
const dataDir = path.join(root, "data");
const file = path.join(dataDir, "questions.json");

mkdirSync(dataDir, { recursive: true });

const questions = generateQuestionBank();

const getExpectedSubmission = (question: Question) => {
  if (question.type === "fill") return (question.correct as FillQuestion).answer;
  if (question.type === "sequence") return (question.correct as SequenceQuestion).correctOrder;
  return question.correct;
};

const failedEvaluations = questions.filter(
  (question) => !evaluateQuestion(question, getExpectedSubmission(question)).isCorrect,
);

if (failedEvaluations.length > 0) {
  throw new Error(`Проверка ответов не пройдена: ${failedEvaluations.map((question) => question.id).join(", ")}`);
}

writeFileSync(file, JSON.stringify(questions, null, 2), "utf8");

console.log(`Generated and validated ${questions.length} questions at ${file}`);
