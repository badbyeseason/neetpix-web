import { getTranslations } from "next-intl/server";
import PdfMergeClient from "./PdfMergeClient";
import JsonLd from "@/components/seo/JsonLd";
import Faq from "@/components/seo/Faq";
import UseCases from "@/components/seo/UseCases";
import RelatedTools from "@/components/seo/RelatedTools";
import LearnMore from "@/components/seo/LearnMore";
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
  const t = await getTranslations({ locale, namespace: "pdfMerge" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: buildI18nMetadata("/tools/pdf-merge", locale),
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

export default async function PdfMergePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pdfMerge" });
  const breadcrumbItems = await getToolBreadcrumbItems("pdfMerge", locale);
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/pdf-merge" : "https://neetpix.com/zh/tools/pdf-merge"}
        locale={locale}
      />
      <Breadcrumb items={breadcrumbItems} />
      <PrivacyBadge locale={locale} />
      <PdfMergeClient />
      <UseCases toolKey="pdfMerge" locale={locale} />
      <Faq tool="pdfMerge" locale={locale} />
      <FeedbackBar toolNameKey="pdfMerge" />
      <LearnMore slug="pdf-merge-and-compress" toolKey="pdfMerge" locale={locale} />
      <RelatedTools tools={["pdfSplit", "pdfCompress", "pdfToWord", "pdfCrop", "pdfRotate"]} locale={locale} />
      <ShareBar />
    </div>
  );
}
