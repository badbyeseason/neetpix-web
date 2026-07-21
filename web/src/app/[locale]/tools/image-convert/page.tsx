import { getTranslations } from "next-intl/server";
import ImageConvertClient from "./ImageConvertClient";
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
  const t = await getTranslations({ locale, namespace: "imageConvert" });
  return {
    // title 已含 "| Neetpix"，用 absolute 避免 Neetpix 重复
    title: { absolute: t("title") },
    description: t("description"),
    alternates: buildI18nMetadata("/tools/image-convert", locale),
    openGraph: {
      title: t("title"),
      description: t("description"),
      images: ["/og-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/og-image.png"],
    },
  };
}

export default async function ImageConvertPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "imageConvert" });
  const breadcrumbItems = await getToolBreadcrumbItems("imageConvert", locale);
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title")}
        description={t("description")}
        url={
          locale === "en"
            ? "https://neetpix.com/tools/image-convert"
            : "https://neetpix.com/zh/tools/image-convert"
        }
        locale={locale}
      />
      <Breadcrumb items={breadcrumbItems} />
      <PrivacyBadge locale={locale} />
      <ImageConvertClient />
      <UseCases toolKey="imageConvert" locale={locale} />
      <Faq tool="imageConvert" locale={locale} />
      <FeedbackBar toolNameKey="imageConvert" />
      <RelatedTools
        tools={["imageToPdf", "imageCompress", "imageWatermark", "removeBackground", "imageIdPhoto", "imageOcr", "imageBlur", "imageGridSplit"]}
        locale={locale}
      />
      <ShareBar />
    </div>
  );
}
