import { getTranslations } from "next-intl/server";
import PdfSplitClient from "./PdfSplitClient";
import JsonLd from "@/components/seo/JsonLd";
import Faq from "@/components/seo/Faq";
import UseCases from "@/components/seo/UseCases";
import RelatedTools from "@/components/seo/RelatedTools";
import PrivacyBadge from "@/components/ui/PrivacyBadge";
import ShareBar from "@/components/ShareBar";
import FeedbackBar from "@/components/FeedbackBar";
import Breadcrumb from "@/components/seo/Breadcrumb";
import { buildI18nMetadata, getToolBreadcrumbItems } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pdfSplit" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: buildI18nMetadata("/tools/pdf-split", locale),
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

export default async function PdfSplitPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pdfSplit" });
  const breadcrumbItems = await getToolBreadcrumbItems("pdfSplit", locale);
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/pdf-split" : "https://neetpix.com/zh/tools/pdf-split"}
        locale={locale}
      />
      <Breadcrumb items={breadcrumbItems} />
      <PrivacyBadge locale={locale} />
      <PdfSplitClient />
      <UseCases toolKey="pdfSplit" locale={locale} />
      <Faq tool="pdfSplit" locale={locale} />
      <FeedbackBar toolNameKey="pdfSplit" />
      <RelatedTools tools={["pdfMerge", "pdfCompress", "pdfWatermark", "pdfCrop", "pdfRotate"]} locale={locale} />
      <ShareBar />
    </div>
  );
}
