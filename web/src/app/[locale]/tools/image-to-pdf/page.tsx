import { getTranslations } from "next-intl/server";
import ImageToPdfClient from "./ImageToPdfClient";
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
  const t = await getTranslations({ locale, namespace: "imageToPdf" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: buildI18nMetadata("/tools/image-to-pdf", locale),
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

export default async function ImageToPdfPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "imageToPdf" });
  const breadcrumbItems = await getToolBreadcrumbItems("imageToPdf", locale);
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/image-to-pdf" : "https://neetpix.com/zh/tools/image-to-pdf"}
        locale={locale}
      />
      <Breadcrumb items={breadcrumbItems} />
      <PrivacyBadge locale={locale} />
      <ImageToPdfClient />
      <UseCases toolKey="imageToPdf" locale={locale} />
      <Faq tool="imageToPdf" locale={locale} />
      <FeedbackBar toolNameKey="imageToPdf" />
      <LearnMore slug="image-to-pdf-converter" toolKey="imageToPdf" locale={locale} />
      <RelatedTools tools={["imageCompress", "imageWatermark", "wordToPdf", "pdfMerge", "imageGridSplit"]} locale={locale} />
      <ShareBar />
    </div>
  );
}
