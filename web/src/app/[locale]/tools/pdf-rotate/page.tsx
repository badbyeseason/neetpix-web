import { getTranslations } from "next-intl/server";
import PdfRotateClient from "./PdfRotateClient";
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
  const t = await getTranslations({ locale, namespace: "pdfRotate" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: buildI18nMetadata("/tools/pdf-rotate", locale),
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

export default async function PdfRotatePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pdfRotate" });
  const breadcrumbItems = await getToolBreadcrumbItems("pdfRotate", locale);
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/pdf-rotate" : "https://neetpix.com/zh/tools/pdf-rotate"}
        locale={locale}
      />
      <Breadcrumb items={breadcrumbItems} />
      <PrivacyBadge locale={locale} />
      <PdfRotateClient />
      <UseCases toolKey="pdfRotate" locale={locale} />
      <Faq tool="pdfRotate" locale={locale} />
      <FeedbackBar toolNameKey="pdfRotate" />
      <RelatedTools tools={["pdfCrop", "pdfSplit", "pdfMerge", "pdfCompress"]} locale={locale} />
      <ShareBar />
    </div>
  );
}
