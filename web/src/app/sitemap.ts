import type { MetadataRoute } from "next";

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
  ];

  const entries: MetadataRoute.Sitemap = [];
  for (const route of routes) {
    for (const locale of locales) {
      // localePrefix: "as-needed" 意味着 defaultLocale "en" 不带前缀
      const prefix = locale === "en" ? "" : `/${locale}`;
      entries.push({
        url: `${baseUrl}${prefix}${route}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: route === "" ? 1 : 0.8,
      });
    }
  }
  return entries;
}
