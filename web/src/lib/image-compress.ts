// Neetpix Image Compress Engine
// 基于 browser-image-compression 进行压缩，可选 Canvas 转换输出格式
import imageCompression from "browser-image-compression";
import JSZip from "jszip";

export type OutputFormat = "original" | "image/jpeg" | "image/png" | "image/webp";

export interface CompressOptions {
  quality: number; // 1-100
  scale: number; // 1-100（百分比）
  format: OutputFormat;
}

export interface CompressResult {
  blob: Blob;
  url: string;
  originalSize: number;
  compressedSize: number;
}

// 读取图片原始尺寸
function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const { width, height } = img;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

// 通过 Canvas 将 blob 转换为指定格式
function convertFormat(
  blob: Blob,
  format: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      // JPG/WebP 不支持透明通道，需先填充白底
      if (format === "image/jpeg" || format === "image/webp") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (outBlob) => {
          if (outBlob) {
            resolve(outBlob);
          } else {
            reject(new Error("Failed to convert format"));
          }
        },
        format,
        quality / 100
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

// 压缩单张图片
// - quality 转为 0-1 传给 initialQuality
// - scale 转为 maxWidthOrMaxHeight（按比例缩放最长边）
// - 如果 format 不是 "original"，压缩后用 Canvas 转换格式
// - 返回 { blob, url, originalSize, compressedSize }，url 由调用方负责 revoke
export async function compressImage(
  file: File,
  options: CompressOptions
): Promise<CompressResult> {
  const { quality, scale, format } = options;
  const originalSize = file.size;

  // 计算缩放后的最大边长（按原图最长边等比缩放）
  let maxWidthOrHeight: number | undefined;
  if (scale < 100) {
    const { width, height } = await getImageDimensions(file);
    maxWidthOrHeight = Math.floor((Math.max(width, height) * scale) / 100);
  }

  // 用 browser-image-compression 压缩
  let compressedBlob: Blob = await imageCompression(file, {
    maxSizeMB: 20,
    maxWidthOrHeight,
    initialQuality: quality / 100,
    useWebWorker: true,
  });

  // 如果指定了输出格式，用 Canvas 转换
  if (format !== "original") {
    compressedBlob = await convertFormat(compressedBlob, format, quality);
  }

  const url = URL.createObjectURL(compressedBlob);
  return {
    blob: compressedBlob,
    url,
    originalSize,
    compressedSize: compressedBlob.size,
  };
}

// 格式化字节数为 B/KB/MB
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// 用 JSZip 打包多个 blob 并触发下载
export async function downloadZip(
  results: { name: string; blob: Blob }[]
): Promise<void> {
  const zip = new JSZip();
  for (const item of results) {
    zip.file(item.name, item.blob);
  }
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = "neetpix-compressed.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
