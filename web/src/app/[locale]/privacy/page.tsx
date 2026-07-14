import { getTranslations } from "next-intl/server";
import { buildI18nMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

// 隐私政策页面的元数据，使用 privacy namespace 的 title
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return {
    title: t("title"),
    description: t("intro"),
    alternates: buildI18nMetadata("/privacy", locale),
    openGraph: {
      title: t("title") + " - Neetpix",
      description: t("intro"),
      images: ["/og-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title") + " - Neetpix",
      description: t("intro"),
      images: ["/og-image.png"],
    },
  };
}

// 隐私政策页面（纯展示，server 组件）
export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });

  // 将工具列表字符串拆分为数组用于渲染
  const tools = t("localProcessingTools")
    .split(",")
    .map((tool) => tool.trim());

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      {/* 标题与更新时间 */}
      <h1 className="text-3xl sm:text-4xl font-bold text-text">
        {t("title")}
      </h1>
      <p className="mt-2 text-text-secondary">{t("updated")}</p>

      {/* 引言 */}
      <p className="mt-6 text-text-secondary leading-relaxed">{t("intro")}</p>

      {/* 浏览器本地处理 */}
      <h2 className="text-xl font-semibold text-text mt-8">
        {t("localProcessing")}
      </h2>
      <p className="mt-4 text-text-secondary leading-relaxed">
        {t("localProcessingDesc")}
      </p>
      <ul className="mt-4 list-disc pl-6 text-text-secondary leading-relaxed">
        {tools.map((tool) => (
          <li key={tool}>{tool}</li>
        ))}
      </ul>

      {/* API 辅助处理 */}
      <h2 className="text-xl font-semibold text-text mt-8">
        {t("apiProcessing")}
      </h2>
      <p className="mt-4 text-text-secondary leading-relaxed">
        {t("apiProcessingDesc")}
      </p>

      {/* 数据保留 */}
      <h2 className="text-xl font-semibold text-text mt-8">
        {t("dataRetention")}
      </h2>
      <p className="mt-4 text-text-secondary leading-relaxed">
        {t("dataRetentionDesc")}
      </p>

      {/* 第三方服务 */}
      <h2 className="text-xl font-semibold text-text mt-8">
        {t("thirdParty")}
      </h2>
      <p className="mt-4 text-text-secondary leading-relaxed">
        {t("thirdPartyDesc")}
      </p>

      {/* 联系方式 */}
      <h2 className="text-xl font-semibold text-text mt-8">
        {t("contact")}
      </h2>
      <p className="mt-4 text-text-secondary leading-relaxed">
        {t("contactDesc")}
      </p>
    </div>
  );
}
