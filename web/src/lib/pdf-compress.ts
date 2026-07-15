import { PDFDocument } from "pdf-lib";

export async function compressPdfLight(file: File): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  // 清理元数据
  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setProducer("Neetpix");
  doc.setCreator("Neetpix");
  const bytes = await doc.save({ useObjectStreams: true });
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return new Blob([out], { type: "application/pdf" });
}

export async function compressPdfStrong(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  // 动态加载 pdfjs-dist（避免 SSR 问题）
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;

  // 创建新 PDF
  const newDoc = await PDFDocument.create();

  // 渲染参数
  const targetDpi = 150;
  const scale = targetDpi / 72; // PDF 默认 72 DPI
  const jpegQuality = 0.6;

  try {
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });

      // 创建 canvas 渲染
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      // 渲染页面到 canvas
      await page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      }).promise;

      // canvas → JPEG blob
      const jpegBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), "image/jpeg", jpegQuality);
      });
      const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());

      // 嵌入 JPEG 到新 PDF
      const img = await newDoc.embedJpg(jpegBytes);

      // 获取原始页面尺寸（pt = 1/72 inch）
      const originalViewport = page.getViewport({ scale: 1 });
      const pdfPage = newDoc.addPage([
        originalViewport.width,
        originalViewport.height,
      ]);

      // 绘制图片填满整页
      pdfPage.drawImage(img, {
        x: 0,
        y: 0,
        width: originalViewport.width,
        height: originalViewport.height,
      });

      // 释放当前页资源
      page.cleanup();

      // 进度回调
      onProgress?.(i, totalPages);
    }
  } finally {
    // 释放 pdfjs 资源
    pdf.cleanup();
  }

  const bytes = await newDoc.save();
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return new Blob([out], { type: "application/pdf" });
}

export async function detectImageOnlyPdf(file: File): Promise<boolean> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // 检查前 3 页（或全部页数，取较小值）是否有文本内容
  const checkPages = Math.min(3, pdf.numPages);
  try {
    for (let i = 1; i <= checkPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // 统计有效文本项（TextItem 含 str 字段，TextMarkedContent 无）
      const textItems = content.items.filter((item) => {
        const str = (item as { str?: string }).str;
        return typeof str === "string" && str.trim().length > 0;
      });
      page.cleanup();
      if (textItems.length > 0) {
        // 发现文本层，不是纯图片型 PDF
        return false;
      }
    }
  } finally {
    pdf.cleanup();
  }
  // 前 3 页都无文本，判定为图片型
  return true;
}
