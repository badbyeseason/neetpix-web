import { getTranslations } from "next-intl/server";
import PdfEncryptClient from "./PdfEncryptClient";
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
  const t = await getTranslations({ locale, namespace: "pdfEncrypt" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: buildI18nMetadata("/tools/pdf-encrypt", locale),
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

export default async function PdfEncryptPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pdfEncrypt" });
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/pdf-encrypt" : "https://neetpix.com/zh/tools/pdf-encrypt"}
        locale={locale}
      />
      <PrivacyBadge locale={locale} />
      <PdfEncryptClient />
      <Faq tool="pdfEncrypt" locale={locale} />
      <FeedbackBar toolNameKey="pdfEncrypt" />
      <RelatedTools tools={["pdfDecrypt", "pdfWatermark", "pdfMerge", "pdfRotate"]} locale={locale} />
      <ShareBar />
    </div>
  );
}
