import { getTranslations } from "next-intl/server";
import PdfPageNumbersClient from "./PdfPageNumbersClient";
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
  const t = await getTranslations({ locale, namespace: "pdfPageNumbers" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: buildI18nMetadata("/tools/pdf-page-numbers", locale),
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

export default async function PdfPageNumbersPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pdfPageNumbers" });
  const breadcrumbItems = await getToolBreadcrumbItems("pdfPageNumbers", locale);
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/pdf-page-numbers" : "https://neetpix.com/zh/tools/pdf-page-numbers"}
        locale={locale}
      />
      <Breadcrumb items={breadcrumbItems} />
      <PrivacyBadge locale={locale} />
      <PdfPageNumbersClient />
      <UseCases toolKey="pdfPageNumbers" locale={locale} />
      <Faq tool="pdfPageNumbers" locale={locale} />
      <FeedbackBar toolNameKey="pdfPageNumbers" />
      <RelatedTools tools={["pdfWatermark", "pdfMerge", "pdfSplit", "pdfCrop", "pdfRotate"]} locale={locale} />
      <ShareBar />
    </div>
  );
}
