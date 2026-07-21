import { getTranslations } from "next-intl/server";
import PdfWatermarkClient from "./PdfWatermarkClient";
import JsonLd from "@/components/seo/JsonLd";
import Faq from "@/components/seo/Faq";
import UseCases from "@/components/seo/UseCases";
import RelatedTools from "@/components/seo/RelatedTools";
import Breadcrumb from "@/components/seo/Breadcrumb";
import PrivacyBadge from "@/components/ui/PrivacyBadge";
import ShareBar from "@/components/ShareBar";
import FeedbackBar from "@/components/FeedbackBar";
import { buildI18nMetadata, getToolBreadcrumbItems } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pdfWatermark" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: buildI18nMetadata("/tools/pdf-watermark", locale),
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

export default async function PdfWatermarkPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pdfWatermark" });
  const breadcrumbItems = await getToolBreadcrumbItems("pdfWatermark", locale);
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/pdf-watermark" : "https://neetpix.com/zh/tools/pdf-watermark"}
        locale={locale}
      />
      <Breadcrumb items={breadcrumbItems} />
      <PrivacyBadge locale={locale} />
      <PdfWatermarkClient />
      <UseCases toolKey="pdfWatermark" locale={locale} />
      <Faq tool="pdfWatermark" locale={locale} />
      <FeedbackBar toolNameKey="pdfWatermark" />
      <RelatedTools tools={["pdfEncrypt", "pdfPageNumbers", "pdfDecrypt", "pdfCrop", "pdfRotate"]} locale={locale} />
      <ShareBar />
    </div>
  );
}
