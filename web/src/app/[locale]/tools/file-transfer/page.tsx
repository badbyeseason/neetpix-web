import { getTranslations, getMessages } from "next-intl/server";
import FileTransferClient from "./FileTransferClient";
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
  const t = await getTranslations({ locale, namespace: "fileTransfer" });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: buildI18nMetadata("/tools/file-transfer", locale),
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

export default async function FileTransferPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "fileTransfer" });
  // Faq 条目条件渲染：检查 faq.fileTransfer1..3 是否齐全（Faq 组件仅渲染前 3 条）
  const messages = await getMessages();
  const faq = (messages as Record<string, Record<string, string> | undefined>)
    .faq;
  const hasFaq = Boolean(
    faq?.fileTransfer1 &&
      faq?.fileTransfer1a &&
      faq?.fileTransfer2 &&
      faq?.fileTransfer2a &&
      faq?.fileTransfer3 &&
      faq?.fileTransfer3a
  );
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={
          locale === "en"
            ? "https://neetpix.com/tools/file-transfer"
            : "https://neetpix.com/zh/tools/file-transfer"
        }
        locale={locale}
        type="SoftwareApplication"
      />
      <PrivacyBadge locale={locale} variant="p2p" />
      <FileTransferClient />
      {hasFaq && <Faq tool="fileTransfer" locale={locale} />}
      <RelatedTools
        tools={["qrCode", "chartGenerator", "imageGridSplit"]}
        locale={locale}
      />
    </div>
  );
}
