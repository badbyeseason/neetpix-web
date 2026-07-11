// NeetPix Image to PDF Engine
// Uses pdf-lib to compose images into a PDF document
// Supports JPG / PNG / WebP (WebP is converted to PNG via Canvas)
import { PDFDocument } from "pdf-lib";

export type PageSize = "a4" | "letter" | "fit";
export type Orientation = "portrait" | "landscape";

export interface ImageToPdfOptions {
  pageSize: PageSize;
  orientation: Orientation;
}

// 页面尺寸常量（单位 pt，1pt = 1/72 inch）
const PAGE_DIMENSIONS: Record<Exclude<PageSize, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

// 页面边距（pt）
const PAGE_MARGIN = 40;

// 将 File 读取为 Uint8Array
function readFileBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// 将 dataURL 转换为 Uint8Array
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// 将图片文件加载为 HTMLImageElement
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

// 将 WebP 图片转换为 PNG 的 Uint8Array（pdf-lib 不直接支持 WebP）
async function webpToPngBytes(file: File): Promise<Uint8Array> {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrlToBytes(dataUrl);
}

// 根据文件类型获取嵌入 PDF 所需的字节及格式
async function getEmbedBytes(
  file: File
): Promise<{ bytes: Uint8Array; type: "jpg" | "png" }> {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  if (mime === "image/webp" || name.endsWith(".webp")) {
    return { bytes: await webpToPngBytes(file), type: "png" };
  }
  if (
    mime === "image/jpeg" ||
    mime === "image/jpg" ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg")
  ) {
    return { bytes: await readFileBytes(file), type: "jpg" };
  }
  // 默认按 PNG 处理
  return { bytes: await readFileBytes(file), type: "png" };
}

// 计算页面尺寸（应用方向）
function getPageSize(
  pageSize: PageSize,
  imgWidth: number,
  imgHeight: number,
  orientation: Orientation
): [number, number] {
  let width: number;
  let height: number;

  if (pageSize === "fit") {
    // fit: 使用图片原始尺寸（pt）
    width = imgWidth;
    height = imgHeight;
  } else {
    [width, height] = PAGE_DIMENSIONS[pageSize];
  }

  // landscape 交换宽高
  if (orientation === "landscape") {
    return [height, width];
  }
  return [width, height];
}

// 等比缩放并居中图片到页面
function computeImagePlacement(
  imgWidth: number,
  imgHeight: number,
  pageWidth: number,
  pageHeight: number,
  margin: number
): { x: number; y: number; width: number; height: number } {
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;

  const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
  const drawWidth = imgWidth * scale;
  const drawHeight = imgHeight * scale;

  // 居中放置（pdf-lib 坐标原点在左下角）
  const x = (pageWidth - drawWidth) / 2;
  const y = (pageHeight - drawHeight) / 2;

  return { x, y, width: drawWidth, height: drawHeight };
}

export async function imagesToPdf(
  files: File[],
  options: ImageToPdfOptions
): Promise<Blob> {
  const { pageSize, orientation } = options;
  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const { bytes, type } = await getEmbedBytes(file);

    // 根据类型嵌入图片
    const image =
      type === "jpg"
        ? await pdfDoc.embedJpg(bytes)
        : await pdfDoc.embedPng(bytes);

    const imgWidth = image.width;
    const imgHeight = image.height;

    // 计算页面尺寸
    const [pageWidth, pageHeight] = getPageSize(
      pageSize,
      imgWidth,
      imgHeight,
      orientation
    );

    // fit 模式页面已贴合图片，不加边距；其他模式留 40pt 边距
    const margin = pageSize === "fit" ? 0 : PAGE_MARGIN;
    const placement = computeImagePlacement(
      imgWidth,
      imgHeight,
      pageWidth,
      pageHeight,
      margin
    );

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(image, {
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  // 复制到 ArrayBuffer 支持的 Uint8Array 以满足 BlobPart 类型要求
  const out = new Uint8Array(pdfBytes.byteLength);
  out.set(pdfBytes);
  return new Blob([out], { type: "application/pdf" });
}
