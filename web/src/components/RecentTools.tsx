"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Clock } from "lucide-react";
import { useRecentTools } from "@/hooks/useRecentTools";
import { TOOL_MAP } from "@/lib/tools-metadata";

export default function RecentTools() {
  const t = useTranslations();
  const { recentTools } = useRecentTools();

  const items = recentTools
    .map((entry) => {
      const tool = TOOL_MAP[entry];
      if (!tool) return null;
      return { entry, tool };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <section className="py-12 px-4 bg-bg-warm">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="flex items-center gap-2 text-2xl sm:text-3xl font-bold text-text text-center sm:text-left">
            <Clock className="w-6 h-6 text-teal" aria-hidden="true" />
            {t("recentTools.title")}
          </h2>
        </div>
        {items.length === 0 ? (
          <p className="text-center text-sm text-text-secondary py-8">
            {t("recentTools.empty")}
          </p>
        ) : (
          <div className="flex overflow-x-auto gap-3 scroll-px-4 pb-2">
            {items.map(({ tool }) => (
              <Link
                key={tool.key}
                href={tool.href}
                className="group flex flex-col items-center gap-2 rounded-xl p-4 bg-white border border-border hover:border-teal-light transition-all hover:shadow-md min-w-[120px] max-w-[160px] flex-1"
              >
                <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center text-teal group-hover:bg-teal/20 transition-colors">
                  <Clock className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="text-xs font-medium text-text text-center line-clamp-2">
                  {t(tool.nameKey)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
