import { PDFDocument, degrees } from "pdf-lib";

// 解析页码范围字符串，如 "1-3,5,7-9" → [[0,1,2],[4],[6,7,8]]（0-based）
function parseRanges(input: string, total: number): number[][] {
  const parts = input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) throw new Error("empty");

  const result: number[][] = [];
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10);
      if (n < 1 || n > total) throw new Error("out-of-range");
      result.push([n - 1]);
    } else if (/^(\d+)-(\d+)$/.test(part)) {
      const [, aStr, bStr] = part.match(/^(\d+)-(\d+)$/)!;
      const a = parseInt(aStr, 10);
      const b = parseInt(bStr, 10);
      if (a < 1 || b < 1 || a > total || b > total || a > b)
        throw new Error("out-of-range");
      const indices: number[] = [];
      for (let i = a; i <= b; i++) indices.push(i - 1);
      result.push(indices);
    } else {
      throw new Error("invalid");
    }
  }
  return result;
}

/**
 * 旋转 PDF 页面
 * @param file 输入 PDF 文件
 * @param angle 旋转角度（90 / 180 / 270，顺时针）
 * @param targetPages "all" 旋转全部页，或 "1,3,5-7" 格式指定页码
 * @returns 旋转后的 PDF Blob
 * @throws {Error("invalid-pages")} 页码格式无效
 * @throws {Error("out-of-range")} 页码超出范围
 */
export async function rotatePdf(
  file: File,
  angle: 90 | 180 | 270,
  targetPages: "all" | string
): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const pageCount = doc.getPageCount();

  // 确定需要旋转的页面索引集合
  let targetIndices: Set<number>;
  if (targetPages === "all") {
    targetIndices = new Set(Array.from({ length: pageCount }, (_, i) => i));
  } else {
    try {
      const groups = parseRanges(targetPages, pageCount);
      targetIndices = new Set(groups.flat());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "out-of-range") throw new Error("out-of-range");
      // empty / invalid 统一归为页码格式无效
      throw new Error("invalid-pages");
    }
  }

  // 遍历页面，对匹配的页面设置旋转角度
  // 注意：pdf-lib 的 setRotation 为设置绝对角度
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    if (targetIndices.has(i)) {
      pages[i].setRotation(degrees(angle));
    }
  }

  const bytes = await doc.save();
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return new Blob([out], { type: "application/pdf" });
}
