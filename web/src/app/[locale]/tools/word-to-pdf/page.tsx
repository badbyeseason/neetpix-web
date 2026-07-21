import { getTranslations } from "next-intl/server";
import WordToPdfClient from "./WordToPdfClient";
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
  const t = await getTranslations({ locale, namespace: "wordToPdf" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: buildI18nMetadata("/tools/word-to-pdf", locale),
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

export default async function WordToPdfPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "wordToPdf" });
  const breadcrumbItems = await getToolBreadcrumbItems("wordToPdf", locale);
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/word-to-pdf" : "https://neetpix.com/zh/tools/word-to-pdf"}
        locale={locale}
      />
      <Breadcrumb items={breadcrumbItems} />
      <PrivacyBadge locale={locale} />
      <WordToPdfClient />
      <UseCases toolKey="wordToPdf" locale={locale} />
      <Faq tool="wordToPdf" locale={locale} />
      <FeedbackBar toolNameKey="wordToPdf" />
      <LearnMore slug="word-to-pdf-free" toolKey="wordToPdf" locale={locale} />
      <RelatedTools tools={["pdfToWord", "pdfMerge", "imageToPdf", "pdfCompress"]} locale={locale} />
      <ShareBar />
    </div>
  );
}
