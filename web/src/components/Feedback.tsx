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

  const mailtoHref = `mailto:feedback@neetpix.com?subject=${encodeURIComponent("Neetpix Feedback")}`;
  const githubUrl = "https://github.com/badbyeseason/neetpix-web/issues";

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-50">
      {/* 浮动按钮 */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-teal text-white shadow-lg hover:bg-teal-dark transition-all flex items-center justify-center"
        aria-label={t("button")}
      >
        {/* 反馈图标：用 SVG message icon */}
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
            href={mailtoHref}
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

          {/* GitHub Issues */}
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border border-border bg-bg-warm p-3 hover:border-teal-light transition-colors"
          >
            <p className="text-sm font-medium text-text flex items-center gap-2">
              <svg className="w-4 h-4 text-teal" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.523 2 12 2z" />
              </svg>
              {t("github")}
            </p>
            <p className="text-xs text-text-secondary mt-1">{t("githubHint")}</p>
          </a>
        </div>
      )}
    </div>
  );
}
