import { getTranslations, getMessages } from "next-intl/server";
import ChartGeneratorClient from "./ChartGeneratorClient";
import JsonLd from "@/components/seo/JsonLd";
import Faq from "@/components/seo/Faq";
import RelatedTools from "@/components/seo/RelatedTools";
import PrivacyBadge from "@/components/ui/PrivacyBadge";
import { buildI18nMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "chartGenerator" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: buildI18nMetadata("/tools/chart-generator", locale),
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

export default async function ChartGeneratorPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "chartGenerator" });
  // Faq 条目由后续 Task 统一添加；条目就绪前条件渲染，避免 next-intl 缺失键错误
  const messages = await getMessages();
  const faq = (messages as Record<string, Record<string, string> | undefined>)
    .faq;
  const hasFaq = Boolean(
    faq?.chartGenerator1 &&
      faq?.chartGenerator1a &&
      faq?.chartGenerator2 &&
      faq?.chartGenerator2a &&
      faq?.chartGenerator3 &&
      faq?.chartGenerator3a
  );
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={
          locale === "en"
            ? "https://neetpix.com/tools/chart-generator"
            : "https://neetpix.com/zh/tools/chart-generator"
        }
        locale={locale}
      />
      <PrivacyBadge locale={locale} />
      <ChartGeneratorClient />
      {hasFaq && <Faq tool="chartGenerator" locale={locale} />}
      <RelatedTools
        tools={["imageGridSplit", "qrCode", "imageWatermark"]}
        locale={locale}
      />
    </div>
  );
}
