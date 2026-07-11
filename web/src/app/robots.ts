import type { MetadataRoute } from "next";

// robots.txt 配置
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://neetpix.com/sitemap.xml",
  };
}
