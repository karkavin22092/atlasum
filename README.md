# Exam Quest

Веб-платформа для подготовки к экзамену по дисциплине "Информационные технологии и компьютерная графика".

## Что внутри

- React + TypeScript + Vite
- TailwindCSS и Framer Motion
- React Router и React Query
- Node.js + Express + TypeScript
- SQLite через Prisma
- Локальная база вопросов в JSON и SQLite
- Более 1500 сгенерированных вопросов
- Экзамен, практика, режимы повторения, мини-игры, статистика и админка

## Запуск

```bash
npm install
npm run dev
```

Первый запуск автоматически:

- создаст `.env`, если его нет
- сгенерирует `data/questions.json`
- выполнит `prisma generate`
- применит схему SQLite
- заполнит базу вопросами

После этого приложение будет доступно:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## Netlify

Для деплоя фронтенда на Netlify уже добавлены:

- `netlify.toml`
- SPA redirect на `index.html`
- publish directory `dist/client`

Важно: текущий проект содержит отдельный Express backend. Netlify может раздать фронтенд, но сам по себе не поднимет этот сервер и SQLite-процесс как постоянное приложение. Для полной full-stack-работы backend нужно держать отдельно или переносить в serverless-функции.

## Полезные команды

```bash
npm run build
npm run lint:types
npm run questions:build
npm run db:push
```

## Структура

- `src/` - фронтенд
- `server/` - Express API и логика выборки вопросов
- `shared/` - общие типы
- `scripts/` - генерация JSON и bootstrap
- `prisma/` - Prisma schema и SQLite база
- `data/` - JSON база вопросов

## Админка

Откройте `/admin`, чтобы:

- добавлять вопросы
- редактировать вопросы
- удалять вопросы
- импортировать JSON
- экспортировать JSON

## Примечание

База вопросов и статистика хранятся локально. Никакие платные API не используются.
