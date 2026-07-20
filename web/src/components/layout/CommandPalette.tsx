"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { TOOL_LIST } from "@/lib/tools-metadata";

const OPEN_EVENT = "open-command-palette";
const MAX_RESULTS = 10;

export default function CommandPalette() {
  const t = useTranslations("commandPalette");
  const tTools = useTranslations("tools");
  const tBadges = useTranslations("badges");
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // 全局快捷键 + 自定义事件监听
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((open) => !open);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    function handleOpenEvent() {
      setIsOpen(true);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener(OPEN_EVENT, handleOpenEvent as EventListener);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(OPEN_EVENT, handleOpenEvent as EventListener);
    };
  }, []);

  // 模态打开时聚焦 input
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 焦点陷阱：模态打开时 Tab/Shift+Tab 限定在模态内循环
  useEffect(() => {
    if (!isOpen) return;
    function handleTabKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const modal = modalRef.current;
      if (!modal) return;
      const focusable = modal.querySelectorAll<HTMLElement>(
        'input, button, a, textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleTabKey);
    return () => document.removeEventListener("keydown", handleTabKey);
  }, [isOpen]);

  // 模态关闭时重置状态
  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  // 计算搜索结果
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return TOOL_LIST.slice(0, MAX_RESULTS);
    }
    const matched = TOOL_LIST.filter((tool) => {
      const name = tTools(tool.nameKey);
      const desc = tTools(tool.descKey);
      return (
        name.toLowerCase().includes(q) || desc.toLowerCase().includes(q)
      );
    });
    return matched.slice(0, MAX_RESULTS);
  }, [query, tTools]);

  // query 变化时重置高亮
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightedIndex(0);
  }, [query]);

  const navigateTo = useCallback(
    (href: string) => {
      setIsOpen(false);
      router.push(href);
    },
    [router],
  );

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length === 0) return;
      setHighlightedIndex((idx) => (idx + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length === 0) return;
      setHighlightedIndex((idx) =>
        idx === 0 ? results.length - 1 : idx - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const tool = results[highlightedIndex];
      if (tool) {
        navigateTo(tool.href);
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-start bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={t("placeholder")}
    >
      <div
        ref={modalRef}
        className="w-full max-w-xl mt-[15vh] mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden border border-border"
      >
        {/* 搜索框 */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <svg
            className="w-5 h-5 text-text-secondary shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={t("placeholder")}
            className="flex-1 py-4 bg-transparent text-text placeholder:text-text-secondary focus:outline-none text-base"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-medium text-text-secondary bg-bg-warm border border-border rounded">
            Esc
          </kbd>
        </div>

        {/* 结果列表 */}
        <ul
          className="max-h-[50vh] overflow-y-auto py-2"
        >
          {results.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-text-secondary">
              {t("noResults")}
            </li>
          ) : (
            results.map((tool, idx) => {
              const isActive = idx === highlightedIndex;
              return (
                <li key={tool.key}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => navigateTo(tool.href)}
                    className={
                      "w-full text-left px-4 py-3 flex items-start gap-3 transition-colors " +
                      (isActive ? "bg-teal/5" : "hover:bg-bg-warm")
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text truncate">
                          {tTools(tool.nameKey)}
                        </span>
                        {tool.badge && (
                          <span
                            className={
                              "shrink-0 inline-block text-[10px] font-medium px-1 py-0.5 rounded-full " +
                              (tool.badge === "new"
                                ? "bg-teal/10 text-teal"
                                : "bg-coral/10 text-coral")
                            }
                          >
                            {tBadges(tool.badge)}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-text-secondary line-clamp-1">
                        {tTools(tool.descKey)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {/* 底部提示 */}
        <div className="px-4 py-2 border-t border-border bg-bg-warm/50 flex items-center justify-between text-[11px] text-text-secondary">
          <span>
            {query.trim() === ""
              ? t("recent")
              : t("resultsCount", { count: results.length })}
          </span>
          <span className="hidden sm:inline">
            <kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd>{" "}
            <span className="mx-1">·</span>
            <kbd className="font-sans">Enter</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
