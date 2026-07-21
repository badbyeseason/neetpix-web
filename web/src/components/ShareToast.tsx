"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

export default function ShareToast() {
  const t = useTranslations("shareToast");
  const [visible, setVisible] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = () => {
      // 同一工具同一 session 只触发一次
      const toolKey = window.location.pathname;
      const sessionKey = `share-toast-${toolKey}`;
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, "1");
      // 3 秒后显示
      setTimeout(() => setVisible(true), 3000);
    };
    window.addEventListener("tool-download-complete", handler);
    return () => window.removeEventListener("tool-download-complete", handler);
  }, []);

  // 显示后 5 秒自动消失
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 5000);
    setTimer(t);
    return () => clearTimeout(t);
  }, [visible]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    if (timer) clearTimeout(timer);
  }, [timer]);

  const handleShare = useCallback(() => {
    // 触发 ShareBar 的复制或打开分享
    if (navigator.share) {
      navigator.share({ title: document.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href).catch(() => {});
    }
    handleDismiss();
  }, [handleDismiss]);

  const handleFeedback = useCallback(() => {
    const email = 'im.badbye' + '@' + 'gmail.com';
    window.location.href = `mailto:${email}?subject=${encodeURIComponent("工具反馈")}&body=${encodeURIComponent("工具 URL: " + window.location.href)}`;
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
      <div className="bg-white border border-border rounded-2xl shadow-lg p-4 flex items-center gap-3">
        <span className="text-2xl">👥</span>
        <p className="flex-1 text-sm text-text">{t("title")}</p>
        <button type="button" onClick={handleShare} className="px-3 py-1.5 rounded-full bg-teal text-white text-xs font-medium hover:bg-teal-dark">
          {t("shareAction")}
        </button>
        <button type="button" onClick={handleFeedback} className="px-3 py-1.5 rounded-full bg-bg-warm text-text text-xs font-medium hover:bg-bg-article">
          {t("feedbackAction")}
        </button>
        <button type="button" onClick={handleDismiss} aria-label={t("dismiss")} className="text-text-secondary hover:text-text">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
}
