import { createContext, useContext, useState, type ReactNode } from "react";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
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

const readUsers = (): StoredUser[] => {
  try {
    return JSON.parse(window.localStorage.getItem(USERS_KEY) ?? "[]") as StoredUser[];
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(getInitialUser);

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const stored = readUsers().find((item) => item.email === normalizedEmail);
    if (!stored || stored.passwordHash !== await hashPassword(normalizedEmail, password)) {
      throw new Error("Неверная почта или пароль");
    }
    const { passwordHash: _passwordHash, ...authenticatedUser } = stored;
    window.localStorage.setItem(SESSION_KEY, stored.id);
    setUser(authenticatedUser);
  };

  const register = async (name: string, email: string, password: string) => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedName.length < 2) throw new Error("Имя должно содержать минимум 2 символа");
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error("Введите корректную электронную почту");
    if (password.length < 6) throw new Error("Пароль должен содержать минимум 6 символов");
    const users = readUsers();
    if (users.some((item) => item.email === normalizedEmail)) throw new Error("Пользователь с такой почтой уже зарегистрирован");
    if (users.some((item) => item.name.toLowerCase() === normalizedName.toLowerCase())) throw new Error("Это имя уже занято");

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
