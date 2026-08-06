import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { prisma } from "../server/db.js";
import type { Question } from "@shared/types";

const root = process.cwd();
const envFile = path.join(root, ".env");
const envExample = path.join(root, ".env.example");
const dataFile = path.join(root, "data", "questions.json");
const dbFile = path.join(root, "prisma", "dev.db");

if (!existsSync(envFile) && existsSync(envExample)) {
  writeFileSync(envFile, readFileSync(envExample, "utf8"), "utf8");
}

mkdirSync(path.join(root, "data"), { recursive: true });

execSync("npx prisma generate", { stdio: "inherit" });
execSync("npx prisma db push", { stdio: "inherit" });

if (!existsSync(dataFile)) {
  execSync("tsx scripts/generate-questions.ts", { stdio: "inherit" });
}

const questions = JSON.parse(readFileSync(dataFile, "utf8")) as Question[];

const ensureProfile = async () => {
  await prisma.profile.upsert({
    where: { id: "local-user" },
    create: {
      id: "local-user",
      name: "Гость",
      xp: 0,
      coins: 0,
      level: 1,
      streak: 0,
      bestStreak: 0,
    },
    update: {},
  });
};

const ensureQuestionBank = async () => {
  const count = await prisma.question.count();
  if (count > 0) {
    return;
  }

  await prisma.question.createMany({
    data: questions.map((question) => ({
      id: question.id,
      topic: question.topic,
      difficulty: question.difficulty,
      type: question.type,
      question: question.question,
      options: question.options,
      correct: question.correct as never,
      explanation: question.explanation,
      source: question.source,
      tags: question.tags,
      meta: question.meta ?? null,
    })),
    skipDuplicates: true,
  });

  await prisma.questionReview.createMany({
    data: questions.map((question) => ({
      questionId: question.id,
      timesAnswered: 0,
      correctCount: 0,
      easeFactor: 2.5,
      intervalDays: 0,
      mastery: 0,
      nextReviewAt: new Date(0),
    })),
    skipDuplicates: true,
  });
};

await ensureProfile();
await ensureQuestionBank();

console.log("Bootstrap complete.");

