"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import StarButton from "@/components/ui/StarButton";
import { useFavorites } from "@/hooks/useFavorites";
import { TOOL_MAP } from "@/lib/tools-metadata";

export default function MyToolsSection() {
  const t = useTranslations();
  const { favorites } = useFavorites();

  if (favorites.length === 0) return null;

  return (
    <section className="py-12 px-4 bg-bg-warm">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-text text-center sm:text-left">
            {t("favorites.myTools")}
          </h2>
          <span className="text-xs text-text-secondary">
            {t("favorites.limitHint")}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {favorites.map((key) => {
            const tool = TOOL_MAP[key];
            if (!tool) return null;
            return (
              <Link
                key={key}
                href={tool.href}
                className="group relative rounded-xl p-4 bg-white border border-border hover:border-teal-light transition-all hover:shadow-md min-w-[200px] flex-1 max-w-[280px]"
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-text truncate">
                      {t(tool.nameKey)}
                    </div>
                    <div className="text-xs text-text-secondary truncate">
                      {t(tool.descKey)}
                    </div>
                  </div>
                  <StarButton toolKey={key} className="w-4 h-4 shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
