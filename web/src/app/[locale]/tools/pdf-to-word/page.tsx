import { getTranslations } from "next-intl/server";
import PdfToWordClient from "./PdfToWordClient";
import JsonLd from "@/components/seo/JsonLd";
import Faq from "@/components/seo/Faq";
import PrivacyBadge from "@/components/ui/PrivacyBadge";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pdfToWord" });
  return {
    title: t("title"),
    description: t("description"),
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
        url="https://neetpix.com/tools/pdf-to-word"
      />
      <PrivacyBadge locale={locale} />
      <PdfToWordClient />
      <Faq tool="pdfToWord" locale={locale} />
    </div>
  );
}
