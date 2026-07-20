import { getTranslations, getMessages } from "next-intl/server";
import QrCodeClient from "./QrCodeClient";
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
      <PrivacyBadge locale={locale} />
      <QrCodeClient />
      {hasFaq && <Faq tool="qrCode" locale={locale} />}
      <RelatedTools
        tools={["imageWatermark", "imageGridSplit", "chartGenerator"]}
        locale={locale}
      />
    </div>
  );
}
