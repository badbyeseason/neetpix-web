// 构建多语言 SEO metadata 的 alternates 字段（canonical + hreflang）
// route 形如 "/tools/pdf-merge" 或 ""（首页）
export function buildI18nMetadata(route: string, locale: string) {
  const baseUrl = "https://neetpix.com";
  const enUrl = `${baseUrl}${route}`;
  const zhUrl = `${baseUrl}/zh${route}`;
  const canonical = locale === "en" ? enUrl : zhUrl;
  return {
    canonical,
    languages: {
      en: enUrl,
      zh: zhUrl,
      "x-default": enUrl,
    },
  };
}
