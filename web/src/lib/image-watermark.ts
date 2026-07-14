// Neetpix Image Watermark Engine
// 基于 Canvas 2D 在图片上绘制水印，支持居中/平铺/左下/右下四种位置
import JSZip from "jszip";

export type WatermarkPosition =
  | "center"
  | "tiled"
  | "bottom-left"
  | "bottom-right";

export interface WatermarkOptions {
  text: string; // 水印文字
  position: WatermarkPosition; // 位置
  fontSize: number; // 像素
  opacity: number; // 0-100
  angle: number; // 角度，如 -30
  color: string; // 如 "#FFFFFF"
}

export interface WatermarkResult {
  blob: Blob;
  url: string;
}

// 字体栈：确保中文不乱码
const FONT_STACK = `-apple-system, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif`;

// 加载图片文件为 HTMLImageElement
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

// 在画布上绘制水印（按位置与角度）
function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: WatermarkOptions
) {
  const { text, position, fontSize, opacity, angle, color } = options;
  if (!text) return;

  ctx.save();
  ctx.globalAlpha = opacity / 100;
  ctx.fillStyle = color;
  ctx.font = `${fontSize}px ${FONT_STACK}`;

  const rad = (angle * Math.PI) / 180;

  if (position === "tiled") {
    // 平铺：整体旋转画布后，按网格重复绘制水印
    ctx.translate(width / 2, height / 2);
    ctx.rotate(rad);
    const stepX = fontSize * 4;
    const stepY = fontSize * 4;
    // 旋转后需要覆盖的范围（用画布对角线的一半留足余量）
    const diag = Math.sqrt(width * width + height * height) / 2 + stepX;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let rowIdx = 0;
    for (let row = -diag; row <= diag; row += stepY) {
      // 每行交错偏移 fontSize * 2
      const offsetX = rowIdx % 2 === 1 ? stepX / 2 : 0;
      for (let col = -diag; col <= diag; col += stepX) {
        ctx.fillText(text, col + offsetX, row);
      }
      rowIdx++;
    }
  } else if (position === "center") {
    // 居中：绕文字中心旋转
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(width / 2, height / 2);
    ctx.rotate(rad);
    ctx.fillText(text, 0, 0);
  } else if (position === "bottom-left") {
    // 左下：距左下边距 fontSize 像素，绕文字中心旋转
    const textWidth = ctx.measureText(text).width;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const cx = fontSize + textWidth / 2;
    const cy = height - fontSize;
    ctx.translate(cx, cy);
    ctx.rotate(rad);
    ctx.fillText(text, -textWidth / 2, 0);
  } else {
    // 右下：距右下边距 fontSize 像素，textAlign="right"，绕文字中心旋转
    const textWidth = ctx.measureText(text).width;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const cx = width - fontSize - textWidth / 2;
    const cy = height - fontSize;
    ctx.translate(cx, cy);
    ctx.rotate(rad);
    ctx.fillText(text, textWidth / 2, 0);
  }

  ctx.restore();
}

// 为单张图片加水印
// - 用 Image 加载文件 → 绘制到 Canvas（保持原尺寸）→ 根据位置绘制水印 → toBlob 输出 PNG（保留透明度）
// - 返回 { blob, url }，url 由调用方负责 revoke
export async function applyWatermark(
  file: File,
  options: WatermarkOptions
): Promise<WatermarkResult> {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  drawWatermark(ctx, canvas.width, canvas.height, options);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (outBlob) => {
        if (outBlob) {
          resolve(outBlob);
        } else {
          reject(new Error("Failed to export image"));
        }
      },
      "image/png"
    );
  });

  const url = URL.createObjectURL(blob);
  return { blob, url };
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
  a.download = "neetpix-watermarked.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
