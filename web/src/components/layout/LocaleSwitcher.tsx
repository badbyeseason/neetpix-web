'use client';

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { routing } from "@/i18n/routing";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("locale");

  function switchLocale(nextLocale: string) {
    startTransition(() => {
      const newPath = pathname.replace(/^\/\w+/,  "/" + nextLocale);
      router.replace(newPath);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchLocale(loc)}
          disabled={isPending || locale === loc}
          className={[
            "px-2 py-1 rounded-md transition-colors text-xs font-medium",
            locale === loc
              ? "bg-teal text-white"
              : "text-text-secondary hover:text-text hover:bg-bg-article",
          ].join(" ")}
        >
          {t(loc)}
        </button>
      ))}
    </div>
  );
}
