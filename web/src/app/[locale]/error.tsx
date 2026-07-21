"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics";

// [locale] 段下的本地化错误边界（client component）。
// 捕获 [locale] 子树渲染错误，提供重试 + 返回首页。
// 根级 app/error.tsx 仍作为无效 locale 的最终 fallback。
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors.error");

  useEffect(() => {
    trackEvent("app-error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div
          aria-hidden="true"
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-bg mb-6"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-8 h-8 text-teal"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-text mb-2">{t("title")}</h1>
        <p className="text-text-secondary mb-8 max-w-md mx-auto">
          {t("description")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal text-white font-semibold text-sm hover:bg-teal-dark transition-colors"
          >
            {t("retry")}
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border text-text font-semibold text-sm hover:bg-bg-warm transition-colors"
          >
            {t("home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
