import { getTranslations, getMessages } from "next-intl/server";
import ImageGridSplitClient from "./ImageGridSplitClient";
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
  const t = await getTranslations({ locale, namespace: "imageGridSplit" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: buildI18nMetadata("/tools/image-grid-split", locale),
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

export default async function ImageGridSplitPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "imageGridSplit" });
  const breadcrumbItems = await getToolBreadcrumbItems("imageGridSplit", locale);
  // Faq 条目由后续 Task 6 统一添加；条目就绪前条件渲染，避免 next-intl 缺失键错误
  const messages = await getMessages();
  const faq = (messages as Record<string, Record<string, string> | undefined>)
    .faq;
  const hasFaq = Boolean(
    faq?.imageGridSplit1 &&
      faq?.imageGridSplit1a &&
      faq?.imageGridSplit2 &&
      faq?.imageGridSplit2a &&
      faq?.imageGridSplit3 &&
      faq?.imageGridSplit3a
  );
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={
          locale === "en"
            ? "https://neetpix.com/tools/image-grid-split"
            : "https://neetpix.com/zh/tools/image-grid-split"
        }
        locale={locale}
      />
      <Breadcrumb items={breadcrumbItems} />
      <PrivacyBadge locale={locale} />
      <ImageGridSplitClient />
      <UseCases toolKey="imageGridSplit" locale={locale} />
      {hasFaq && <Faq tool="imageGridSplit" locale={locale} />}
      <FeedbackBar toolNameKey="imageGridSplit" />
      <RelatedTools
        tools={["imageResize", "imageWatermark", "imageConvert", "imageCompress"]}
        locale={locale}
      />
      <ShareBar />
    </div>
  );
}
