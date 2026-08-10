# Атласум

Веб-платформа для подготовки к экзаменам по информационным технологиям, компьютерной графике, менеджменту и экономике.

## Что внутри

- React + TypeScript + Vite
- TailwindCSS и Framer Motion
- React Router и React Query
- Node.js + Express + TypeScript
- SQLite через Prisma
- Локальная база вопросов в JSON и SQLite
- 4560 вопросов по 50 темам: 1560 по ИТ и графике, 1000 по менеджменту, 1000 по экономике и 1000 по английскому языку
- Экзамен, практика, режимы повторения, мини-игры, статистика и админка
- Регистрация, вход и таблица лидеров
- Общие личные сообщения между зарегистрированными участниками рейтинга

## Локальное тестирование без Git и Netlify

Для Windows сначала установите Node.js LTS. Откройте PowerShell от имени пользователя и выполните:

```powershell
winget install OpenJS.NodeJS.LTS
```

После установки полностью закройте PowerShell, откройте новое окно и проверьте:

```powershell
node --version
npm --version
```

Если команда `winget` недоступна, установите Node.js LTS с официальной страницы [nodejs.org](https://nodejs.org/en/download), затем также откройте новый PowerShell.

Обычный режим разработки не отправляет код в GitHub и не расходует build-токены Netlify:

```powershell
npm install
npm run dev
```

После запуска откройте `http://localhost:5173`. Изменения в интерфейсе применяются автоматически. Для остановки сервера нажмите `Ctrl+C`.

Чтобы локально проверить production-версию и Netlify Functions, соберите сайт на своём компьютере и запустите Netlify Dev:

```powershell
npm run build:web
npx netlify dev --dir dist/client --port 8888
```

Затем откройте `http://localhost:8888`. Локальная сборка выполняется на компьютере и не использует минуты или build-токены облачной сборки Netlify.

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
- Netlify Function и Netlify Blobs для общего рейтинга

На Netlify приложение автоматически использует локальную JSON-базу. Профили, результаты и интервальные повторения хранятся в `localStorage`, а зарегистрированные профили синхронизируются с общим рейтингом через Netlify Blobs. Поэтому участники с разных устройств видят друг друга после публикации новой версии. При локальном запуске через `npm run dev` дополнительно используется Express + Prisma + SQLite.

Личные сообщения на опубликованном сайте синхронизируются между устройствами через Netlify Blobs. В локальном режиме без Netlify они сохраняются в браузере.

### Перенос данных между Netlify-сайтами

Если новый Netlify Site был создан в другом аккаунте, его Blobs-хранилище будет пустым. Старые профили, рейтинг, сообщения, обращения, уведомления и отзывы можно перенести одноразовым скриптом. Сессии намеренно не переносятся: после переноса пользователи входят заново с прежней почтой и паролем.

В PowerShell из корня проекта:

```powershell
$env:OLD_NETLIFY_SITE_ID = "ID_СТАРОГО_SITE"
$env:NEW_NETLIFY_SITE_ID = "ID_НОВОГО_SITE"
$env:OLD_NETLIFY_AUTH_TOKEN = "ТОКЕН_АККАУНТА_СТАРОГО_SITE"
$env:NEW_NETLIFY_AUTH_TOKEN = "ТОКЕН_АККАУНТА_НОВОГО_SITE"
npm.cmd run migrate:netlify
npm.cmd run migrate:netlify -- --apply
```

Первая команда делает проверочный запуск без записи. Скрипт сохраняет уже существующие ключи нового сайта; для намеренного перезаписывания добавьте `--overwrite`. Site ID находятся в Netlify: Site configuration -> General -> Site details. Если оба сайта доступны одному аккаунту или команде, вместо двух токенов можно задать один `NETLIFY_AUTH_TOKEN`.

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

Админ-панель `/admin` доступна только авторизованному пользователю с ником `lonexnesss`. Она позволяет:

- добавлять вопросы
- редактировать вопросы
- удалять вопросы
- импортировать JSON
- экспортировать JSON

## Примечание

База вопросов и личная статистика хранятся локально, общий рейтинг - в бесплатном хранилище Netlify Blobs. Никакие платные API не используются.
