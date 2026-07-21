// 程序化 SEO landing pages 元数据
// 每个 slug 对应一个高搜索量长尾关键词 landing page
// i18n key 使用 camelCase（如 compressPdfTo100kb），与 messages/landing.{key} 对应

export type LandingPage = {
  slug: string; // URL slug，如 "compress-pdf-to-100kb"
  toolKey: string; // 关联工具 key（如 "pdfCompress"），用于 RelatedTools 与 CTA
  category: "pdf" | "image" | "generator";
  i18nKey: string; // messages/landing 下的 camelCase key，如 "compressPdfTo100kb"
};

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: "compress-pdf-to-100kb",
    toolKey: "pdfCompress",
    category: "pdf",
    i18nKey: "compressPdfTo100kb",
  },
  {
    slug: "pdf-merge-and-compress",
    toolKey: "pdfMerge",
    category: "pdf",
    i18nKey: "pdfMergeAndCompress",
  },
  {
    slug: "image-to-pdf-converter",
    toolKey: "imageToPdf",
    category: "image",
    i18nKey: "imageToPdfConverter",
  },
  {
    slug: "remove-background-free",
    toolKey: "removeBackground",
    category: "image",
    i18nKey: "removeBackgroundFree",
  },
  {
    slug: "qr-code-generator-free",
    toolKey: "qrCode",
    category: "generator",
    i18nKey: "qrCodeGeneratorFree",
  },
  {
    slug: "pdf-compress-online",
    toolKey: "pdfCompress",
    category: "pdf",
    i18nKey: "pdfCompressOnline",
  },
  {
    slug: "word-to-pdf-free",
    toolKey: "wordToPdf",
    category: "pdf",
    i18nKey: "wordToPdfFree",
  },
  {
    slug: "image-compress-to-50kb",
    toolKey: "imageCompress",
    category: "image",
    i18nKey: "imageCompressTo50kb",
  },
];

export const LANDING_PAGE_MAP: Record<string, LandingPage> =
  LANDING_PAGES.reduce(
    (acc, page) => {
      acc[page.slug] = page;
      return acc;
    },
    {} as Record<string, LandingPage>,
  );
