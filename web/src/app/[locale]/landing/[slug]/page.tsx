import { getTranslations, getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import JsonLd from "@/components/seo/JsonLd";
import Faq from "@/components/seo/Faq";
import UseCases from "@/components/seo/UseCases";
import RelatedTools from "@/components/seo/RelatedTools";
import Breadcrumb from "@/components/seo/Breadcrumb";
import PrivacyBadge from "@/components/ui/PrivacyBadge";
import ShareBar from "@/components/ShareBar";
import FeedbackBar from "@/components/FeedbackBar";
import { buildI18nMetadata, getLandingBreadcrumbItems } from "@/lib/seo";
import { LANDING_PAGES, LANDING_PAGE_MAP } from "@/lib/landing-pages";
import LandingCta from "./LandingCta";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

// 工具 key → 路由 slug 映射（仅包含 landing page 关联的工具）
const TOOL_ROUTES: Record<string, string> = {
  pdfCompress: "pdf-compress",
  pdfMerge: "pdf-merge",
  pdfSplit: "pdf-split",
  pdfToWord: "pdf-to-word",
  wordToPdf: "word-to-pdf",
  imageToPdf: "image-to-pdf",
  imageCompress: "image-compress",
  imageConvert: "image-convert",
  imageResize: "image-resize",
  imageWatermark: "image-watermark",
  removeBackground: "remove-background",
  qrCode: "qr-code",
  qrDecode: "qr-decode",
  chartGenerator: "chart-generator",
};

// 每个 landing page 推荐的相关工具列表（4 个，含主关联工具）
const LANDING_RELATED_TOOLS: Record<string, string[]> = {
  compressPdfTo100kb: ["pdfCompress", "pdfMerge", "pdfSplit", "imageCompress"],
  pdfMergeAndCompress: ["pdfMerge", "pdfCompress", "pdfSplit", "pdfToWord"],
  imageToPdfConverter: ["imageToPdf", "imageCompress", "imageWatermark", "wordToPdf"],
  removeBackgroundFree: ["removeBackground", "imageCompress", "imageConvert", "imageResize"],
  qrCodeGeneratorFree: ["qrCode", "qrDecode", "chartGenerator", "imageWatermark"],
  pdfCompressOnline: ["pdfCompress", "pdfMerge", "pdfSplit", "imageCompress"],
  wordToPdfFree: ["wordToPdf", "pdfToWord", "imageToPdf", "pdfCompress"],
  imageCompressTo50kb: ["imageCompress", "imageConvert", "imageResize", "imageToPdf"],
};

export function generateStaticParams() {
  const locales = ["en", "zh"];
  return LANDING_PAGES.flatMap((page) =>
    locales.map((locale) => ({ locale, slug: page.slug })),
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const landing = LANDING_PAGE_MAP[slug];
  if (!landing) return {};
  const t = await getTranslations({
    locale,
    namespace: `landing.${landing.i18nKey}`,
  });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: buildI18nMetadata(`/landing/${slug}`, locale),
    openGraph: {
      title: t("title"),
      description: t("description"),
      images: ["/og-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/og-image.png"],
    },
  };
}

export default async function LandingPage({ params }: Props) {
  const { locale, slug } = await params;
  const landing = LANDING_PAGE_MAP[slug];
  if (!landing) {
    notFound();
  }
  const t = await getTranslations({
    locale,
    namespace: `landing.${landing.i18nKey}`,
  });
  const breadcrumbItems = await getLandingBreadcrumbItems(slug, locale);
  const tLanding = await getTranslations({ locale, namespace: "landing" });

  const toolSlug = TOOL_ROUTES[landing.toolKey];
  const toolHref =
    locale === "en" ? `/tools/${toolSlug}` : `/zh/tools/${toolSlug}`;

  const relatedTools =
    LANDING_RELATED_TOOLS[landing.i18nKey] ?? [landing.toolKey];

  // 检查 faq 条目是否存在（避免 next-intl 缺失键错误）
  const messages = await getMessages();
  const faq = (messages as Record<string, Record<string, string> | undefined>)
    .faq;
  const hasFaq = Boolean(
    faq?.[`${landing.i18nKey}1`] &&
      faq?.[`${landing.i18nKey}1a`] &&
      faq?.[`${landing.i18nKey}2`] &&
      faq?.[`${landing.i18nKey}2a`] &&
      faq?.[`${landing.i18nKey}3`] &&
      faq?.[`${landing.i18nKey}3a`],
  );

  const url =
    locale === "en"
      ? `https://neetpix.com/landing/${slug}`
      : `https://neetpix.com/zh/landing/${slug}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <JsonLd
        name={t("title")}
        description={t("description")}
        url={url}
        locale={locale}
      />
      <Breadcrumb items={breadcrumbItems} />
      <PrivacyBadge locale={locale} />

      <h1 className="text-3xl sm:text-4xl font-bold text-text mb-4 text-center">
        {t("h1")}
      </h1>
      <p className="text-text-secondary leading-relaxed mb-8 text-center max-w-2xl mx-auto">
        {t("intro")}
      </p>

      <section className="mt-12 mb-12">
        <h2 className="text-2xl font-bold text-text mb-6 text-center">
          {tLanding("howToUseTitle")}
        </h2>
        <ol className="space-y-4 max-w-2xl mx-auto">
          {[1, 2, 3].map((n) => (
            <li
              key={n}
              className="flex items-start gap-4 rounded-2xl border border-border bg-bg-warm p-4"
            >
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal text-white font-semibold flex items-center justify-center text-sm">
                {n}
              </span>
              <p className="text-text leading-relaxed pt-1">{t(`step${n}`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <UseCases toolKey={landing.toolKey} locale={locale} />

      {hasFaq && <Faq tool={landing.i18nKey} locale={locale} />}

      <section className="mt-12 mb-4 text-center">
        <LandingCta
          href={toolHref}
          label={t("cta")}
          slug={slug}
          targetTool={landing.toolKey}
        />
      </section>

      <FeedbackBar toolNameKey={landing.toolKey} />
      <RelatedTools tools={relatedTools} locale={locale} />
      <ShareBar />
    </div>
  );
}
