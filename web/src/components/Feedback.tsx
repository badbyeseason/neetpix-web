"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";

export default function Feedback() {
  const t = useTranslations("feedback");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const email = 'im.badbye' + '@' + 'gmail.com';
  const handleEmailClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = `mailto:${email}?subject=${encodeURIComponent("Neetpix Feedback")}`;
  };

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-40">
      {/* 浮动按钮 */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-teal text-white shadow-lg hover:bg-teal-dark transition-all flex items-center justify-center"
        aria-label={t("button")}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h7m-7 4h7m-7 8a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2h-3l-3 3v-3H7z" />
        </svg>
      </button>

      {/* 展开面板 */}
      {open && (
        <div className="absolute bottom-16 right-0 w-72 rounded-2xl border border-border bg-bg-warm shadow-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-text">{t("title")}</p>

          {/* 邮件反馈 */}
          <a
            href="#"
            onClick={handleEmailClick}
            className="block rounded-xl border border-border bg-bg-warm p-3 hover:border-teal-light transition-colors"
          >
            <p className="text-sm font-medium text-text flex items-center gap-2">
              <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {t("email")}
            </p>
            <p className="text-xs text-text-secondary mt-1">{t("emailHint")}</p>
          </a>
        </div>
      )}
    </div>
  );
}
