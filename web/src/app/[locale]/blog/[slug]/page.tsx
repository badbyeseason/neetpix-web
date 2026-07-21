import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Breadcrumb from "@/components/seo/Breadcrumb";
import RelatedTools from "@/components/seo/RelatedTools";
import ShareBar from "@/components/ShareBar";
import { buildI18nMetadata } from "@/lib/seo";
import { BLOG_POSTS, BLOG_POST_MAP } from "@/lib/blog-posts";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

// 工具 key → 路由 slug 映射（与 landing/[slug]/page.tsx 保持一致）
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

export function generateStaticParams() {
  const locales = ["en", "zh"];
  return BLOG_POSTS.flatMap((post) =>
    locales.map((locale) => ({ locale, slug: post.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = BLOG_POST_MAP[slug];
  if (!post) return {};
  const t = await getTranslations({ locale, namespace: `blog.${slug}` });
  const title = t("title");
  const description = t("description");
  return {
    title: { absolute: title },
    description,
    alternates: buildI18nMetadata(`/blog/${slug}`, locale),
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.datePublished,
      authors: [post.author],
      images: ["/og-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
  };
}

function formatDate(iso: string, locale: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const post = BLOG_POST_MAP[slug];
  if (!post) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: `blog.${slug}` });
  const tBlog = await getTranslations({ locale, namespace: "blog" });
  const tNav = await getTranslations({ locale, namespace: "nav" });
  const tTools = await getTranslations({ locale, namespace: "tools" });

  const title = t("title");
  const description = t("description");
  // content 是 string[]，使用 t.raw 取原始数组
  const content = t.raw("content") as unknown as string[];

  const homeHref = locale === "en" ? "/" : "/zh";
  const blogHref = locale === "en" ? "/blog" : "/zh/blog";
  const breadcrumbItems = [
    { name: tNav("home"), href: homeHref },
    { name: tBlog("pageTitle"), href: blogHref },
    { name: title },
  ];

  // 主关联工具用于 CTA
  const primaryToolKey = post.toolKey[0];
  const primaryToolSlug = TOOL_ROUTES[primaryToolKey];
  const toolHref =
    primaryToolSlug &&
    (locale === "en"
      ? `/tools/${primaryToolSlug}`
      : `/zh/tools/${primaryToolSlug}`);
  const toolName = tTools(`${primaryToolKey}.name`);
  const ctaLabel = tBlog("cta", { tool: toolName });

  const url =
    locale === "en"
      ? `https://neetpix.com/blog/${slug}`
      : `https://neetpix.com/zh/blog/${slug}`;

  // Article JSON-LD
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished: post.datePublished,
    author: {
      "@type": "Organization",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Neetpix",
      logo: {
        "@type": "ImageObject",
        url: "https://neetpix.com/icon.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Breadcrumb items={breadcrumbItems} />

      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary mb-4">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal/10 text-teal font-medium">
            {tBlog(`categories.${post.category}`)}
          </span>
          <span>{tBlog("publishedAt", { date: formatDate(post.datePublished, locale) })}</span>
          <span aria-hidden="true">·</span>
          <span>{tBlog("readingTime", { minutes: post.readingTime })}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-text mb-4 leading-tight">
          {title}
        </h1>
        <p className="text-text-secondary leading-relaxed text-lg mb-4">
          {description}
        </p>
        <div className="text-sm text-text-secondary">
          {tBlog("byAuthor", { author: post.author })}
        </div>
      </header>

      <article className="max-w-none">
        {content.map((paragraph, i) => (
          <p key={i} className="text-text leading-relaxed mb-4">
            {paragraph}
          </p>
        ))}
      </article>

      {toolHref && (
        <section className="mt-12 mb-6 text-center">
          <Link
            href={toolHref}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-teal text-white font-semibold text-base sm:text-lg hover:bg-teal-dark transition-colors shadow-md"
          >
            {ctaLabel}
          </Link>
        </section>
      )}

      <div className="text-center mb-12">
        <Link
          href={blogHref}
          className="text-sm text-text-secondary hover:text-text transition-colors"
        >
          ← {tBlog("backToBlog")}
        </Link>
      </div>

      <RelatedTools tools={post.toolKey} locale={locale} />
      <ShareBar />
    </div>
  );
}
