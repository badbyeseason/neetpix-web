// NeetPix PDF Crop Engine
// 使用 pdf-lib 按百分比边距裁剪 PDF 每页
import { PDFDocument } from "pdf-lib";

export interface CropMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * 校验裁剪边距合法性
 * - 每边必须在 0-100 范围内
 * - left + right < 100（确保裁剪后宽度 > 0）
 * - top + bottom < 100（确保裁剪后高度 > 0）
 */
function validateMargins(margins: CropMargins): void {
  const { top, right, bottom, left } = margins;
  const isInRange = (v: number) => v >= 0 && v <= 100;
  if (
    !isInRange(top) ||
    !isInRange(right) ||
    !isInRange(bottom) ||
    !isInRange(left)
  ) {
    throw new Error("invalid-margins");
  }
  if (left + right >= 100) {
    throw new Error("invalid-margins");
  }
  if (top + bottom >= 100) {
    throw new Error("invalid-margins");
  }
}

/**
 * 裁剪 PDF（按百分比边距）
 * @param file 输入 PDF 文件
 * @param margins 四边裁剪百分比（0-100）
 * @returns 裁剪后的 PDF Blob
 * @throws {Error} 文件解析失败时抛出原始错误（调用方可显示 errorParse）
 * @throws {Error("invalid-margins")} 裁剪量不合法时抛出（调用方可显示 errorMargins）
 */
export async function cropPdf(file: File, margins: CropMargins): Promise<Blob> {
  // 先校验边距，避免无谓的文件解析
  validateMargins(margins);

  const buf = await file.arrayBuffer();
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });

  const pages = doc.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    // PDF 坐标系原点在左下角，y 轴向上
    const newX = width * (margins.left / 100);
    const newY = height * (margins.bottom / 100);
    const newWidth = width * (1 - (margins.left + margins.right) / 100);
    const newHeight = height * (1 - (margins.top + margins.bottom) / 100);
    page.setCropBox(newX, newY, newWidth, newHeight);
  }

  const bytes = await doc.save();
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return new Blob([out], { type: "application/pdf" });
}
