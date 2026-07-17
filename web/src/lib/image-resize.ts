// Neetpix Image Resize & Crop Engine
// 基于 Canvas 的图片缩放与裁剪，100% 浏览器本地处理
import JSZip from "jszip";

export type OutputFormat = "jpeg" | "png" | "webp";

export interface ResizeOptions {
  mode: "percentage" | "pixels";
  percentage?: number; // 1-200
  width?: number; // pixels 模式
  height?: number; // pixels 模式
  maintainRatio: boolean;
  outputFormat?: OutputFormat; // 默认保持原格式
}

export interface CropOptions {
  targetWidth: number;
  targetHeight: number;
  // 裁剪框位置（相对于原图）
  sx: number; // source x
  sy: number; // source y
  sWidth: number; // source crop width
  sHeight: number; // source crop height
}

// 输出格式 → MIME 类型
function getMimeType(format: OutputFormat): string {
  return format === "jpeg"
    ? "image/jpeg"
    : format === "png"
      ? "image/png"
      : "image/webp";
}

// 输出格式 → 文件扩展名
function getExt(format: OutputFormat): string {
  return format === "jpeg" ? "jpg" : format === "png" ? "png" : "webp";
}

// 决定输出格式：指定则用指定；否则 PNG 保持 PNG，其他用 JPEG
function resolveOutputFormat(
  file: File,
  outputFormat?: OutputFormat
): OutputFormat {
  if (outputFormat) return outputFormat;
  if (file.type === "image/png") return "png";
  return "jpeg";
}

// 取文件名（不含扩展名）
function getBaseName(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

// 加载图片为 ImageBitmap
async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new Error("Failed to parse image");
  }
}

// Canvas → Blob
function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      },
      mimeType,
      quality
    );
  });
}

// 读取图片原始尺寸
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  const bitmap = await loadImageBitmap(file);
  const dims = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dims;
}

// 缩放单张图片
// - 百分比模式：按 percentage 等比缩放
// - 像素模式：maintainRatio 为 true 时以 width（或 height）为基准等比缩放
// - 输出格式：outputFormat 指定则用之；否则 PNG 保持 PNG，其他用 JPEG
export async function resizeImage(
  file: File,
  options: ResizeOptions
): Promise<Blob> {
  const bitmap = await loadImageBitmap(file);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;

  let newWidth: number;
  let newHeight: number;

  if (options.mode === "percentage") {
    const pct = options.percentage ?? 100;
    newWidth = Math.max(1, Math.round((originalWidth * pct) / 100));
    newHeight = Math.max(1, Math.round((originalHeight * pct) / 100));
  } else {
    const w = options.width ?? 0;
    const h = options.height ?? 0;
    if (options.maintainRatio) {
      // 以 width 为基准（若未提供则用 height）
      if (w > 0) {
        newWidth = w;
        newHeight = Math.max(1, Math.round((w * originalHeight) / originalWidth));
      } else if (h > 0) {
        newHeight = h;
        newWidth = Math.max(1, Math.round((h * originalWidth) / originalHeight));
      } else {
        newWidth = originalWidth;
        newHeight = originalHeight;
      }
    } else {
      newWidth = w > 0 ? w : originalWidth;
      newHeight = h > 0 ? h : originalHeight;
    }
  }

  newWidth = Math.max(1, Math.floor(newWidth));
  newHeight = Math.max(1, Math.floor(newHeight));

  const canvas = document.createElement("canvas");
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext("2d")!;
  const format = resolveOutputFormat(file, options.outputFormat);
  // JPEG/WebP 不支持透明通道，先填白底
  if (format === "jpeg" || format === "webp") {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, newWidth, newHeight);
  }
  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
  bitmap.close();

  return canvasToBlob(canvas, getMimeType(format), 0.92);
}

// 裁剪单张图片
// - 从原图 (sx, sy, sWidth, sHeight) 区域裁剪，缩放输出到 targetWidth × targetHeight
// - 输出格式：PNG 保持 PNG，其他用 JPEG
export async function cropImage(
  file: File,
  options: CropOptions
): Promise<Blob> {
  const bitmap = await loadImageBitmap(file);

  // 将裁剪框限制在原图范围内
  const sx = Math.max(0, Math.min(options.sx, bitmap.width));
  const sy = Math.max(0, Math.min(options.sy, bitmap.height));
  const sWidth = Math.max(
    1,
    Math.min(Math.floor(options.sWidth), bitmap.width - Math.floor(sx))
  );
  const sHeight = Math.max(
    1,
    Math.min(Math.floor(options.sHeight), bitmap.height - Math.floor(sy))
  );

  const targetWidth = Math.max(1, Math.floor(options.targetWidth));
  const targetHeight = Math.max(1, Math.floor(options.targetHeight));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d")!;
  const format: OutputFormat = file.type === "image/png" ? "png" : "jpeg";
  if (format === "jpeg") {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }
  ctx.drawImage(
    bitmap,
    Math.floor(sx),
    Math.floor(sy),
    sWidth,
    sHeight,
    0,
    0,
    targetWidth,
    targetHeight
  );
  bitmap.close();

  return canvasToBlob(canvas, getMimeType(format), 0.92);
}

// 批量缩放
// - 输出文件名：originalName-resized.ext
export async function resizeImages(
  files: File[],
  options: ResizeOptions
): Promise<{ name: string; blob: Blob }[]> {
  return Promise.all(
    files.map(async (file) => {
      const blob = await resizeImage(file, options);
      const format = resolveOutputFormat(file, options.outputFormat);
      const name = `${getBaseName(file.name)}-resized.${getExt(format)}`;
      return { name, blob };
    })
  );
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
  a.download = "neetpix-resized.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
