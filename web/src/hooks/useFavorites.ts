"use client";

import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "neetpix:favorites";
const FAVORITES_LIMIT = 12;

type FavoritesContextValue = {
  favorites: string[];
  isFavorite: (key: string) => boolean;
  toggleFavorite: (key: string) => boolean;
  favoritesCount: number;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readFromStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function writeToStorage(values: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // ignore quota/availability errors
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  // SSR 安全：初始值为 []，避免 hydration mismatch
  const [favorites, setFavorites] = useState<string[]>([]);

  // SSR 安全：localStorage 仅在客户端 effect 中读取，避免 hydration mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavorites(readFromStorage());
  }, []);

  const isFavorite = useCallback(
    (key: string) => favorites.includes(key),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (key: string) => {
      let next: string[] | null = null;
      setFavorites((current) => {
        if (current.includes(key)) {
          next = current.filter((k) => k !== key);
          return next;
        }
        if (current.length >= FAVORITES_LIMIT) {
          // 已达上限，不添加
          next = null;
          return current;
        }
        next = [...current, key];
        return next;
      });
      if (next) {
        writeToStorage(next);
        return true;
      }
      return false;
    },
    [],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      isFavorite,
      toggleFavorite,
      favoritesCount: favorites.length,
    }),
    [favorites, isFavorite, toggleFavorite],
  );

  return createElement(
    FavoritesContext.Provider,
    { value },
    children,
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return ctx;
}
