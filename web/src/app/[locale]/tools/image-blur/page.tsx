import { getTranslations } from "next-intl/server";
import ImageBlurClient from "./ImageBlurClient";
import JsonLd from "@/components/seo/JsonLd";
import Faq from "@/components/seo/Faq";
import RelatedTools from "@/components/seo/RelatedTools";
import PrivacyBadge from "@/components/ui/PrivacyBadge";
import ShareBar from "@/components/ShareBar";
import FeedbackBar from "@/components/FeedbackBar";
import { buildI18nMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "imageBlur" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: buildI18nMetadata("/tools/image-blur", locale),
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

export default async function ImageBlurPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "imageBlur" });
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={
          locale === "en"
            ? "https://neetpix.com/tools/image-blur"
            : "https://neetpix.com/zh/tools/image-blur"
        }
        locale={locale}
      />
      <PrivacyBadge locale={locale} />
      <ImageBlurClient />
      <Faq tool="imageBlur" locale={locale} />
      <FeedbackBar toolNameKey="imageBlur" />
      <RelatedTools
        tools={["imageResize", "imageCompress", "imageWatermark", "removeBackground", "imageGridSplit"]}
        locale={locale}
      />
      <ShareBar />
    </div>
  );
}
