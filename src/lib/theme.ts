import { useEffect } from "react";
import { useLocalStorageState } from "./storage";

export const useTheme = () => {
  const [theme, setTheme] = useLocalStorageState<"dark" | "light">("it-graphics-theme", "dark");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return { theme, setTheme };
};

