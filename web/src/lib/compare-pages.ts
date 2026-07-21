// 程序化 SEO 对比页元数据
// 每个 slug 对应一个"替代品"长尾搜索对比页（如 Smallpdf vs Neetpix）
// i18n key 使用 camelCase（如 smallpdfVsNeetpix），对应 messages/compare.{key} 下的字段

export type ComparePage = {
  slug: string; // URL slug，如 "smallpdf-vs-neetpix"
  competitor: string; // 竞品名，如 "Smallpdf"
  toolKey: string; // 关联的 Neetpix 工具 URL slug，如 "pdf-merge"，用于 CTA 跳转
  category: "pdf" | "image";
  i18nKey: string; // messages/compare 下的 camelCase key，如 "smallpdfVsNeetpix"
  relatedTools: string[]; // RelatedTools 组件用的 camelCase 工具 key 数组
};

export const COMPARE_PAGES: ComparePage[] = [
  {
    slug: "smallpdf-vs-neetpix",
    competitor: "Smallpdf",
    toolKey: "pdf-merge",
    category: "pdf",
    i18nKey: "smallpdfVsNeetpix",
    relatedTools: ["pdfMerge", "pdfCompress", "pdfSplit", "pdfToWord"],
  },
  {
    slug: "ilovepdf-vs-neetpix",
    competitor: "iLovePDF",
    toolKey: "pdf-compress",
    category: "pdf",
    i18nKey: "ilovepdfVsNeetpix",
    relatedTools: ["pdfCompress", "pdfMerge", "pdfSplit", "pdfToWord"],
  },
  {
    slug: "remove-bg-vs-neetpix",
    competitor: "Remove.bg",
    toolKey: "remove-background",
    category: "image",
    i18nKey: "removeBgVsNeetpix",
    relatedTools: ["removeBackground", "imageCompress", "imageConvert", "imageResize"],
  },
  {
    slug: "tinypng-vs-neetpix",
    competitor: "TinyPNG",
    toolKey: "image-compress",
    category: "image",
    i18nKey: "tinypngVsNeetpix",
    relatedTools: ["imageCompress", "imageConvert", "imageResize", "imageToPdf"],
  },
  {
    slug: "pdf24-vs-neetpix",
    competitor: "PDF24",
    toolKey: "pdf-to-word",
    category: "pdf",
    i18nKey: "pdf24VsNeetpix",
    relatedTools: ["pdfToWord", "wordToPdf", "pdfMerge", "pdfCompress"],
  },
];

export const COMPARE_PAGE_MAP: Record<string, ComparePage> = COMPARE_PAGES.reduce(
  (acc, page) => {
    acc[page.slug] = page;
    return acc;
  },
  {} as Record<string, ComparePage>,
);
