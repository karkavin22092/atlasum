import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isDeletedAccountName, isReservedAccountName } from "./deleted-accounts";
import { syncLocalReviewAvatar } from "./reviews";
import { DEFAULT_INTERFACE_COLOR, type InterfaceColor } from "./interface-colors";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  authToken?: string;
  avatarUrl?: string | null;
  interfaceColor?: InterfaceColor;
  bannedAt?: string;
  banReason?: string;
};

type StoredUser = AuthUser & { passwordHash?: string };

type AuthContextValue = {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, privacyAccepted: boolean) => Promise<void>;
  logout: () => void;
  updateAvatar: (avatarUrl: string | null) => Promise<void>;
  updateInterfaceColor: (interfaceColor: InterfaceColor) => Promise<void>;
};

const USERS_KEY = "design-tests-users-v1";
const SESSION_KEY = "design-tests-session-v1";
const AuthContext = createContext<AuthContextValue | null>(null);

class RemoteAuthError extends Error {
  status: number;
  banned: boolean;
  user: Partial<AuthUser>;

  constructor(message: string, status: number, result: Partial<AuthUser> & { banned?: boolean } = {}) {
    super(message);
    this.status = status;
    this.banned = result.banned === true;
    this.user = result;
  }
}

const readUsers = (): StoredUser[] => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(USERS_KEY) ?? "[]") as StoredUser[];
    const existingUsers = stored.filter((user) => !isDeletedAccountName(user.name));
    const users = existingUsers.map(({ authToken: _authToken, ...user }) => user);
    if (users.length !== stored.length || stored.some((user) => Boolean(user.authToken))) {
      const activeId = window.localStorage.getItem(SESSION_KEY);
      if (stored.some((user) => user.id === activeId && isDeletedAccountName(user.name))) {
        window.localStorage.removeItem(SESSION_KEY);
      }
      window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    return users;
  } catch {
    return [];
  }
};

const getInitialUser = () => {
  const sessionId = window.localStorage.getItem(SESSION_KEY);
  const stored = readUsers().find((item) => item.id === sessionId);
  if (!stored) return null;
  const { passwordHash: _passwordHash, authToken: _authToken, ...user } = stored;
  return user;
};

const hashPassword = async (email: string, password: string) => {
  const value = new TextEncoder().encode(`${email.toLowerCase()}:design-tests:${password}`);
  if (crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", value);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return Array.from(value).reduce((hash, byte) => Math.imul(hash ^ byte, 16777619), 2166136261).toString(16);
};

const saveLocalUser = (user: AuthUser, passwordHash: string, activate = true) => {
  const users = readUsers().filter((item) => item.email !== user.email && item.id !== user.id);
  const { authToken: _authToken, ...safeUser } = user;
  const storedUser: StoredUser = import.meta.env.PROD ? safeUser : { ...safeUser, passwordHash };
  window.localStorage.setItem(USERS_KEY, JSON.stringify([...users, storedUser]));
  if (activate) window.localStorage.setItem(SESSION_KEY, user.id);
};

const remoteAuth = async (payload: Record<string, unknown>) => {
  const response = await fetch("/.netlify/functions/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({})) as Partial<AuthUser> & { error?: string };
  if (!response.ok) throw new RemoteAuthError(result.error ?? "Сервис авторизации временно недоступен", response.status, result);
  return result as AuthUser;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(getInitialUser);

  useEffect(() => {
    if (!import.meta.env.PROD || user) return;
    let active = true;
    void remoteAuth({ action: "session" })
      .then((refreshed) => {
        if (!active) return;
        window.localStorage.setItem(SESSION_KEY, refreshed.id);
        setUser({ ...refreshed, authToken: undefined });
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!import.meta.env.PROD || !user || user.bannedAt) return;
    let active = true;
    const verifySession = async () => {
      try {
        const refreshed = await remoteAuth({ action: "session" });
        if (active) setUser((current) => current?.id === user.id ? { ...refreshed, authToken: undefined } : current);
      } catch (error) {
        if (active && error instanceof RemoteAuthError && error.banned) {
          setUser((current) => current?.id === user.id ? { ...current, ...error.user, authToken: undefined, bannedAt: error.user.bannedAt ?? new Date().toISOString() } : current);
        } else if (active) {
          window.localStorage.removeItem(SESSION_KEY);
          setUser(null);
        }
      }
    };
    void verifySession();
    const interval = window.setInterval(() => { if (!document.hidden) void verifySession(); }, 15_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [user?.bannedAt, user?.id]);

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await hashPassword(normalizedEmail, password);
    const localUser = readUsers().find((item) => item.email === normalizedEmail);

    if (import.meta.env.PROD) {
      let authenticatedUser: AuthUser;
      try {
        authenticatedUser = await remoteAuth({ action: "login", email: normalizedEmail, password });
      } catch (error) {
        if (error instanceof RemoteAuthError && error.banned) {
          setUser({ ...error.user, bannedAt: error.user.bannedAt ?? new Date().toISOString() } as AuthUser);
          return;
        }
        if (!(error instanceof RemoteAuthError) || error.status !== 404) throw error;
        if (!localUser || localUser.passwordHash !== passwordHash) {
          throw new Error("Аккаунт ещё не синхронизирован. Сначала откройте обновлённый сайт на устройстве, где создавали аккаунт.");
        }
        authenticatedUser = await remoteAuth({
          action: "migrate",
          name: localUser.name,
          email: localUser.email,
          password,
          createdAt: localUser.createdAt,
          avatarUrl: localUser.avatarUrl ?? null,
          interfaceColor: localUser.interfaceColor ?? DEFAULT_INTERFACE_COLOR,
        });
      }
      saveLocalUser(authenticatedUser, passwordHash);
      setUser(authenticatedUser);
      return;
    }

    if (!localUser || localUser.passwordHash !== passwordHash) throw new Error("Неверная почта или пароль");
    const { passwordHash: _passwordHash, ...authenticatedUser } = localUser;
    window.localStorage.setItem(SESSION_KEY, localUser.id);
    setUser(authenticatedUser);
  };

  const register = async (name: string, email: string, password: string, privacyAccepted: boolean) => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedName.length < 2) throw new Error("Имя должно содержать минимум 2 символа");
    if (isDeletedAccountName(normalizedName) || isReservedAccountName(normalizedName)) throw new Error("Это имя недоступно");
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error("Введите корректную электронную почту");
    if (password.length < 10) throw new Error("Пароль должен содержать минимум 10 символов");
    if (!privacyAccepted) throw new Error("Подтвердите согласие на обработку персональных данных.");
    const users = readUsers();
    if (!import.meta.env.PROD && users.some((item) => item.email === normalizedEmail)) throw new Error("Пользователь с такой почтой уже зарегистрирован");
    if (!import.meta.env.PROD && users.some((item) => item.name.toLowerCase() === normalizedName.toLowerCase())) throw new Error("Это имя уже занято");

    if (import.meta.env.PROD) {
      let authenticatedUser: AuthUser;
      try {
        authenticatedUser = await remoteAuth({ action: "register", name: normalizedName, email: normalizedEmail, password, privacyAccepted });
      } catch (error) {
        if (error instanceof RemoteAuthError && error.banned) {
          setUser({ ...error.user, authToken: undefined, bannedAt: error.user.bannedAt ?? new Date().toISOString() } as AuthUser);
          return;
        }
        throw error;
      }
      saveLocalUser(authenticatedUser, await hashPassword(normalizedEmail, password));
      setUser(authenticatedUser);
      return;
    }

    const stored: StoredUser = {
      id: crypto.randomUUID(),
      name: normalizedName,
      email: normalizedEmail,
      passwordHash: await hashPassword(normalizedEmail, password),
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem(USERS_KEY, JSON.stringify([...users, stored]));
    window.localStorage.setItem(SESSION_KEY, stored.id);
    const { passwordHash: _passwordHash, ...authenticatedUser } = stored;
    setUser(authenticatedUser);
  };

  const logout = () => {
    if (import.meta.env.PROD) void remoteAuth({ action: "logout" }).catch(() => undefined);
    window.localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  const updateAvatar = async (avatarUrl: string | null) => {
    if (!user) throw new Error("Сначала войдите в аккаунт");
    if (avatarUrl && (!avatarUrl.startsWith("data:image/") || avatarUrl.length > 350_000)) throw new Error("Изображение слишком большое");
    let updated: AuthUser = { ...user, avatarUrl };
    if (import.meta.env.PROD) {
      const remote = await remoteAuth({ action: "update-avatar", avatarUrl });
      updated = { ...remote, authToken: undefined };
    }
    const users = readUsers().map((item) => item.id === user.id ? { ...item, avatarUrl } : item);
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
    syncLocalReviewAvatar(user.id, avatarUrl);
    setUser(updated);
  };

  const updateInterfaceColor = async (interfaceColor: InterfaceColor) => {
    if (!user) throw new Error("Сначала войдите в аккаунт");
    let updated: AuthUser = { ...user, interfaceColor };
    if (import.meta.env.PROD) {
      const remote = await remoteAuth({ action: "update-interface-color", interfaceColor });
      updated = { ...remote, authToken: undefined };
    }
    const users = readUsers().map((item) => item.id === user.id ? { ...item, interfaceColor } : item);
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
    setUser(updated);
  };

  return <AuthContext.Provider value={{ user, login, register, logout, updateAvatar, updateInterfaceColor }}>{children}</AuthContext.Provider>;
};

export const banAccount = async (userId: string, reason: string, authToken: string) => {
  const response = await fetch("/.netlify/functions/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "ban-user", userId, reason, authToken }),
  });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Не удалось заблокировать пользователя");
};

export type BannedAccount = { id: string; name: string; bannedAt: string; banReason: string };

const requestBanAdmin = async <T,>(action: "list-banned" | "unban-user", authToken: string, userId?: string) => {
  const response = await fetch("/.netlify/functions/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action, authToken, userId }),
  });
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Не удалось обновить список блокировок");
  return result;
};

export const getBannedAccounts = (authToken: string) => requestBanAdmin<BannedAccount[]>("list-banned", authToken);
export const unbanAccount = (userId: string, authToken: string) => requestBanAdmin<{ ok: boolean }>("unban-user", authToken, userId);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth должен использоваться внутри AuthProvider");
  return context;
};
