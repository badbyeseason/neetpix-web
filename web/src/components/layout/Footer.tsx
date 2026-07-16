'use client';

import { useTranslations } from "next-intl";
import Link from "next/link";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-border bg-bg-warm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-text-secondary">{t("brand")}</p>
        <div className="flex items-center gap-4 text-sm text-text-secondary">
          <Link href="/privacy" className="hover:text-text transition-colors">{t("privacy")}</Link>
          <a href="mailto:im.badbye@gmail.com" className="hover:text-text transition-colors">{t("contact")}</a>
        </div>
      </div>
    </footer>
  );
}
