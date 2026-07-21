"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

const DISMISS_KEY = "bookmark_dismissed";
const VISITED_KEY = "visited";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default function BookmarkHint() {
  const t = useTranslations("bookmark");
  const [visible, setVisible] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // 检测平台
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));

    // PWA 模式不显示
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // 检查 dismissed 时间戳
    const dismissedStr = localStorage.getItem(DISMISS_KEY);
    if (dismissedStr) {
      const dismissedTime = parseInt(dismissedStr, 10);
      if (Date.now() - dismissedTime < THIRTY_DAYS_MS) return;
    }

    // 标记已访问
    localStorage.setItem(VISITED_KEY, "1");

    // 3 秒后显示
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  const shortcut = isMac ? "⌘+D" : "Ctrl+D";

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-xs">
      <div className="bg-white border border-border rounded-2xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⭐</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-text">{t("title")}</p>
            <p className="text-xs text-text-secondary mt-1">
              {t("hint", { shortcut })}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t("dismiss")}
            className="text-text-secondary hover:text-text"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="mt-3 w-full px-3 py-1.5 rounded-full bg-teal text-white text-xs font-medium hover:bg-teal-dark"
        >
          {t("dismiss")}
        </button>
      </div>
    </div>
  );
}
