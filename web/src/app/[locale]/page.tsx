import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { buildI18nMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });
  // 标题继承根 layout 的 title.default，避免与模板叠加产生双重后缀
  return {
    description: t("subtitle"),
    alternates: buildI18nMetadata("", locale),
    openGraph: {
      title: t("title"),
      description: t("subtitle"),
      images: ["/og-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("subtitle"),
      images: ["/og-image.png"],
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  // comingSoon 为可选字段，用于标记即将上线的工具
  const tools: { key: string; href: string; gradient: string; comingSoon?: boolean }[] = [
    { key: "removeBackground", href: "/tools/remove-background", gradient: "from-teal/10 to-teal-bg" },
    { key: "imageToPdf", href: "/tools/image-to-pdf", gradient: "from-coral/10 to-teal-bg" },
    { key: "pdfToWord", href: "/tools/pdf-to-word", gradient: "from-teal/10 to-bg-article" },
    { key: "wordToPdf", href: "/tools/word-to-pdf", gradient: "from-coral/10 to-bg-article" },
    { key: "screenshotTranslate", href: "/tools/screenshot-translate", gradient: "from-coral/10 to-teal-bg" },
    { key: "imageCompress", href: "/tools/image-compress", gradient: "from-teal-bg to-bg-article" },
    { key: "imageWatermark", href: "/tools/image-watermark", gradient: "from-coral/10 to-bg-article" },
    { key: "pdfMerge", href: "/tools/pdf-merge", gradient: "from-teal/10 to-bg-article" },
    { key: "pdfSplit", href: "/tools/pdf-split", gradient: "from-coral/10 to-teal-bg" },
    { key: "pdfCompress", href: "/tools/pdf-compress", gradient: "from-teal-bg to-bg-article" },
    { key: "pdfWatermark", href: "/tools/pdf-watermark", gradient: "from-teal/10 to-teal-bg" },
    { key: "pdfPageNumbers", href: "/tools/pdf-page-numbers", gradient: "from-coral/10 to-bg-article" },
  ];

  return (
    <div className="flex flex-col">
      <section className="py-20 sm:py-28 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center mb-6">
            <Logo className="w-16 h-16" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-text leading-[1.1]">
            {t("hero.title")}
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-text-secondary max-w-xl mx-auto leading-relaxed">
            {t("hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/tools/remove-background"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal text-white font-semibold text-sm hover:bg-teal-dark transition-colors"
            >
              {t("hero.cta")}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-bg-warm">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-text mb-12">
            {t("tools.title")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {tools.map((tool) => (
              <Link
                key={tool.key}
                href={tool.href}
                className={"group relative rounded-2xl p-6 sm:p-8 bg-gradient-to-br " + tool.gradient + " border border-border hover:border-teal-light transition-all hover:shadow-md"}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text">
                    {t("tools." + tool.key + ".name")}
                    {tool.comingSoon && (
                      <span className="ml-2 text-xs font-medium text-text-secondary bg-bg-article px-2 py-0.5 rounded-full">
                        Soon
                      </span>
                    )}
                  </h3>
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium text-teal bg-teal/10 px-2 py-1 rounded-full"
                    title={t("badge.localProcessingDesc")}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-teal" aria-hidden="true" />
                    {t("badge.localProcessing")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-secondary leading-relaxed">
                  {t("tools." + tool.key + ".desc")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-text">{t("hero.privacyTitle")}</h2>
          <p className="mt-2 text-text-secondary max-w-lg mx-auto">
            {t("hero.privacyDesc")}
          </p>
        </div>
      </section>
    </div>
  );
}