import type { MetadataRoute } from "next";
import { LANDING_PAGES } from "@/lib/landing-pages";

const HOT_TOOLS = new Set([
  "/tools/pdf-to-word",
  "/tools/word-to-pdf",
  "/tools/remove-background",
]);

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
      let lastModified = new Date();

      if (route === "") {
        changeFrequency = "daily";
        priority = 1;
      } else if (route === "/privacy" || route === "/about") {
        changeFrequency = "yearly";
        priority = 0.3;
        lastModified = new Date("2026-07-21");
      } else if (route.startsWith("/landing/")) {
        changeFrequency = "monthly";
        priority = 0.8;
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
