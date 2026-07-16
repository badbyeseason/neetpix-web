import { getTranslations } from "next-intl/server";
import PdfMergeClient from "./PdfMergeClient";
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
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/pdf-merge" : "https://neetpix.com/zh/tools/pdf-merge"}
        locale={locale}
      />
      <PrivacyBadge locale={locale} />
      <PdfMergeClient />
      <Faq tool="pdfMerge" locale={locale} />
      <RelatedTools tools={["pdfSplit", "pdfCompress", "pdfToWord", "pdfCrop", "pdfRotate"]} locale={locale} />
    </div>
  );
}
