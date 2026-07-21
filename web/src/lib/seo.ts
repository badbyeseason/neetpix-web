import { getTranslations } from "next-intl/server";
import { LANDING_PAGE_MAP } from "./landing-pages";

// 构建多语言 SEO metadata 的 alternates 字段（canonical + hreflang）
// 同时返回 locale / alternateLocales，供调用方注入 openGraph.locale / openGraph.alternateLocales
// route 形如 "/tools/pdf-merge" 或 ""（首页）
export function buildI18nMetadata(route: string, locale: string) {
  const baseUrl = "https://neetpix.com";
  const enUrl = `${baseUrl}${route}`;
  const zhUrl = `${baseUrl}/zh${route}`;
  const canonical = locale === "en" ? enUrl : zhUrl;
  // OG locale 用 BCP-47：en → en_US，zh → zh_CN
  const ogLocale = locale === "zh" ? "zh_CN" : "en_US";
  // alternateLocales：当前 locale 之外的其他语言变体
  const alternateLocales =
    locale === "zh"
      ? [{ locale: "en_US", url: enUrl, href: enUrl }]
      : [{ locale: "zh_CN", url: zhUrl, href: zhUrl }];
  return {
    canonical,
    languages: {
      en: enUrl,
      zh: zhUrl,
      "x-default": enUrl,
    },
    locale: ogLocale,
    alternateLocales,
  };
}

// Breadcrumb item 类型（与 components/seo/Breadcrumb.tsx 保持兼容）
export type BreadcrumbItem = {
  name: string;
  href?: string;
};

// 工具 key → 分类 i18n key（位于 nav namespace）
// 与首页 toolGroups / Header toolCategories 中的分类保持一致
const TOOL_CATEGORY_NAV_KEY: Record<string, string> = {
  // PDF
  pdfToWord: "categoryPdf",
  wordToPdf: "categoryPdf",
  imageToPdf: "categoryPdf",
  pdfMerge: "categoryPdf",
  pdfSplit: "categoryPdf",
  pdfCompress: "categoryPdf",
  pdfWatermark: "categoryPdf",
  pdfPageNumbers: "categoryPdf",
  pdfEncrypt: "categoryPdf",
  pdfDecrypt: "categoryPdf",
  pdfCrop: "categoryPdf",
  pdfRotate: "categoryPdf",
  // Image
  removeBackground: "categoryImage",
  imageCompress: "categoryImage",
  imageWatermark: "categoryImage",
  imageConvert: "categoryImage",
  imageExif: "categoryImage",
  imageResize: "categoryImage",
  imageIdPhoto: "categoryImage",
  imageOcr: "categoryImage",
  imageBlur: "categoryImage",
  imageGridSplit: "categoryImage",
  // Translate
  screenshotTranslate: "categoryTranslate",
  // Generators
  qrCode: "categoryGenerator",
  chartGenerator: "categoryGenerator",
  qrDecode: "categoryGenerator",
  // Network
  fileTransfer: "networkTools",
};

// Landing page category → nav i18n key
const LANDING_CATEGORY_NAV_KEY: Record<string, string> = {
  pdf: "categoryPdf",
  image: "categoryImage",
  generator: "categoryGenerator",
};

// 构建工具页面包屑：Home > {Category} > {Tool Name}
export async function getToolBreadcrumbItems(
  toolKey: string,
  locale: string,
): Promise<BreadcrumbItem[]> {
  const tNav = await getTranslations({ locale, namespace: "nav" });
  const tTools = await getTranslations({ locale, namespace: "tools" });
  const homeHref = locale === "en" ? "/" : "/zh";
  const categoryNavKey = TOOL_CATEGORY_NAV_KEY[toolKey];
  const items: BreadcrumbItem[] = [{ name: tNav("home"), href: homeHref }];
  if (categoryNavKey) {
    items.push({ name: tNav(categoryNavKey) });
  }
  items.push({ name: tTools(`${toolKey}.name`) });
  return items;
}

// 构建 landing page 面包屑：Home > {Category} > {Landing H1}
export async function getLandingBreadcrumbItems(
  slug: string,
  locale: string,
): Promise<BreadcrumbItem[]> {
  const tNav = await getTranslations({ locale, namespace: "nav" });
  const homeHref = locale === "en" ? "/" : "/zh";
  const landing = LANDING_PAGE_MAP[slug];
  if (!landing) {
    return [{ name: tNav("home"), href: homeHref }];
  }
  const tLanding = await getTranslations({
    locale,
    namespace: `landing.${landing.i18nKey}`,
  });
  const categoryNavKey =
    LANDING_CATEGORY_NAV_KEY[landing.category] ?? "categoryPdf";
  return [
    { name: tNav("home"), href: homeHref },
    { name: tNav(categoryNavKey) },
    { name: tLanding("h1") },
  ];
}
