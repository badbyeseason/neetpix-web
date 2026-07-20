export type ToolBadge = "new" | "hot";

export type ToolMetadata = {
  key: string;
  href: string;
  nameKey: string;
  descKey: string;
  badge?: ToolBadge;
};

// 完整工具列表（含未上线工具，用于命令面板与收藏映射）
export const TOOL_LIST: ToolMetadata[] = [
  // PDF
  { key: "pdfToWord", href: "/tools/pdf-to-word", nameKey: "tools.pdfToWord.name", descKey: "tools.pdfToWord.desc", badge: "hot" },
  { key: "wordToPdf", href: "/tools/word-to-pdf", nameKey: "tools.wordToPdf.name", descKey: "tools.wordToPdf.desc", badge: "hot" },
  { key: "imageToPdf", href: "/tools/image-to-pdf", nameKey: "tools.imageToPdf.name", descKey: "tools.imageToPdf.desc" },
  { key: "pdfMerge", href: "/tools/pdf-merge", nameKey: "tools.pdfMerge.name", descKey: "tools.pdfMerge.desc" },
  { key: "pdfSplit", href: "/tools/pdf-split", nameKey: "tools.pdfSplit.name", descKey: "tools.pdfSplit.desc" },
  { key: "pdfCompress", href: "/tools/pdf-compress", nameKey: "tools.pdfCompress.name", descKey: "tools.pdfCompress.desc" },
  { key: "pdfWatermark", href: "/tools/pdf-watermark", nameKey: "tools.pdfWatermark.name", descKey: "tools.pdfWatermark.desc" },
  { key: "pdfPageNumbers", href: "/tools/pdf-page-numbers", nameKey: "tools.pdfPageNumbers.name", descKey: "tools.pdfPageNumbers.desc" },
  { key: "pdfEncrypt", href: "/tools/pdf-encrypt", nameKey: "tools.pdfEncrypt.name", descKey: "tools.pdfEncrypt.desc" },
  { key: "pdfDecrypt", href: "/tools/pdf-decrypt", nameKey: "tools.pdfDecrypt.name", descKey: "tools.pdfDecrypt.desc" },
  { key: "pdfCrop", href: "/tools/pdf-crop", nameKey: "tools.pdfCrop.name", descKey: "tools.pdfCrop.desc", badge: "new" },
  { key: "pdfRotate", href: "/tools/pdf-rotate", nameKey: "tools.pdfRotate.name", descKey: "tools.pdfRotate.desc", badge: "new" },
  // Image
  { key: "removeBackground", href: "/tools/remove-background", nameKey: "tools.removeBackground.name", descKey: "tools.removeBackground.desc", badge: "hot" },
  { key: "imageCompress", href: "/tools/image-compress", nameKey: "tools.imageCompress.name", descKey: "tools.imageCompress.desc" },
  { key: "imageWatermark", href: "/tools/image-watermark", nameKey: "tools.imageWatermark.name", descKey: "tools.imageWatermark.desc" },
  { key: "imageConvert", href: "/tools/image-convert", nameKey: "tools.imageConvert.name", descKey: "tools.imageConvert.desc", badge: "new" },
  { key: "imageExif", href: "/tools/image-exif", nameKey: "tools.imageExif.name", descKey: "tools.imageExif.desc", badge: "new" },
  { key: "imageResize", href: "/tools/image-resize", nameKey: "tools.imageResize.name", descKey: "tools.imageResize.desc", badge: "new" },
  { key: "imageIdPhoto", href: "/tools/image-id-photo", nameKey: "tools.imageIdPhoto.name", descKey: "tools.imageIdPhoto.desc", badge: "new" },
  { key: "imageOcr", href: "/tools/image-ocr", nameKey: "tools.imageOcr.name", descKey: "tools.imageOcr.desc", badge: "new" },
  { key: "imageBlur", href: "/tools/image-blur", nameKey: "tools.imageBlur.name", descKey: "tools.imageBlur.desc", badge: "new" },
  { key: "imageGridSplit", href: "/tools/image-grid-split", nameKey: "tools.imageGridSplit.name", descKey: "tools.imageGridSplit.desc", badge: "new" },
  // Translate
  { key: "screenshotTranslate", href: "/tools/screenshot-translate", nameKey: "tools.screenshotTranslate.name", descKey: "tools.screenshotTranslate.desc" },
  // Generators
  { key: "qrCode", href: "/tools/qr-code", nameKey: "tools.qrCode.name", descKey: "tools.qrCode.desc", badge: "new" },
  { key: "chartGenerator", href: "/tools/chart-generator", nameKey: "tools.chartGenerator.name", descKey: "tools.chartGenerator.desc", badge: "new" },
];

export const TOOL_MAP: Record<string, ToolMetadata> = TOOL_LIST.reduce(
  (acc, tool) => {
    acc[tool.key] = tool;
    return acc;
  },
  {} as Record<string, ToolMetadata>,
);
