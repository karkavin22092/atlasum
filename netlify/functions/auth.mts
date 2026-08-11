import { getStore } from "@netlify/blobs";

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
const reviewsStore = () => getStore({ name: "design-tests-reviews", consistency: "strong" });
const DELETED_NAMES = new Set(["test"]);
const RESERVED_NAMES = new Set(["lonexnesss"]);
const ADMIN_ID = "lonexnesss";

const jsonError = (message: string, status: number) => Response.json({ error: message }, { status });

const normalizeEmail = (value: unknown) => String(value ?? "").trim().toLowerCase().slice(0, 160);
const normalizeName = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
const cleanUserId = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-zа-я0-9-]+/giu, "-").slice(0, 80);
const slugify = (value: string) => value.toLowerCase().replace(/[^a-zа-я0-9]+/giu, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const hashHex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const passwordHash = (email: string, password: string) => hashHex(`${email}:design-tests:${password}`);
const emailKey = (email: string) => hashHex(email);
const nameKey = (name: string) => slugify(name);
const publicUser = ({ passwordHash: _passwordHash, privacyAcceptedAt: _privacyAcceptedAt, ...user }: StoredUser) => user;

const authenticatedResponse = async (user: StoredUser, status = 200) => {
  if (user.bannedAt) return Response.json({ ...publicUser(user), banned: true, error: `Аккаунт заблокирован. Причина: ${user.banReason ?? "нарушение правил платформы"}` }, { status: 403 });
  const authToken = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
  await sessionsStore().setJSON(await hashHex(authToken), {
    userId: user.id,
    email: user.email,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  });
  return Response.json({ ...publicUser(user), authToken }, { status });
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
  if (!/^[a-f0-9]{64}$/iu.test(hash)) return jsonError("Некорректные данные пароля", 400);

  const users = usersStore();
  const names = namesStore();
  const [emailId, normalizedNameKey] = await Promise.all([emailKey(email), Promise.resolve(nameKey(name))]);
  const [existingUser, existingNameOwner] = await Promise.all([
    users.get(emailId, { type: "json", consistency: "strong" }) as Promise<StoredUser | null>,
    names.get(normalizedNameKey, { consistency: "strong" }),
  ]);

  if (existingUser) {
    if (existingUser.passwordHash === hash && existingUser.name.toLowerCase() === name.toLowerCase()) {
      const migratedAvatar = avatarUrl && avatarUrl.startsWith("data:image/") && avatarUrl.length <= 350_000 ? avatarUrl : existingUser.avatarUrl ?? null;
      const migratedColor = isInterfaceColor(interfaceColor) ? interfaceColor : existingUser.interfaceColor ?? "ocean";
      const migratedUser = migratedAvatar !== existingUser.avatarUrl || migratedColor !== existingUser.interfaceColor
        ? { ...existingUser, avatarUrl: migratedAvatar, interfaceColor: migratedColor }
        : existingUser;
      if (migratedUser !== existingUser) await users.setJSON(emailId, migratedUser);
      return authenticatedResponse(migratedUser);
    }
    return jsonError("Пользователь с такой почтой уже зарегистрирован", 409);
  }
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
    const payload = await request.json() as { action?: string; name?: string; email?: string; password?: string; passwordHash?: string; createdAt?: string; authToken?: string; avatarUrl?: string | null; interfaceColor?: InterfaceColor; privacyAccepted?: boolean; userId?: string; reason?: string };
    const action = String(payload.action ?? "");
    const email = normalizeEmail(payload.email);

    if (action === "login") {
      const password = String(payload.password ?? "");
      if (!email || !password) return jsonError("Введите почту и пароль", 400);
      const user = await usersStore().get(await emailKey(email), { type: "json", consistency: "strong" }) as StoredUser | null;
      if (!user) return jsonError("Аккаунт с такой почтой не найден", 404);
      if (user.passwordHash !== await passwordHash(email, password)) return jsonError("Неверная почта или пароль", 401);
      return authenticatedResponse(user);
    }

    if (action === "session") {
      const token = String(payload.authToken ?? "").trim();
      const session = token ? await sessionsStore().get(await hashHex(token), { type: "json", consistency: "strong" }) as { email?: string; expiresAt?: string } | null : null;
      if (!session?.email || !session.expiresAt || Date.parse(session.expiresAt) <= Date.now()) return jsonError("Сессия истекла", 401);
      const user = await usersStore().get(await emailKey(session.email), { type: "json", consistency: "strong" }) as StoredUser | null;
      if (!user) return jsonError("Аккаунт не найден", 404);
      if (user.bannedAt) return Response.json({ ...publicUser(user), banned: true, error: `Аккаунт заблокирован. Причина: ${user.banReason ?? "нарушение правил платформы"}` }, { status: 403 });
      return Response.json(publicUser(user));
    }

    if (action === "ban-user") {
      const token = String(payload.authToken ?? "").trim();
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
      const token = String(payload.authToken ?? "").trim();
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
      if (password.length < 6) return jsonError("Пароль должен содержать минимум 6 символов", 400);
      if (payload.privacyAccepted !== true) return jsonError("Подтвердите согласие на обработку персональных данных.", 400);
      return createSharedUser({ name, email, hash: await passwordHash(email, password), privacyAcceptedAt: new Date().toISOString() });
    }

    if (action === "update-avatar") {
      const token = String(payload.authToken ?? "").trim();
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
      const token = String(payload.authToken ?? "").trim();
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
      return createSharedUser({
        name: normalizeName(payload.name),
        email,
        hash: String(payload.passwordHash ?? "").toLowerCase(),
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
