import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/seo/Breadcrumb";
import PrivacyBadge from "@/components/ui/PrivacyBadge";
import RelatedTools from "@/components/seo/RelatedTools";
import { buildI18nMetadata } from "@/lib/seo";
import { COMPARE_PAGES, COMPARE_PAGE_MAP } from "@/lib/compare-pages";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

// 对比页 JSON-LD 用 Article 类型（headline / datePublished / author / publisher）
const DATE_PUBLISHED = "2026-07-21";

export function generateStaticParams() {
  const locales = ["en", "zh"];
  return COMPARE_PAGES.flatMap((page) =>
    locales.map((locale) => ({ locale, slug: page.slug })),
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const compare = COMPARE_PAGE_MAP[slug];
  if (!compare) return {};
  const t = await getTranslations({
    locale,
    namespace: `compare.${compare.i18nKey}`,
  });
  return {
    title: { absolute: t("title") },
    description: t("description"),
    alternates: buildI18nMetadata(`/compare/${slug}`, locale),
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

export default async function ComparePage({ params }: Props) {
  const { locale, slug } = await params;
  const compare = COMPARE_PAGE_MAP[slug];
  if (!compare) {
    notFound();
  }
  const t = await getTranslations({
    locale,
    namespace: `compare.${compare.i18nKey}`,
  });
  const tCompare = await getTranslations({ locale, namespace: "compare" });
  const tNav = await getTranslations({ locale, namespace: "nav" });

  const toolHref =
    locale === "en" ? `/tools/${compare.toolKey}` : `/zh/tools/${compare.toolKey}`;
  const homeHref = locale === "en" ? "/" : "/zh";
  const url =
    locale === "en"
      ? `https://neetpix.com/compare/${slug}`
      : `https://neetpix.com/zh/compare/${slug}`;

  // Article JSON-LD
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: t("heroTitle"),
    description: t("description"),
    datePublished: DATE_PUBLISHED,
    dateModified: DATE_PUBLISHED,
    author: { "@type": "Organization", name: "Neetpix" },
    publisher: {
      "@type": "Organization",
      name: "Neetpix",
      logo: {
        "@type": "ImageObject",
        url: "https://neetpix.com/og-image.png",
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  // FAQ JSON-LD + FAQ 渲染数据（3 条）
  const faqItems = [
    { q: t("faq1"), a: t("faq1a") },
    { q: t("faq2"), a: t("faq2a") },
    { q: t("faq3"), a: t("faq3a") },
  ];
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  // 对比表 features 维度为 string[]（5-7 条子项），其余 4 维度为单字符串
  const competitorFeatures = t.raw("competitorFeatures") as string[];
  const neetpixFeatures = t.raw("neetpixFeatures") as string[];

  const singleRows = [
    {
      label: t("pricingLabel"),
      competitor: t("competitorPricing"),
      neetpix: t("neetpixPricing"),
    },
    {
      label: t("privacyLabel"),
      competitor: t("competitorPrivacy"),
      neetpix: t("neetpixPrivacy"),
    },
    {
      label: t("limitsLabel"),
      competitor: t("competitorLimits"),
      neetpix: t("neetpixLimits"),
    },
    {
      label: t("speedLabel"),
      competitor: t("competitorSpeed"),
      neetpix: t("neetpixSpeed"),
    },
  ];

  const breadcrumbItems = [
    { name: tNav("home"), href: homeHref },
    { name: tCompare("breadcrumbLabel") },
    { name: t("heroTitle") },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <Breadcrumb items={breadcrumbItems} />
      <PrivacyBadge locale={locale} />

      {/* Hero */}
      <h1 className="text-3xl sm:text-4xl font-bold text-text mb-4 text-center">
        {t("heroTitle")}
      </h1>
      <p className="text-text-secondary leading-relaxed mb-10 text-center max-w-2xl mx-auto">
        {t("heroSubtitle")}
      </p>

      {/* CTA (top) */}
      <div className="mb-12 text-center">
        <a
          href={toolHref}
          className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-teal text-white font-semibold text-base sm:text-lg hover:bg-teal-dark transition-colors shadow-md"
        >
          {t("ctaButton")}
        </a>
      </div>

      {/* 对比表 */}
      <section className="mt-4 mb-12">
        <h2 className="text-2xl font-bold text-text mb-6 text-center">
          {t("tableTitle")}
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-bg-warm">
          <table className="w-full text-sm sm:text-base">
            <thead>
              <tr className="border-b border-border bg-bg-article">
                <th className="text-left p-4 font-semibold text-text w-1/4">
                  {tCompare("dimensionLabel")}
                </th>
                <th className="text-left p-4 font-semibold text-text w-1/3">
                  {compare.competitor}
                </th>
                <th className="text-left p-4 font-semibold text-white bg-teal w-1/3">
                  Neetpix
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Features 维度（多行子项） */}
              <tr className="border-b border-border align-top">
                <td className="p-4 font-medium text-text">
                  {t("featuresLabel")}
                </td>
                <td className="p-4 text-text-secondary">
                  <ul className="space-y-1.5 list-disc list-inside">
                    {competitorFeatures.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </td>
                <td className="p-4 text-text bg-teal/5 border-l-2 border-teal">
                  <ul className="space-y-1.5 list-disc list-inside">
                    {neetpixFeatures.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </td>
              </tr>
              {/* 其余 4 维度（单行文本） */}
              {singleRows.map((row, idx) => (
                <tr
                  key={idx}
                  className={
                    idx === singleRows.length - 1
                      ? "align-top"
                      : "border-b border-border align-top"
                  }
                >
                  <td className="p-4 font-medium text-text">{row.label}</td>
                  <td className="p-4 text-text-secondary">{row.competitor}</td>
                  <td className="p-4 text-text bg-teal/5 border-l-2 border-teal">
                    {row.neetpix}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA (bottom) */}
      <div className="mb-16 text-center">
        <a
          href={toolHref}
          className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-teal text-white font-semibold text-base sm:text-lg hover:bg-teal-dark transition-colors shadow-md"
        >
          {t("ctaButton")}
        </a>
      </div>

      {/* FAQ */}
      <section className="mt-16 border-t border-border pt-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
        <h2 className="text-2xl font-bold text-text mb-6">
          {tCompare("faqTitle")}
        </h2>
        <div className="space-y-6">
          {faqItems.map((item, i) => (
            <div key={i}>
              <h3 className="font-semibold text-text mb-1">{item.q}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* RelatedTools */}
      <RelatedTools tools={compare.relatedTools} locale={locale} />
    </div>
  );
}
