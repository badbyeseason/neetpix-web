import { getTranslations } from "next-intl/server";
import ScreenshotTranslateClient from "./ScreenshotTranslateClient";
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
  const t = await getTranslations({ locale, namespace: "screenshotTranslate" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: buildI18nMetadata("/tools/screenshot-translate", locale),
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

export default async function ScreenshotTranslatePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "screenshotTranslate" });
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/screenshot-translate" : "https://neetpix.com/zh/tools/screenshot-translate"}
        locale={locale}
      />
      <PrivacyBadge locale={locale} />
      <ScreenshotTranslateClient />
      <Faq tool="screenshotTranslate" locale={locale} />
      <FeedbackBar toolNameKey="screenshotTranslate" />
      <RelatedTools tools={["removeBackground", "imageCompress", "imageToPdf", "pdfToWord"]} locale={locale} />
      <ShareBar />
    </div>
  );
}
