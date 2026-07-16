import { getTranslations } from "next-intl/server";
import PdfCropClient from "./PdfCropClient";
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
  const t = await getTranslations({ locale, namespace: "pdfCrop" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: buildI18nMetadata("/tools/pdf-crop", locale),
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

export default async function PdfCropPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pdfCrop" });
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/pdf-crop" : "https://neetpix.com/zh/tools/pdf-crop"}
        locale={locale}
      />
      <PrivacyBadge locale={locale} />
      <PdfCropClient />
      <Faq tool="pdfCrop" locale={locale} />
      <RelatedTools tools={["pdfRotate", "pdfSplit", "pdfMerge", "pdfCompress"]} locale={locale} />
    </div>
  );
}
