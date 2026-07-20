"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import StarButton from "@/components/ui/StarButton";

type Props = {
  toolKey: string;
  href: string;
  gradient: string;
  badge?: "new" | "hot";
  comingSoon?: boolean;
};

export default function ToolCard({
  toolKey,
  href,
  gradient,
  badge,
  comingSoon,
}: Props) {
  const t = useTranslations();
  return (
    <Link
      href={href}
      className={
        "group relative rounded-2xl p-6 sm:p-8 bg-gradient-to-br " +
        gradient +
        " border border-border hover:border-teal-light transition-all hover:shadow-md"
      }
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text">
          {t("tools." + toolKey + ".name")}
          {comingSoon && (
            <span className="ml-2 text-xs font-medium text-text-secondary bg-bg-article px-2 py-0.5 rounded-full">
              Soon
            </span>
          )}
          {badge && (
            <span
              className={
                "ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full " +
                (badge === "new"
                  ? "bg-teal/10 text-teal"
                  : "bg-coral/10 text-coral")
              }
            >
              {t("badges." + badge)}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <StarButton toolKey={toolKey} className="w-5 h-5" />
          <span
            className="inline-flex items-center gap-1 text-xs font-medium text-teal bg-teal/10 px-2 py-1 rounded-full"
            title={t("badge.localProcessingDesc")}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-teal" aria-hidden="true" />
            {t("badge.localProcessing")}
          </span>
        </div>
      </div>
      <p className="mt-1 text-sm text-text-secondary leading-relaxed">
        {t("tools." + toolKey + ".desc")}
      </p>
    </Link>
  );
}
