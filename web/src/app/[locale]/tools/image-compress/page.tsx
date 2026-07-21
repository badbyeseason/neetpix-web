import { getTranslations } from "next-intl/server";
import ImageCompressClient from "./ImageCompressClient";
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
  const t = await getTranslations({ locale, namespace: "imageCompress" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: buildI18nMetadata("/tools/image-compress", locale),
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

export default async function ImageCompressPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "imageCompress" });
  const breadcrumbItems = await getToolBreadcrumbItems("imageCompress", locale);
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/image-compress" : "https://neetpix.com/zh/tools/image-compress"}
        locale={locale}
      />
      <Breadcrumb items={breadcrumbItems} />
      <PrivacyBadge locale={locale} />
      <ImageCompressClient />
      <UseCases toolKey="imageCompress" locale={locale} />
      <Faq tool="imageCompress" locale={locale} />
      <FeedbackBar toolNameKey="imageCompress" />
      <LearnMore slug="image-compress-to-50kb" toolKey="imageCompress" locale={locale} />
      <RelatedTools tools={["imageToPdf", "imageWatermark", "removeBackground", "imageConvert", "imageExif", "imageResize", "imageIdPhoto", "imageOcr", "imageBlur", "imageGridSplit"]} locale={locale} />
      <ShareBar />
    </div>
  );
}
