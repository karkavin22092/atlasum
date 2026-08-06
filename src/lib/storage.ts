import { useEffect, useState } from "react";

export const useLocalStorageState = <T,>(key: string, initialValue: T) => {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return initialValue;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
};

