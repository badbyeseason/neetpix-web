import { getTranslations } from "next-intl/server";
import ImageResizeClient from "./ImageResizeClient";
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
  const t = await getTranslations({ locale, namespace: "imageResize" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: buildI18nMetadata("/tools/image-resize", locale),
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

export default async function ImageResizePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "imageResize" });
  const breadcrumbItems = await getToolBreadcrumbItems("imageResize", locale);
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={
          locale === "en"
            ? "https://neetpix.com/tools/image-resize"
            : "https://neetpix.com/zh/tools/image-resize"
        }
        locale={locale}
      />
      <Breadcrumb items={breadcrumbItems} />
      <PrivacyBadge locale={locale} />
      <ImageResizeClient />
      <UseCases toolKey="imageResize" locale={locale} />
      <Faq tool="imageResize" locale={locale} />
      <FeedbackBar toolNameKey="imageResize" />
      <RelatedTools
        tools={["imageCompress", "imageToPdf", "imageWatermark", "removeBackground", "imageIdPhoto", "imageOcr", "imageBlur", "imageGridSplit"]}
        locale={locale}
      />
      <ShareBar />
    </div>
  );
}
