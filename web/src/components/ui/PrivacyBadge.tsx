import { getTranslations } from "next-intl/server";

/**
 * 本地处理徽章 — 在工具页顶部展示，透明告知用户数据处理方式。
 * 未来若上云端工具，可扩展 `variant` 支持 "cloud" 变体。
 */
export default async function PrivacyBadge({
  locale,
}: {
  locale: string;
}) {
  const t = await getTranslations({ locale });
  return (
    <div className="flex justify-center mb-6">
      <span
        className="inline-flex items-center gap-1.5 text-xs font-medium text-teal bg-teal/10 px-3 py-1.5 rounded-full"
        title={t("badge.localProcessingDesc")}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-teal" aria-hidden="true" />
        {t("badge.localProcessing")}
        <span className="text-text-secondary font-normal">
          · {t("badge.localProcessingDesc")}
        </span>
      </span>
    </div>
  );
}
