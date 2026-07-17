// Neetpix Image Convert Engine
// 基于 Canvas + createImageBitmap 进行图片格式转换（100% 浏览器本地处理）
import JSZip from "jszip";

export type TargetFormat = "jpeg" | "png" | "webp" | "avif";

const MIME_MAP: Record<TargetFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

const EXT_MAP: Record<TargetFormat, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  avif: "avif",
};

// 检测浏览器是否支持 AVIF 编码（通过 Canvas toDataURL 测试）
// SSR 安全：服务端无 document 时直接返回 false
export function isAvifSupported(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    return c.toDataURL("image/avif").startsWith("data:image/avif");
  } catch {
    return false;
  }
}

// 判断文件是否为 HEIC/HEIF（兼容 type 与扩展名两种判定）
export function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

// 加载图片为 ImageBitmap；HEIC/HEIF 需先用 heic2any 解码为 JPEG
async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  if (isHeicFile(file)) {
    // 动态 import，避免首屏加载 WASM
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({ blob: file, toType: "image/jpeg" });
    const jpegBlob = Array.isArray(result) ? result[0] : result;
    return await createImageBitmap(jpegBlob);
  }
  return await createImageBitmap(file);
}

// 通过 Canvas 将 ImageBitmap 编码为目标格式
function encodeBitmap(
  bitmap: ImageBitmap,
  targetFormat: TargetFormat
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d")!;
    // JPG 不支持透明通道，需先填充白底
    if (targetFormat === "jpeg") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(bitmap, 0, 0);
    const mimeType = MIME_MAP[targetFormat];
    canvas.toBlob(
      (outBlob) => {
        if (outBlob) {
          resolve(outBlob);
        } else {
          reject(new Error("encode"));
        }
      },
      mimeType,
      // quality 仅对 jpeg/webp/avif 有效，PNG 无损忽略
      targetFormat === "png" ? undefined : 0.92
    );
  });
}

// 转换单张图片为目标格式
// - AVIF 输出会先检测浏览器支持，不支持抛出 Error("avif-unsupported")
// - 解析失败抛出 Error("parse")
export async function convertImage(
  file: File,
  targetFormat: TargetFormat
): Promise<Blob> {
  if (targetFormat === "avif" && !isAvifSupported()) {
    throw new Error("avif-unsupported");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await loadImageBitmap(file);
  } catch {
    throw new Error("parse");
  }

  try {
    return await encodeBitmap(bitmap, targetFormat);
  } catch {
    throw new Error("parse");
  } finally {
    bitmap.close();
  }
}

// 根据目标格式生成输出文件名（替换原扩展名）
export function getOutputName(
  originalName: string,
  targetFormat: TargetFormat
): string {
  const baseName = originalName.replace(/\.[^.]+$/, "");
  return `${baseName}.${EXT_MAP[targetFormat]}`;
}

// 批量转换
// - AVIF 输出先统一检测一次，不支持时快速抛出 Error("avif-unsupported")
// - 任一文件解析失败抛出 Error("parse")
export async function convertImages(
  files: File[],
  targetFormat: TargetFormat
): Promise<{ name: string; blob: Blob }[]> {
  if (targetFormat === "avif" && !isAvifSupported()) {
    throw new Error("avif-unsupported");
  }
  return await Promise.all(
    files.map(async (file) => {
      const blob = await convertImage(file, targetFormat);
      return { name: getOutputName(file.name, targetFormat), blob };
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
  a.download = "neetpix-converted.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
