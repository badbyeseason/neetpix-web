import type { MetadataRoute } from "next";
import { LANDING_PAGES } from "@/lib/landing-pages";
import { COMPARE_PAGES } from "@/lib/compare-pages";
import { BLOG_POSTS } from "@/lib/blog-posts";

const HOT_TOOLS = new Set([
  "/tools/pdf-to-word",
  "/tools/word-to-pdf",
  "/tools/remove-background",
]);

// 路由首次发布日期：用于 sitemap lastModified，避免全站共享 build 时间戳
const TOOL_FIRST_PUBLISHED = new Date("2026-07-15");
const LANDING_LAST_UPDATED = new Date("2026-07-21");
const STATIC_LAST_UPDATED = new Date("2026-07-21");
const COMPARE_LAST_UPDATED = new Date("2026-07-21");
const BLOG_LAST_UPDATED = new Date("2026-07-21");

// 生成中英文所有路由的 sitemap
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://neetpix.com";
  const locales = ["en", "zh"];
  const routes = [
    "",
    "/tools/remove-background",
    "/tools/image-to-pdf",
    "/tools/pdf-to-word",
    "/tools/word-to-pdf",
    "/tools/screenshot-translate",
    "/tools/image-compress",
    "/tools/image-watermark",
    "/tools/image-convert",
    "/tools/image-exif",
    "/tools/image-resize",
    "/tools/image-id-photo",
    "/tools/image-ocr",
    "/tools/image-blur",
    "/tools/pdf-merge",
    "/tools/pdf-split",
    "/tools/pdf-compress",
    "/tools/pdf-watermark",
    "/tools/pdf-page-numbers",
    "/tools/pdf-encrypt",
    "/tools/pdf-decrypt",
    "/tools/pdf-crop",
    "/tools/pdf-rotate",
    "/tools/image-grid-split",
    "/tools/qr-code",
    "/tools/qr-decode",
    "/tools/chart-generator",
    "/tools/file-transfer",
    "/privacy",
    "/about",
    // 程序化 SEO landing pages（8 个 slug × 2 locale = 16 个 URL）
    ...LANDING_PAGES.map((p) => `/landing/${p.slug}`),
    // 程序化 SEO 对比页（5 个 slug × 2 locale = 10 个 URL）
    ...COMPARE_PAGES.map((p) => `/compare/${p.slug}`),
    // 博客列表 + 4 篇文章（5 个路由 × 2 locale = 10 个 URL）
    "/blog",
    ...BLOG_POSTS.map((p) => `/blog/${p.slug}`),
  ];

  const entries: MetadataRoute.Sitemap = [];
  for (const route of routes) {
    for (const locale of locales) {
      // localePrefix: "as_needed" 意味着 defaultLocale "en" 不带前缀
      const prefix = locale === "en" ? "" : `/${locale}`;
      const url = `${baseUrl}${prefix}${route}`;

      // 分级配置
      let changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "monthly";
      let priority = 0.7;
      let lastModified = TOOL_FIRST_PUBLISHED;

      if (route === "") {
        // 首页动态，爬虫每次都看到最新
        changeFrequency = "daily";
        priority = 1;
        lastModified = new Date();
      } else if (route === "/privacy" || route === "/about") {
        changeFrequency = "yearly";
        priority = 0.3;
        lastModified = STATIC_LAST_UPDATED;
      } else if (route.startsWith("/landing/")) {
        changeFrequency = "monthly";
        priority = 0.8;
        lastModified = LANDING_LAST_UPDATED;
      } else if (route.startsWith("/compare/")) {
        changeFrequency = "monthly";
        priority = 0.8;
        lastModified = COMPARE_LAST_UPDATED;
      } else if (route === "/blog") {
        // 博客列表页：内容随新增文章变动，优先级较高
        changeFrequency = "weekly";
        priority = 0.8;
        lastModified = BLOG_LAST_UPDATED;
      } else if (route.startsWith("/blog/")) {
        // 博客文章：长尾 SEO 内容，发布后较少改动
        changeFrequency = "monthly";
        priority = 0.7;
        lastModified = BLOG_LAST_UPDATED;
      } else if (HOT_TOOLS.has(route)) {
        changeFrequency = "monthly";
        priority = 0.9;
      } else if (route.startsWith("/tools/")) {
        changeFrequency = "monthly";
        priority = 0.7;
      }

      entries.push({ url, lastModified, changeFrequency, priority });
    }
  }
  return entries;
}
