import { getTranslations } from "next-intl/server";
import PdfToWordClient from "./PdfToWordClient";
import JsonLd from "@/components/seo/JsonLd";
import Faq from "@/components/seo/Faq";
import PrivacyBadge from "@/components/ui/PrivacyBadge";
import { buildI18nMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pdfToWord" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: buildI18nMetadata("/tools/pdf-to-word", locale),
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

export default async function PdfToWordPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pdfToWord" });
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/pdf-to-word" : "https://neetpix.com/zh/tools/pdf-to-word"}
        locale={locale}
      />
      <PrivacyBadge locale={locale} />
      <PdfToWordClient />
      <Faq tool="pdfToWord" locale={locale} />
    </div>
  );
}
