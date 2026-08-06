import { useEffect } from "react";
import { useLocalStorageState } from "./storage";

export type Theme = "dark" | "light";

const THEME_STORAGE_KEY = "it-graphics-theme";

export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
};

export const applyStoredTheme = () => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(THEME_STORAGE_KEY) ?? "null") as Theme | null;
    applyTheme(stored === "light" || stored === "dark" ? stored : "dark");
  } catch {
    applyTheme("dark");
  }
};

export const useTheme = () => {
  const [theme, setTheme] = useLocalStorageState<Theme>(THEME_STORAGE_KEY, "dark");

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return { theme, setTheme };
};
