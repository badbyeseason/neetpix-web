import { getTranslations } from "next-intl/server";
import { buildI18nMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

// About 页面的元数据，使用 about namespace 的 title/description
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: buildI18nMetadata("/about", locale),
    openGraph: {
      title: t("title") + " - Neetpix",
      description: t("description"),
      images: ["/og-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title") + " - Neetpix",
      description: t("description"),
      images: ["/og-image.png"],
    },
  };
}

// About 页面（纯展示，server 组件）
export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Neetpix",
    description: t("description"),
    url: "https://neetpix.com",
    email: t("contactEmail"),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 标题 */}
      <h1 className="text-3xl sm:text-4xl font-bold text-text">
        {t("title")}
      </h1>
      <p className="mt-2 text-text-secondary">{t("description")}</p>

      {/* 品牌故事 */}
      <p className="mt-6 text-text-secondary leading-relaxed">{t("intro")}</p>

      {/* 隐私承诺 */}
      <h2 className="text-xl font-semibold text-text mt-8">
        {t("privacyTitle")}
      </h2>
      <p className="mt-4 text-text-secondary leading-relaxed">
        {t("privacyDesc")}
      </p>

      {/* 工具矩阵 */}
      <h2 className="text-xl font-semibold text-text mt-8">
        {t("toolsTitle")}
      </h2>
      <ul className="mt-4 list-disc pl-6 text-text-secondary leading-relaxed">
        <li>{t("toolsPdf")}</li>
        <li>{t("toolsImage")}</li>
        <li>{t("toolsGenerator")}</li>
        <li>{t("toolsTranslate")}</li>
        <li>{t("toolsNetwork")}</li>
        <li className="mt-2 font-medium text-text">{t("toolsTotal")}</li>
      </ul>

      {/* 联系方式 */}
      <h2 className="text-xl font-semibold text-text mt-8">
        {t("contactTitle")}
      </h2>
      <p className="mt-4 text-text-secondary leading-relaxed">
        <a href="mailto:im.badbye@gmail.com" className="text-teal hover:text-teal-dark">
          im.badbye@gmail.com
        </a>
      </p>
    </div>
  );
}
