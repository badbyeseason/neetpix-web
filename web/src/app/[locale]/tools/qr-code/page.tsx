import { getTranslations, getMessages } from "next-intl/server";
import QrCodeClient from "./QrCodeClient";
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
  const t = await getTranslations({ locale, namespace: "qrCode" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: buildI18nMetadata("/tools/qr-code", locale),
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

export default async function QrCodePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "qrCode" });
  const breadcrumbItems = await getToolBreadcrumbItems("qrCode", locale);
  // Faq 条目由后续 Task 6 统一添加；条目就绪前条件渲染，避免 next-intl 缺失键错误
  const messages = await getMessages();
  const faq = (messages as Record<string, Record<string, string> | undefined>)
    .faq;
  const hasFaq = Boolean(
    faq?.qrCode1 &&
      faq?.qrCode1a &&
      faq?.qrCode2 &&
      faq?.qrCode2a &&
      faq?.qrCode3 &&
      faq?.qrCode3a
  );
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={
          locale === "en"
            ? "https://neetpix.com/tools/qr-code"
            : "https://neetpix.com/zh/tools/qr-code"
        }
        locale={locale}
      />
      <Breadcrumb items={breadcrumbItems} />
      <PrivacyBadge locale={locale} />
      <QrCodeClient />
      <UseCases toolKey="qrCode" locale={locale} />
      {hasFaq && <Faq tool="qrCode" locale={locale} />}
      <FeedbackBar toolNameKey="qrCode" />
      <LearnMore slug="qr-code-generator-free" toolKey="qrCode" locale={locale} />
      <RelatedTools
        tools={["qrDecode", "imageWatermark", "imageGridSplit", "chartGenerator", "fileTransfer"]}
        locale={locale}
      />
      <ShareBar />
    </div>
  );
}
