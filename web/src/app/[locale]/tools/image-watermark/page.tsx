import { getTranslations } from "next-intl/server";
import ImageWatermarkClient from "./ImageWatermarkClient";
import JsonLd from "@/components/seo/JsonLd";
import Faq from "@/components/seo/Faq";
import PrivacyBadge from "@/components/ui/PrivacyBadge";
import { buildI18nMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "imageWatermark" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: buildI18nMetadata("/tools/image-watermark", locale),
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

export default async function ImageWatermarkPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "imageWatermark" });
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/image-watermark" : "https://neetpix.com/zh/tools/image-watermark"}
        locale={locale}
      />
      <PrivacyBadge locale={locale} />
      <ImageWatermarkClient />
      <Faq tool="imageWatermark" locale={locale} />
    </div>
  );
}
