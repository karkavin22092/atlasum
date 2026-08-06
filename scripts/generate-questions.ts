import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { generateQuestionBank } from "../server/question-bank.js";

const root = process.cwd();
const dataDir = path.join(root, "data");
const file = path.join(dataDir, "questions.json");

mkdirSync(dataDir, { recursive: true });

const questions = generateQuestionBank();
writeFileSync(file, JSON.stringify(questions, null, 2), "utf8");

console.log(`Generated ${questions.length} questions at ${file}`);

