// Neetpix Image Blur Engine
// 基于 Canvas filter API 的图片区域模糊，100% 浏览器本地处理

export type BlurIntensity = "light" | "medium" | "heavy";

export interface BlurRegion {
  x: number; // 区域左上角 x（相对于原图像素）
  y: number; // 区域左上角 y
  width: number; // 区域宽度
  height: number; // 区域高度
}

// 模糊强度 → 模糊半径（px）
const BLUR_RADIUS: Record<BlurIntensity, number> = {
  light: 8,
  medium: 15,
  heavy: 25,
};

// 输出 MIME 类型：PNG 保持 PNG，其他用 JPEG
function getMimeType(file: File): string {
  return file.type === "image/png" ? "image/png" : "image/jpeg";
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
  quality = 0.95
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

// 对图片指定区域应用高斯模糊
// - 使用 Canvas filter API（ctx.filter = "blur(Npx)"）
// - 从 Canvas 自身提取区域并模糊后画回原位置
// - 输出格式：PNG 保持 PNG，其他用 JPEG
export async function blurRegion(
  file: File,
  regions: BlurRegion[],
  intensity: BlurIntensity
): Promise<Blob> {
  const bitmap = await loadImageBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const mimeType = getMimeType(file);
  // JPEG 不支持透明通道，先填白底
  if (mimeType === "image/jpeg") {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
  }
  // 先绘制原图
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const radius = BLUR_RADIUS[intensity];

  // 对每个区域应用模糊
  for (const region of regions) {
    // 将区域限制在原图范围内
    const rx = Math.max(0, Math.min(Math.floor(region.x), width - 1));
    const ry = Math.max(0, Math.min(Math.floor(region.y), height - 1));
    const rw = Math.max(1, Math.min(Math.floor(region.width), width - rx));
    const rh = Math.max(1, Math.min(Math.floor(region.height), height - ry));

    // 使用 filter 从 Canvas 自身提取区域并模糊后画回
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(canvas, rx, ry, rw, rh, rx, ry, rw, rh);
    ctx.filter = "none";
  }

  return canvasToBlob(canvas, mimeType, 0.95);
}
