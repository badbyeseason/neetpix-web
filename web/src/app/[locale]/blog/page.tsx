import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Breadcrumb from "@/components/seo/Breadcrumb";
import { buildI18nMetadata } from "@/lib/seo";
import { BLOG_POSTS } from "@/lib/blog-posts";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const title = t("pageTitle");
  const description = t("pageDescription");
  return {
    title: { absolute: title },
    description,
    alternates: buildI18nMetadata("/blog", locale),
    openGraph: {
      title,
      description,
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
    month: "short",
    day: "numeric",
  });
}

export default async function BlogListPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const tNav = await getTranslations({ locale, namespace: "nav" });

  const homeHref = locale === "en" ? "/" : "/zh";
  const breadcrumbItems = [
    { name: tNav("home"), href: homeHref },
    { name: t("pageTitle") },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <Breadcrumb items={breadcrumbItems} />

      <header className="mb-12 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-text mb-4">
          {t("pageTitle")}
        </h1>
        <p className="text-text-secondary leading-relaxed max-w-2xl mx-auto">
          {t("pageDescription")}
        </p>
      </header>

      <ul className="space-y-6">
        {BLOG_POSTS.map((post) => {
          const href =
            locale === "en"
              ? `/blog/${post.slug}`
              : `/zh/blog/${post.slug}`;
          const title = t(`${post.slug}.title`);
          const description = t(`${post.slug}.description`);
          return (
            <li key={post.slug}>
              <Link
                href={href}
                className="group block rounded-2xl border border-border bg-bg-warm p-6 hover:border-teal-light transition-all hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal/10 text-teal font-medium">
                    {t(`categories.${post.category}`)}
                  </span>
                  <span>{t("publishedAt", { date: formatDate(post.datePublished, locale) })}</span>
                  <span aria-hidden="true">·</span>
                  <span>{t("readingTime", { minutes: post.readingTime })}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-text mb-2 group-hover:text-teal transition-colors">
                  {title}
                </h2>
                <p className="text-text-secondary leading-relaxed">
                  {description}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
