import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import RemoveBackgroundClient from "./RemoveBackgroundClient";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "removeBackground" });
  return {
    title: t("title") + " - Neetpix",
    description: t("description"),
  };
}

export default function RemoveBackgroundPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <RemoveBackgroundClient />
    </div>
  );
}