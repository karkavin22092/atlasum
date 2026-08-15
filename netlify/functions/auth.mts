import { getStore } from "@netlify/blobs";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { clearSessionCookie, createSessionCookie, getSessionToken } from "./session-token.mjs";

const interfaceColors = ["ocean", "pink", "violet", "mint", "amber", "coral"] as const;
type InterfaceColor = (typeof interfaceColors)[number];
const isInterfaceColor = (value: unknown): value is InterfaceColor => interfaceColors.includes(value as InterfaceColor);

type StoredUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string | null;
  interfaceColor?: InterfaceColor;
  privacyAcceptedAt?: string;
  bannedAt?: string;
  banReason?: string;
  createdAt: string;
};

const usersStore = () => getStore({ name: "design-tests-auth-users", consistency: "strong" });
const namesStore = () => getStore({ name: "design-tests-auth-names", consistency: "strong" });
const sessionsStore = () => getStore({ name: "design-tests-auth-sessions", consistency: "strong" });
const loginAttemptsStore = () => getStore({ name: "design-tests-login-attempts", consistency: "strong" });
const reviewsStore = () => getStore({ name: "design-tests-reviews", consistency: "strong" });
const DELETED_NAMES = new Set(["test"]);
const RESERVED_NAMES = new Set(["lonexnesss"]);
const ADMIN_ID = "lonexnesss";
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 128;
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const SCRYPT_N = 32_768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;

const jsonError = (message: string, status: number) => Response.json({ error: message }, { status });

const normalizeEmail = (value: unknown) => String(value ?? "").trim().toLowerCase().slice(0, 160);
const normalizeName = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
const cleanUserId = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-zа-я0-9-]+/giu, "-").slice(0, 80);
const slugify = (value: string) => value.toLowerCase().replace(/[^a-zа-я0-9]+/giu, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const hashHex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const legacyPasswordHash = (email: string, password: string) => hashHex(`${email}:design-tests:${password}`);
const emailKey = (email: string) => hashHex(email);
const nameKey = (name: string) => slugify(name);
const publicUser = ({ passwordHash: _passwordHash, privacyAcceptedAt: _privacyAcceptedAt, ...user }: StoredUser) => user;

const validPassword = (password: string) => {
  if (password.length < PASSWORD_MIN_LENGTH) return `Пароль должен содержать минимум ${PASSWORD_MIN_LENGTH} символов`;
  if (password.length > PASSWORD_MAX_LENGTH) return "Пароль слишком длинный";
  return "";
};

const deriveScryptKey = (password: string, salt: Buffer, keyLength: number) => new Promise<Buffer>((resolve, reject) => {
  scryptCallback(password, salt, keyLength, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  }, (error, derived) => error ? reject(error) : resolve(derived));
});

const hashPassword = async (password: string) => {
  const salt = randomBytes(16);
  const derived = await deriveScryptKey(password, salt, SCRYPT_KEY_LENGTH);
  return ["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("base64"), derived.toString("base64")].join("$");
};

const verifyPassword = async (storedHash: string, email: string, password: string) => {
  if (storedHash.startsWith("scrypt$")) {
    const [scheme, nValue, rValue, pValue, saltValue, digestValue] = storedHash.split("$");
    const N = Number(nValue);
    const r = Number(rValue);
    const p = Number(pValue);
    if (scheme !== "scrypt" || N !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P || !saltValue || !digestValue) return { valid: false, needsUpgrade: false };
    const expected = Buffer.from(digestValue, "base64");
    const salt = Buffer.from(saltValue, "base64");
    if (expected.length !== SCRYPT_KEY_LENGTH || salt.length < 16) return { valid: false, needsUpgrade: false };
    const actual = await deriveScryptKey(password, salt, expected.length);
    return { valid: timingSafeEqual(actual, expected), needsUpgrade: false };
  }

  if (!/^[a-f0-9]{64}$/iu.test(storedHash)) return { valid: false, needsUpgrade: false };
  const expected = Buffer.from(storedHash, "hex");
  const actual = Buffer.from(await legacyPasswordHash(email, password), "hex");
  return { valid: expected.length === actual.length && timingSafeEqual(actual, expected), needsUpgrade: true };
};

type LoginAttempt = { count: number; lockedUntil: string | null; updatedAt: string };
const clientAddress = (request: Request) => (request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "unknown").trim().slice(0, 160);
const loginAttemptKey = (request: Request, email: string) => hashHex(`login:${email}:${clientAddress(request)}`);
const currentLock = (attempt: LoginAttempt | null) => attempt?.lockedUntil && Date.parse(attempt.lockedUntil) > Date.now() ? attempt.lockedUntil : null;

const loginLockedResponse = (lockedUntil: string) => {
  const seconds = Math.max(1, Math.ceil((Date.parse(lockedUntil) - Date.now()) / 1000));
  return Response.json({ error: "Слишком много попыток входа. Повторите позже." }, { status: 429, headers: { "Retry-After": String(seconds) } });
};

const recordLoginFailure = async (request: Request, email: string) => {
  const key = await loginAttemptKey(request, email);
  const store = loginAttemptsStore();
  const current = await store.get(key, { type: "json", consistency: "strong" }) as LoginAttempt | null;
  const now = new Date();
  const isRecent = current?.updatedAt && Date.parse(current.updatedAt) > now.getTime() - LOGIN_LOCK_MS;
  const count = currentLock(current) ? LOGIN_ATTEMPT_LIMIT : (isRecent ? current?.count ?? 0 : 0) + 1;
  const lockedUntil = count >= LOGIN_ATTEMPT_LIMIT ? new Date(now.getTime() + LOGIN_LOCK_MS).toISOString() : null;
  await store.setJSON(key, { count, lockedUntil, updatedAt: now.toISOString() } satisfies LoginAttempt);
  return lockedUntil;
};

const clearLoginFailures = async (request: Request, email: string) => loginAttemptsStore().delete(await loginAttemptKey(request, email));

const authenticatedResponse = async (user: StoredUser, status = 200) => {
  if (user.bannedAt) return Response.json({ ...publicUser(user), banned: true, error: `Аккаунт заблокирован. Причина: ${user.banReason ?? "нарушение правил платформы"}` }, { status: 403 });
  const authToken = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
  await sessionsStore().setJSON(await hashHex(authToken), {
    userId: user.id,
    email: user.email,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  });
  return Response.json(publicUser(user), { status, headers: { "Set-Cookie": createSessionCookie(authToken) } });
};

const validateIdentity = (name: string, email: string) => {
  if (name.length < 2) return "Имя должно содержать минимум 2 символа";
  if (!nameKey(name) || DELETED_NAMES.has(name.toLowerCase())) return "Это имя недоступно";
  if (!/^\S+@\S+\.\S+$/.test(email)) return "Введите корректную электронную почту";
  return "";
};

const createSharedUser = async ({ name, email, hash, createdAt, avatarUrl, interfaceColor, privacyAcceptedAt }: { name: string; email: string; hash: string; createdAt?: string; avatarUrl?: string | null; interfaceColor?: InterfaceColor; privacyAcceptedAt?: string }) => {
  const identityError = validateIdentity(name, email);
  if (identityError) return jsonError(identityError, 400);
  if (!hash.startsWith("scrypt$")) return jsonError("Некорректные данные пароля", 400);

  const users = usersStore();
  const names = namesStore();
  const [emailId, normalizedNameKey] = await Promise.all([emailKey(email), Promise.resolve(nameKey(name))]);
  const [existingUser, existingNameOwner] = await Promise.all([
    users.get(emailId, { type: "json", consistency: "strong" }) as Promise<StoredUser | null>,
    names.get(normalizedNameKey, { consistency: "strong" }),
  ]);

  if (existingUser) return jsonError("Пользователь с такой почтой уже зарегистрирован", 409);
  if (existingNameOwner) return jsonError("Это имя уже занято", 409);
  if (RESERVED_NAMES.has(name.toLowerCase())) return jsonError("Это имя зарезервировано", 409);

  const user: StoredUser = {
    id: nameKey(name),
    name,
    email,
    passwordHash: hash,
    avatarUrl: avatarUrl && avatarUrl.startsWith("data:image/") && avatarUrl.length <= 350_000 ? avatarUrl : null,
    interfaceColor: isInterfaceColor(interfaceColor) ? interfaceColor : "ocean",
    privacyAcceptedAt,
    createdAt: createdAt && !Number.isNaN(Date.parse(createdAt)) ? new Date(createdAt).toISOString() : new Date().toISOString(),
  };
  const claimedName = await names.set(normalizedNameKey, emailId, { onlyIfNew: true });
  if (!claimedName.modified) return jsonError("Это имя уже занято", 409);
  const createdUser = await users.setJSON(emailId, user, { onlyIfNew: true });
  if (!createdUser.modified) {
    await names.delete(normalizedNameKey);
    return jsonError("Пользователь с такой почтой уже зарегистрирован", 409);
  }
  return authenticatedResponse(user, 201);
};

export default async (request: Request) => {
  try {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
    const payload = await request.json() as { action?: string; name?: string; email?: string; password?: string; createdAt?: string; authToken?: string; avatarUrl?: string | null; interfaceColor?: InterfaceColor; privacyAccepted?: boolean; userId?: string; reason?: string };
    const action = String(payload.action ?? "");
    const email = normalizeEmail(payload.email);

    if (action === "login") {
      const password = String(payload.password ?? "");
      if (!email || !password) return jsonError("Введите почту и пароль", 400);
      const attemptKey = await loginAttemptKey(request, email);
      const attempt = await loginAttemptsStore().get(attemptKey, { type: "json", consistency: "strong" }) as LoginAttempt | null;
      const lockedUntil = currentLock(attempt);
      if (lockedUntil) return loginLockedResponse(lockedUntil);
      const user = await usersStore().get(await emailKey(email), { type: "json", consistency: "strong" }) as StoredUser | null;
      const verified = user ? await verifyPassword(user.passwordHash, email, password) : { valid: false, needsUpgrade: false };
      if (!user || !verified.valid) {
        const failedLock = await recordLoginFailure(request, email);
        return failedLock ? loginLockedResponse(failedLock) : jsonError("Неверная почта или пароль", 401);
      }
      await clearLoginFailures(request, email);
      if (verified.needsUpgrade) {
        user.passwordHash = await hashPassword(password);
        await usersStore().setJSON(await emailKey(email), user);
      }
      return authenticatedResponse(user);
    }

    if (action === "session") {
      const token = getSessionToken(request);
      const session = token ? await sessionsStore().get(await hashHex(token), { type: "json", consistency: "strong" }) as { email?: string; expiresAt?: string } | null : null;
      if (!session?.email || !session.expiresAt || Date.parse(session.expiresAt) <= Date.now()) return jsonError("Сессия истекла", 401);
      const user = await usersStore().get(await emailKey(session.email), { type: "json", consistency: "strong" }) as StoredUser | null;
      if (!user) return jsonError("Аккаунт не найден", 404);
      if (user.bannedAt) return Response.json({ ...publicUser(user), banned: true, error: `Аккаунт заблокирован. Причина: ${user.banReason ?? "нарушение правил платформы"}` }, { status: 403 });
      return Response.json(publicUser(user));
    }

    if (action === "logout") {
      const token = getSessionToken(request);
      if (token) await sessionsStore().delete(await hashHex(token));
      return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
    }

    if (action === "ban-user") {
      const token = getSessionToken(request);
      const session = token ? await sessionsStore().get(await hashHex(token), { type: "json", consistency: "strong" }) as { userId?: string; expiresAt?: string } | null : null;
      if (session?.userId !== ADMIN_ID || !session.expiresAt || Date.parse(session.expiresAt) <= Date.now()) return jsonError("Недостаточно прав", 403);
      const userId = cleanUserId(payload.userId);
      const reason = String(payload.reason ?? "").trim().slice(0, 300);
      if (!userId || userId === ADMIN_ID || reason.length < 3) return jsonError("Укажите корректного пользователя и причину блокировки", 400);
      const users = usersStore();
      const { blobs } = await users.list();
      for (const blob of blobs) {
        const candidate = await users.get(blob.key, { type: "json", consistency: "strong" }) as StoredUser | null;
        if (candidate?.id !== userId) continue;
        await users.setJSON(blob.key, { ...candidate, bannedAt: new Date().toISOString(), banReason: reason });
        await getStore({ name: "design-tests-leaderboard", consistency: "strong" }).delete(userId);
        return Response.json({ ok: true });
      }
      return jsonError("Пользователь не найден", 404);
    }

    if (action === "list-banned" || action === "unban-user") {
      const token = getSessionToken(request);
      const session = token ? await sessionsStore().get(await hashHex(token), { type: "json", consistency: "strong" }) as { userId?: string; expiresAt?: string } | null : null;
      if (session?.userId !== ADMIN_ID || !session.expiresAt || Date.parse(session.expiresAt) <= Date.now()) return jsonError("Недостаточно прав", 403);
      const users = usersStore();
      if (action === "list-banned") {
        const { blobs } = await users.list();
        const values = await Promise.all(blobs.map((blob) => users.get(blob.key, { type: "json", consistency: "strong" }) as Promise<StoredUser | null>));
        return Response.json(values.filter((user): user is StoredUser => Boolean(user?.bannedAt)).map((user) => ({ id: user.id, name: user.name, bannedAt: user.bannedAt, banReason: user.banReason ?? "Нарушение правил платформы" })).sort((left, right) => String(right.bannedAt).localeCompare(String(left.bannedAt))));
      }
      const userId = cleanUserId(payload.userId);
      const { blobs } = await users.list();
      for (const blob of blobs) {
        const candidate = await users.get(blob.key, { type: "json", consistency: "strong" }) as StoredUser | null;
        if (candidate?.id !== userId) continue;
        const { bannedAt: _bannedAt, banReason: _banReason, ...unbanned } = candidate;
        await users.setJSON(blob.key, unbanned);
        return Response.json({ ok: true });
      }
      return jsonError("Пользователь не найден", 404);
    }

    if (action === "register") {
      const name = normalizeName(payload.name);
      const password = String(payload.password ?? "");
      const passwordError = validPassword(password);
      if (passwordError) return jsonError(passwordError, 400);
      if (payload.privacyAccepted !== true) return jsonError("Подтвердите согласие на обработку персональных данных.", 400);
      return createSharedUser({ name, email, hash: await hashPassword(password), privacyAcceptedAt: new Date().toISOString() });
    }

    if (action === "update-avatar") {
      const token = getSessionToken(request);
      if (!token) return jsonError("Сессия не найдена", 401);
      const session = await sessionsStore().get(await hashHex(token), { type: "json", consistency: "strong" }) as { userId?: string; email?: string; expiresAt?: string } | null;
      if (!session?.userId || !session.expiresAt || Date.parse(session.expiresAt) <= Date.now()) return jsonError("Сессия истекла", 401);
      const avatarUrl = payload.avatarUrl == null ? null : String(payload.avatarUrl);
      if (avatarUrl && (!avatarUrl.startsWith("data:image/") || avatarUrl.length > 350_000)) return jsonError("Изображение слишком большое", 400);
      const users = usersStore();
      let key = session.email ? await emailKey(session.email) : "";
      let user = key ? await users.get(key, { type: "json", consistency: "strong" }) as StoredUser | null : null;
      if (!user) {
        const listed = await users.list();
        for (const item of listed.blobs) {
          const candidate = await users.get(item.key, { type: "json", consistency: "strong" }) as StoredUser | null;
          if (candidate?.id === session.userId) { key = item.key; user = candidate; break; }
        }
      }
      if (!user || !key) return jsonError("Профиль не найден", 404);
      const updated = { ...user, avatarUrl };
      await users.setJSON(key, updated);
      const review = await reviewsStore().get(user.id, { type: "json", consistency: "strong" }) as Record<string, unknown> | null;
      if (review) await reviewsStore().setJSON(user.id, { ...review, authorAvatarUrl: avatarUrl });
      return Response.json(publicUser(updated));
    }

    if (action === "update-interface-color") {
      const token = getSessionToken(request);
      if (!token) return jsonError("Сессия не найдена", 401);
      const session = await sessionsStore().get(await hashHex(token), { type: "json", consistency: "strong" }) as { userId?: string; email?: string; expiresAt?: string } | null;
      if (!session?.userId || !session.expiresAt || Date.parse(session.expiresAt) <= Date.now()) return jsonError("Сессия истекла", 401);
      if (!isInterfaceColor(payload.interfaceColor)) return jsonError("Выберите цвет из списка", 400);
      const users = usersStore();
      let key = session.email ? await emailKey(session.email) : "";
      let user = key ? await users.get(key, { type: "json", consistency: "strong" }) as StoredUser | null : null;
      if (!user) {
        const listed = await users.list();
        for (const item of listed.blobs) {
          const candidate = await users.get(item.key, { type: "json", consistency: "strong" }) as StoredUser | null;
          if (candidate?.id === session.userId) { key = item.key; user = candidate; break; }
        }
      }
      if (!user || !key) return jsonError("Профиль не найден", 404);
      const updated = { ...user, interfaceColor: payload.interfaceColor };
      await users.setJSON(key, updated);
      return Response.json(publicUser(updated));
    }

    if (action === "migrate") {
      const password = String(payload.password ?? "");
      const passwordError = validPassword(password);
      if (passwordError) return jsonError(passwordError, 400);
      return createSharedUser({
        name: normalizeName(payload.name),
        email,
        hash: await hashPassword(password),
        createdAt: payload.createdAt,
        avatarUrl: payload.avatarUrl,
        interfaceColor: payload.interfaceColor,
      });
    }

    return jsonError("Неизвестная операция", 400);
  } catch (error) {
    console.error("Auth function failed", error);
    return jsonError("Сервис авторизации временно недоступен", 500);
  }
};
