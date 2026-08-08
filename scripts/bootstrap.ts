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
const prismaClientFile = path.join(root, "node_modules", ".prisma", "client", "index.js");

if (!existsSync(envFile) && existsSync(envExample)) {
  writeFileSync(envFile, readFileSync(envExample, "utf8"), "utf8");
}

mkdirSync(path.join(root, "data"), { recursive: true });

if (!existsSync(prismaClientFile)) {
  execSync("npx prisma generate", { stdio: "inherit" });
}
execSync("npx prisma db push --skip-generate", { stdio: "inherit" });

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
      level: 1,
      streak: 0,
      bestStreak: 0,
    },
    update: {},
  });
};

const ensureQuestionBank = async () => {
  const existingQuestions = new Set((await prisma.question.findMany({ select: { id: true } })).map((question) => question.id));
  const missingQuestions = questions.filter((question) => !existingQuestions.has(question.id));

  if (missingQuestions.length > 0) {
    await prisma.question.createMany({
      data: missingQuestions.map((question) => ({
        id: question.id,
        topic: question.topic,
        difficulty: question.difficulty,
        type: question.type,
        question: question.question,
        options: question.options as never,
        correct: question.correct as never,
        explanation: question.explanation,
        source: question.source,
        tags: question.tags as never,
        meta: (question.meta ?? null) as never,
      })),
    });
  }

  const existingGeneratedQuestions = questions.filter((question) => existingQuestions.has(question.id));
  for (let index = 0; index < existingGeneratedQuestions.length; index += 100) {
    await prisma.$transaction(existingGeneratedQuestions.slice(index, index + 100).map((question) => prisma.question.update({
      where: { id: question.id },
      data: {
        topic: question.topic,
        difficulty: question.difficulty,
        type: question.type,
        question: question.question,
        options: question.options as never,
        correct: question.correct as never,
        explanation: question.explanation,
        source: question.source,
        tags: question.tags as never,
        meta: (question.meta ?? null) as never,
      },
    })));
  }

  const existingReviews = new Set((await prisma.questionReview.findMany({ select: { questionId: true } })).map((review) => review.questionId));
  const missingReviews = questions.filter((question) => !existingReviews.has(question.id));
  if (missingReviews.length > 0) {
    await prisma.questionReview.createMany({
      data: missingReviews.map((question) => ({
        questionId: question.id,
        timesAnswered: 0,
        correctCount: 0,
        easeFactor: 2.5,
        intervalDays: 0,
        mastery: 0,
        nextReviewAt: new Date(0),
      })),
    });
  }
};

await ensureProfile();
await ensureQuestionBank();

console.log("Bootstrap complete.");
