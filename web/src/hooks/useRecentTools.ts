"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "neetpix:recent-tools";
const RECENT_LIMIT = 8;
const EVENT_NAME = "neetpix:recent-tools-change";

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
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    // ignore quota/availability errors
  }
}

/**
 * 独立函数形式：在任意客户端代码中调用以记录最近使用的工具。
 * 在 lib/event handler 中使用，无需 React 上下文。
 */
export function addRecentTool(toolKey: string): void {
  if (typeof window === "undefined") return;
  if (!toolKey) return;
  const current = readFromStorage();
  // 去重：移除已存在的同 key
  const filtered = current.filter((k) => k !== toolKey);
  // 最新在前
  const next = [toolKey, ...filtered].slice(0, RECENT_LIMIT);
  writeToStorage(next);
}

/**
 * Hook 形式：在客户端组件中读取最近工具列表。
 * 会监听同标签页内的变更事件，自动刷新。
 */
export function useRecentTools(): {
  recentTools: string[];
  clearRecentTools: () => void;
} {
  const [recentTools, setRecentTools] = useState<string[]>([]);

  // SSR 安全：localStorage 仅在客户端 effect 中读取
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentTools(readFromStorage());

    function handleChange() {
      setRecentTools(readFromStorage());
    }
    window.addEventListener(EVENT_NAME, handleChange);
    // 跨标签页同步
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(EVENT_NAME, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const clearRecentTools = useCallback(() => {
    writeToStorage([]);
  }, []);

  return { recentTools, clearRecentTools };
}
