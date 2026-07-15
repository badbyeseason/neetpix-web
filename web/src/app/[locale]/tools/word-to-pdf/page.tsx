import { getTranslations } from "next-intl/server";
import WordToPdfClient from "./WordToPdfClient";
import JsonLd from "@/components/seo/JsonLd";
import Faq from "@/components/seo/Faq";
import PrivacyBadge from "@/components/ui/PrivacyBadge";
import { buildI18nMetadata } from "@/lib/seo";

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
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/word-to-pdf" : "https://neetpix.com/zh/tools/word-to-pdf"}
        locale={locale}
      />
      <PrivacyBadge locale={locale} />
      <WordToPdfClient />
      <Faq tool="wordToPdf" locale={locale} />
    </div>
  );
}
