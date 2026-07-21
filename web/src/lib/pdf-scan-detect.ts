// 扫描件 PDF 检测：通过 pdfjs-dist 提取前几页文本字符数判断
// 若平均字符数/页 < 阈值，则视为扫描件（图片型 PDF）

// 检测使用的前 N 页（性能与准确性平衡）
const SCAN_DETECT_PAGES = 3;
// 平均字符数/页阈值，低于此值判定为扫描件
// 文本型 PDF 页面通常有数百字符，扫描件几乎为 0
const SCAN_CHAR_THRESHOLD = 50;

/**
 * 检测 PDF 是否为扫描件（图片型 PDF）
 *
 * 实现策略：用 pdfjs-dist 加载 PDF，提取前 3 页文本，
 * 计算平均字符数/页。若 < 50 字符/页，判定为扫描件。
 *
 * 失败时返回 false（不阻断流程，让用户继续尝试）。
 *
 * @param file 用户上传的 PDF 文件
 * @returns true 表示是扫描件
 */
export async function isScannedPdf(file: File): Promise<boolean> {
  try {
    // 动态加载 pdfjs-dist（避免 SSR 问题，与 pdf-to-word.ts 保持一致）
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    // 只检测前 3 页（或总页数，取较小者）
    const pagesToCheck = Math.min(SCAN_DETECT_PAGES, totalPages);
    if (pagesToCheck <= 0) return false;

    let totalChars = 0;
    for (let i = 1; i <= pagesToCheck; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // content.items 可能包含 TextItem 与 TextMarkedContent，仅取含 str 的文字项
      // 用 "str" in item 让 TS 自动收窄到 TextItem 类型
      for (const item of content.items) {
        if ("str" in item) {
          totalChars += item.str.length;
        }
      }
    }

    const avgCharsPerPage = totalChars / pagesToCheck;
    return avgCharsPerPage < SCAN_CHAR_THRESHOLD;
  } catch (err) {
    // 检测失败不阻断流程，让用户继续尝试转换
    console.warn("Scanned PDF detection failed:", err);
    return false;
  }
}
