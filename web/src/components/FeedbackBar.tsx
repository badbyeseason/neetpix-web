"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics";

type Props = {
  toolNameKey: string; // 如 "pdfEncrypt" / "qrCode" 等，用于 t(toolNameKey + ".name")
};

export default function FeedbackBar({ toolNameKey }: Props) {
  const t = useTranslations("feedbackBar");
  const tTools = useTranslations("tools");
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  const toolName = tTools(`${toolNameKey}.name`);
  const subject = encodeURIComponent(`${t("subject")} - ${toolName}`);
  const body = encodeURIComponent(`${t("body")}\n${pageUrl}`);
  const email = 'im.badbye' + '@' + 'gmail.com';

  return (
    <section className="mt-8 border-t border-border pt-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <p className="text-text-secondary">{t("title")}</p>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
            trackEvent("feedback-clicked", { toolKey: toolNameKey });
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border bg-bg-warm text-text hover:border-teal-light hover:text-text transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 3v-3z" />
          </svg>
          {t("cta")}
        </a>
      </div>
    </section>
  );
}
