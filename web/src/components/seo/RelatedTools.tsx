"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

type Props = {
  tools: string[]; // 工具 key 数组，如 ["wordToPdf", "pdfMerge"]
  locale: string;
};

// 工具 key → 路由 slug 映射
const TOOL_ROUTES: Record<string, string> = {
  pdfToWord: "pdf-to-word",
  wordToPdf: "word-to-pdf",
  pdfMerge: "pdf-merge",
  pdfSplit: "pdf-split",
  pdfCompress: "pdf-compress",
  pdfWatermark: "pdf-watermark",
  pdfPageNumbers: "pdf-page-numbers",
  imageToPdf: "image-to-pdf",
  imageCompress: "image-compress",
  imageWatermark: "image-watermark",
  removeBackground: "remove-background",
  screenshotTranslate: "screenshot-translate",
};

// 工具 key → 图标 emoji/渐变（参考首页卡片的图标配置）
const TOOL_ICONS: Record<string, { emoji: string; gradient: string }> = {
  pdfToWord: { emoji: "📄", gradient: "from-teal/10 to-bg-article" },
  wordToPdf: { emoji: "📝", gradient: "from-coral/10 to-bg-article" },
  pdfMerge: { emoji: "📎", gradient: "from-teal/10 to-bg-article" },
  pdfSplit: { emoji: "✂️", gradient: "from-coral/10 to-bg-article" },
  pdfCompress: { emoji: "🗜️", gradient: "from-teal/10 to-bg-article" },
  pdfWatermark: { emoji: "💧", gradient: "from-coral/10 to-bg-article" },
  pdfPageNumbers: { emoji: "🔢", gradient: "from-teal/10 to-bg-article" },
  imageToPdf: { emoji: "🖼️", gradient: "from-coral/10 to-bg-article" },
  imageCompress: { emoji: "📉", gradient: "from-teal/10 to-bg-article" },
  imageWatermark: { emoji: "🎨", gradient: "from-coral/10 to-bg-article" },
  removeBackground: { emoji: "✨", gradient: "from-teal/10 to-bg-article" },
  screenshotTranslate: { emoji: "📸", gradient: "from-coral/10 to-bg-article" },
};

export default function RelatedTools({ tools, locale }: Props) {
  const t = useTranslations("relatedTools");
  const tTools = useTranslations("tools");

  return (
    <section className="mt-16 border-t border-border pt-12">
      <h2 className="text-2xl font-bold text-text mb-6">{t("title")}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tools.map((key) => {
          const slug = TOOL_ROUTES[key];
          if (!slug) return null;
          const icon = TOOL_ICONS[key];
          const href =
            locale === "en" ? `/tools/${slug}` : `/zh/tools/${slug}`;
          return (
            <Link
              key={key}
              href={href}
              className={
                "group relative rounded-2xl p-6 bg-gradient-to-br " +
                (icon?.gradient ?? "from-teal/10 to-bg-article") +
                " border border-border hover:border-teal-light transition-all hover:shadow-md"
              }
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text">
                  {tTools(`${key}.name`)}
                </h3>
                {icon && (
                  <span className="text-2xl" aria-hidden="true">
                    {icon.emoji}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-text-secondary leading-relaxed">
                {tTools(`${key}.desc`)}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
