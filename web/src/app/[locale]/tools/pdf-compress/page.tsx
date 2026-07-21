import { getTranslations } from "next-intl/server";
import PdfCompressClient from "./PdfCompressClient";
import JsonLd from "@/components/seo/JsonLd";
import Faq from "@/components/seo/Faq";
import UseCases from "@/components/seo/UseCases";
import RelatedTools from "@/components/seo/RelatedTools";
import LearnMore from "@/components/seo/LearnMore";
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
  const t = await getTranslations({ locale, namespace: "pdfCompress" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: buildI18nMetadata("/tools/pdf-compress", locale),
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

export default async function PdfCompressPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pdfCompress" });
  const breadcrumbItems = await getToolBreadcrumbItems("pdfCompress", locale);
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/pdf-compress" : "https://neetpix.com/zh/tools/pdf-compress"}
        locale={locale}
      />
      <Breadcrumb items={breadcrumbItems} />
      <PrivacyBadge locale={locale} />
      <PdfCompressClient />
      <UseCases toolKey="pdfCompress" locale={locale} />
      <Faq tool="pdfCompress" locale={locale} />
      <FeedbackBar toolNameKey="pdfCompress" />
      <LearnMore slug="compress-pdf-to-100kb" toolKey="pdfCompress" locale={locale} />
      <LearnMore slug="pdf-compress-online" toolKey="pdfCompress" locale={locale} />
      <RelatedTools tools={["pdfMerge", "pdfSplit", "pdfEncrypt", "pdfCrop", "pdfRotate"]} locale={locale} />
      <ShareBar />
    </div>
  );
}
