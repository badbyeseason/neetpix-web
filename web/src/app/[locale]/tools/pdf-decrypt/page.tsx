import { getTranslations } from "next-intl/server";
import PdfDecryptClient from "./PdfDecryptClient";
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
  const t = await getTranslations({ locale, namespace: "pdfDecrypt" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: buildI18nMetadata("/tools/pdf-decrypt", locale),
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

export default async function PdfDecryptPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pdfDecrypt" });
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/pdf-decrypt" : "https://neetpix.com/zh/tools/pdf-decrypt"}
        locale={locale}
      />
      <PrivacyBadge locale={locale} />
      <PdfDecryptClient />
      {/* 法律声明：合规自保，小字灰色 */}
      <p className="mt-6 text-xs text-text-secondary/60 leading-relaxed max-w-2xl mx-auto text-center">
        {t("legalNote")}
      </p>
      <Faq tool="pdfDecrypt" locale={locale} />
      <FeedbackBar toolNameKey="pdfDecrypt" />
      <RelatedTools tools={["pdfEncrypt", "pdfMerge", "pdfSplit", "pdfCrop"]} locale={locale} />
      <ShareBar />
    </div>
  );
}
