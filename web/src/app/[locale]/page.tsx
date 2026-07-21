import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import ToolCard from "@/components/home/ToolCard";
import MyToolsSection from "@/components/home/MyToolsSection";
import { buildI18nMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });
  const tHome = await getTranslations({ locale, namespace: "homepage" });
  // 使用 absolute 覆盖根 layout 的 title template，避免 "Neetpix - Neetpix" 重复
  return {
    title: { absolute: tHome("title") },
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
  type Tool = { key: string; href: string; gradient: string; comingSoon?: boolean; badge?: "new" | "hot" };
  const toolGroups: { category: string; tools: Tool[] }[] = [
    {
      category: t("nav.categoryPdf"),
      tools: [
        { key: "pdfToWord", href: "/tools/pdf-to-word", gradient: "from-teal/10 to-bg-article", badge: "hot" },
        { key: "wordToPdf", href: "/tools/word-to-pdf", gradient: "from-coral/10 to-bg-article", badge: "hot" },
        { key: "imageToPdf", href: "/tools/image-to-pdf", gradient: "from-coral/10 to-teal-bg" },
        { key: "pdfMerge", href: "/tools/pdf-merge", gradient: "from-teal/10 to-bg-article" },
        { key: "pdfSplit", href: "/tools/pdf-split", gradient: "from-coral/10 to-teal-bg" },
        { key: "pdfCompress", href: "/tools/pdf-compress", gradient: "from-teal-bg to-bg-article" },
        { key: "pdfWatermark", href: "/tools/pdf-watermark", gradient: "from-teal/10 to-teal-bg" },
        { key: "pdfPageNumbers", href: "/tools/pdf-page-numbers", gradient: "from-coral/10 to-bg-article" },
        { key: "pdfEncrypt", href: "/tools/pdf-encrypt", gradient: "from-teal/10 to-bg-article" },
        { key: "pdfDecrypt", href: "/tools/pdf-decrypt", gradient: "from-coral/10 to-bg-article" },
        { key: "pdfCrop", href: "/tools/pdf-crop", gradient: "from-coral/10 to-bg-article", badge: "new" },
        { key: "pdfRotate", href: "/tools/pdf-rotate", gradient: "from-teal/10 to-bg-article", badge: "new" },
      ],
    },
    {
      category: t("nav.categoryImage"),
      tools: [
        { key: "removeBackground", href: "/tools/remove-background", gradient: "from-teal/10 to-teal-bg", badge: "hot" },
        { key: "imageCompress", href: "/tools/image-compress", gradient: "from-teal-bg to-bg-article" },
        { key: "imageWatermark", href: "/tools/image-watermark", gradient: "from-coral/10 to-bg-article" },
        { key: "imageConvert", href: "/tools/image-convert", gradient: "from-coral-light/10 to-teal-bg", badge: "new" },
        { key: "imageExif", href: "/tools/image-exif", gradient: "from-coral-light/10 to-bg-article", badge: "new" },
        { key: "imageResize", href: "/tools/image-resize", gradient: "from-coral/10 to-bg-warm", badge: "new" },
        { key: "imageIdPhoto", href: "/tools/image-id-photo", gradient: "from-teal/10 to-bg-warm", badge: "new" },
        { key: "imageOcr", href: "/tools/image-ocr", gradient: "from-coral-light/10 to-bg-warm", badge: "new" },
        { key: "imageBlur", href: "/tools/image-blur", gradient: "from-teal-bg to-bg-warm", badge: "new" },
        { key: "imageGridSplit", href: "/tools/image-grid-split", gradient: "from-coral/10 to-bg-warm", badge: "new" },
      ],
    },
    {
      category: t("nav.categoryTranslate"),
      tools: [
        { key: "screenshotTranslate", href: "/tools/screenshot-translate", gradient: "from-coral/10 to-teal-bg" },
      ],
    },
    {
      category: t("nav.categoryGenerator"),
      tools: [
        { key: "qrDecode", href: "/tools/qr-decode", gradient: "from-coral/10 to-bg-warm", badge: "new" },
        { key: "qrCode", href: "/tools/qr-code", gradient: "from-teal/10 to-bg-warm", badge: "new" },
        { key: "chartGenerator", href: "/tools/chart-generator", gradient: "from-coral-light/10 to-bg-warm", badge: "new" },
      ],
    },
    {
      category: t("nav.networkTools"),
      tools: [
        { key: "fileTransfer", href: "/tools/file-transfer", gradient: "from-teal/10 to-bg-warm", badge: "new" },
      ],
    },
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

      <MyToolsSection />

      <section className="py-16 px-4 bg-bg-warm">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-text mb-12">
            {t("tools.title")}
          </h2>
          <div className="space-y-12">
            {toolGroups.map((group) => (
              <div key={group.category}>
                <h3 className="text-xl font-bold text-text mb-6 text-center sm:text-left">
                  {group.category}
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {group.tools.map((tool) => (
                    <ToolCard
                      key={tool.key}
                      toolKey={tool.key}
                      href={tool.href}
                      gradient={tool.gradient}
                      badge={tool.badge}
                      comingSoon={tool.comingSoon}
                    />
                  ))}
                </div>
              </div>
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