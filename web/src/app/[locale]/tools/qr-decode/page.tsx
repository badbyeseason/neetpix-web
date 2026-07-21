import { getTranslations, getMessages } from "next-intl/server";
import QrDecodeClient from "./QrDecodeClient";
import JsonLd from "@/components/seo/JsonLd";
import Faq from "@/components/seo/Faq";
import RelatedTools from "@/components/seo/RelatedTools";
import PrivacyBadge from "@/components/ui/PrivacyBadge";
import ShareBar from "@/components/ShareBar";
import FeedbackBar from "@/components/FeedbackBar";
import { buildI18nMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "qrDecode" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: buildI18nMetadata("/tools/qr-decode", locale),
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

export default async function QrDecodePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "qrDecode" });
  const messages = await getMessages();
  const faq = (messages as Record<string, Record<string, string> | undefined>).faq;
  const hasFaq = Boolean(
    faq?.qrDecode1 &&
      faq?.qrDecode1a &&
      faq?.qrDecode2 &&
      faq?.qrDecode2a &&
      faq?.qrDecode3 &&
      faq?.qrDecode3a &&
      faq?.qrDecode4 &&
      faq?.qrDecode4a
  );
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={
          locale === "en"
            ? "https://neetpix.com/tools/qr-decode"
            : "https://neetpix.com/zh/tools/qr-decode"
        }
        locale={locale}
      />
      <PrivacyBadge locale={locale} />
      <QrDecodeClient />
      {hasFaq && <Faq tool="qrDecode" locale={locale} />}
      <FeedbackBar toolNameKey="qrDecode" />
      <RelatedTools
        tools={["qrCode", "chartGenerator", "imageOcr", "fileTransfer"]}
        locale={locale}
      />
      <ShareBar />
    </div>
  );
}
