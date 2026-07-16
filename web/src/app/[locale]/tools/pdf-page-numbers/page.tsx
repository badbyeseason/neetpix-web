import { getTranslations } from "next-intl/server";
import PdfPageNumbersClient from "./PdfPageNumbersClient";
import JsonLd from "@/components/seo/JsonLd";
import Faq from "@/components/seo/Faq";
import RelatedTools from "@/components/seo/RelatedTools";
import PrivacyBadge from "@/components/ui/PrivacyBadge";
import { buildI18nMetadata } from "@/lib/seo";

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
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/pdf-page-numbers" : "https://neetpix.com/zh/tools/pdf-page-numbers"}
        locale={locale}
      />
      <PrivacyBadge locale={locale} />
      <PdfPageNumbersClient />
      <Faq tool="pdfPageNumbers" locale={locale} />
      <RelatedTools tools={["pdfWatermark", "pdfMerge", "pdfSplit", "pdfCrop", "pdfRotate"]} locale={locale} />
    </div>
  );
}
