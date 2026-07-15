import { getTranslations } from "next-intl/server";
import RemoveBackgroundClient from "./RemoveBackgroundClient";
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
  const t = await getTranslations({ locale, namespace: "removeBackground" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: buildI18nMetadata("/tools/remove-background", locale),
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

export default async function RemoveBackgroundPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "removeBackground" });
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title") + " - Neetpix"}
        description={t("description")}
        url={locale === "en" ? "https://neetpix.com/tools/remove-background" : "https://neetpix.com/zh/tools/remove-background"}
        locale={locale}
      />
      <PrivacyBadge locale={locale} />
      <RemoveBackgroundClient />
      <Faq tool="removeBackground" locale={locale} />
      <RelatedTools tools={["imageCompress", "imageWatermark", "imageToPdf", "screenshotTranslate"]} locale={locale} />
    </div>
  );
}
