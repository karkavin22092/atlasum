import { getStore } from "@netlify/blobs";

type StoredUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

const usersStore = () => getStore({ name: "design-tests-auth-users", consistency: "strong" });
const namesStore = () => getStore({ name: "design-tests-auth-names", consistency: "strong" });
const sessionsStore = () => getStore({ name: "design-tests-auth-sessions", consistency: "strong" });
const DELETED_NAMES = new Set(["test"]);

const jsonError = (message: string, status: number) => Response.json({ error: message }, { status });

const normalizeEmail = (value: unknown) => String(value ?? "").trim().toLowerCase().slice(0, 160);
const normalizeName = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
const slugify = (value: string) => value.toLowerCase().replace(/[^a-zа-я0-9]+/giu, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const hashHex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const passwordHash = (email: string, password: string) => hashHex(`${email}:design-tests:${password}`);
const emailKey = (email: string) => hashHex(email);
const nameKey = (name: string) => slugify(name);
const publicUser = ({ passwordHash: _passwordHash, ...user }: StoredUser) => user;

const authenticatedResponse = async (user: StoredUser, status = 200) => {
  const authToken = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
  await sessionsStore().setJSON(await hashHex(authToken), {
    userId: user.id,
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

const createSharedUser = async ({ name, email, hash, createdAt }: { name: string; email: string; hash: string; createdAt?: string }) => {
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
      return authenticatedResponse(existingUser);
    }
    return jsonError("Пользователь с такой почтой уже зарегистрирован", 409);
  }
  if (existingNameOwner) return jsonError("Это имя уже занято", 409);

  const user: StoredUser = {
    id: nameKey(name),
    name,
    email,
    passwordHash: hash,
    createdAt: createdAt && !Number.isNaN(Date.parse(createdAt)) ? new Date(createdAt).toISOString() : new Date().toISOString(),
  };
  await Promise.all([
    users.setJSON(emailId, user, { onlyIfNew: true }),
    names.set(normalizedNameKey, emailId, { onlyIfNew: true }),
  ]);
  return authenticatedResponse(user, 201);
};

export default async (request: Request) => {
  try {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
    const payload = await request.json() as { action?: string; name?: string; email?: string; password?: string; passwordHash?: string; createdAt?: string };
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

    if (action === "register") {
      const name = normalizeName(payload.name);
      const password = String(payload.password ?? "");
      if (password.length < 6) return jsonError("Пароль должен содержать минимум 6 символов", 400);
      return createSharedUser({ name, email, hash: await passwordHash(email, password) });
    }

    if (action === "migrate") {
      return createSharedUser({
        name: normalizeName(payload.name),
        email,
        hash: String(payload.passwordHash ?? "").toLowerCase(),
        createdAt: payload.createdAt,
      });
    }

    return jsonError("Неизвестная операция", 400);
  } catch (error) {
    console.error("Auth function failed", error);
    return jsonError("Сервис авторизации временно недоступен", 500);
  }
};
