import { getTranslations, getMessages } from "next-intl/server";
import ImageOcrClient from "./ImageOcrClient";
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
  const t = await getTranslations({ locale, namespace: "imageOcr" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: buildI18nMetadata("/tools/image-ocr", locale),
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

export default async function ImageOcrPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "imageOcr" });
  // Faq 条目由后续 Task 7 统一添加；条目就绪前条件渲染，避免 next-intl 缺失键错误
  const messages = await getMessages();
  const faq = (messages as Record<string, Record<string, string> | undefined>).faq;
  const hasFaq = Boolean(
    faq?.imageOcr1 &&
      faq?.imageOcr1a &&
      faq?.imageOcr2 &&
      faq?.imageOcr2a &&
      faq?.imageOcr3 &&
      faq?.imageOcr3a
  );
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={
          locale === "en"
            ? "https://neetpix.com/tools/image-ocr"
            : "https://neetpix.com/zh/tools/image-ocr"
        }
        locale={locale}
      />
      <PrivacyBadge locale={locale} />
      <ImageOcrClient />
      {hasFaq && <Faq tool="imageOcr" locale={locale} />}
      <FeedbackBar toolNameKey="imageOcr" />
      <RelatedTools
        tools={["screenshotTranslate", "imageToPdf", "imageCompress", "pdfToWord"]}
        locale={locale}
      />
      <ShareBar />
    </div>
  );
}
