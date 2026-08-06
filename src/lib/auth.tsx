import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isDeletedAccountName } from "./deleted-accounts";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  authToken?: string;
};

type StoredUser = AuthUser & { passwordHash: string };

type AuthContextValue = {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const USERS_KEY = "design-tests-users-v1";
const SESSION_KEY = "design-tests-session-v1";
const AuthContext = createContext<AuthContextValue | null>(null);

class RemoteAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const readUsers = (): StoredUser[] => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(USERS_KEY) ?? "[]") as StoredUser[];
    const users = stored.filter((user) => !isDeletedAccountName(user.name));
    if (users.length !== stored.length) {
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
  const { passwordHash: _passwordHash, ...user } = stored;
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
  window.localStorage.setItem(USERS_KEY, JSON.stringify([...users, { ...user, passwordHash }]));
  if (activate) window.localStorage.setItem(SESSION_KEY, user.id);
};

const remoteAuth = async (payload: Record<string, unknown>) => {
  const response = await fetch("/.netlify/functions/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({})) as Partial<AuthUser> & { error?: string };
  if (!response.ok) throw new RemoteAuthError(result.error ?? "Сервис авторизации временно недоступен", response.status);
  return result as AuthUser;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(getInitialUser);

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    const activeId = window.localStorage.getItem(SESSION_KEY);
    const localUsers = readUsers();
    void (async () => {
      for (const stored of localUsers) {
        try {
          const migrated = await remoteAuth({
            action: "migrate",
            name: stored.name,
            email: stored.email,
            passwordHash: stored.passwordHash,
            createdAt: stored.createdAt,
          });
          const isActive = stored.id === activeId;
          saveLocalUser(migrated, stored.passwordHash, isActive);
          if (isActive) setUser(migrated);
        } catch {
          // Existing local accounts remain usable until shared migration succeeds.
        }
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await hashPassword(normalizedEmail, password);
    const localUser = readUsers().find((item) => item.email === normalizedEmail);

    if (import.meta.env.PROD) {
      let authenticatedUser: AuthUser;
      try {
        authenticatedUser = await remoteAuth({ action: "login", email: normalizedEmail, password });
      } catch (error) {
        if (!(error instanceof RemoteAuthError) || error.status !== 404) throw error;
        if (!localUser || localUser.passwordHash !== passwordHash) {
          throw new Error("Аккаунт ещё не синхронизирован. Сначала откройте обновлённый сайт на устройстве, где создавали аккаунт.");
        }
        authenticatedUser = await remoteAuth({
          action: "migrate",
          name: localUser.name,
          email: localUser.email,
          passwordHash: localUser.passwordHash,
          createdAt: localUser.createdAt,
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

  const register = async (name: string, email: string, password: string) => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedName.length < 2) throw new Error("Имя должно содержать минимум 2 символа");
    if (isDeletedAccountName(normalizedName)) throw new Error("Это имя удалено и больше недоступно");
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error("Введите корректную электронную почту");
    if (password.length < 6) throw new Error("Пароль должен содержать минимум 6 символов");
    const users = readUsers();
    if (!import.meta.env.PROD && users.some((item) => item.email === normalizedEmail)) throw new Error("Пользователь с такой почтой уже зарегистрирован");
    if (!import.meta.env.PROD && users.some((item) => item.name.toLowerCase() === normalizedName.toLowerCase())) throw new Error("Это имя уже занято");

    if (import.meta.env.PROD) {
      const authenticatedUser = await remoteAuth({ action: "register", name: normalizedName, email: normalizedEmail, password });
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
    window.localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth должен использоваться внутри AuthProvider");
  return context;
};
