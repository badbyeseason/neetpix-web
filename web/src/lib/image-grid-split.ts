// Neetpix Image Grid Split Engine
// 基于 Canvas 的图片九宫格/四宫格/自定义网格分割，100% 浏览器本地处理
import JSZip from "jszip";

// 取文件名（不含扩展名）
function getBaseName(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

// sanitize 文件名：仅保留字母、数字、下划线、连字符；其余替换为下划线
function sanitizeBaseName(name: string): string {
  const base = getBaseName(name);
  const sanitized = base.replace(/[^a-zA-Z0-9_-]+/g, "_");
  return sanitized || "image";
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

/**
 * 将图片按 rows × cols 网格切分，打包为 ZIP Blob。
 *
 * 实现步骤：
 *  1. 用 createImageBitmap(file) 加载图片
 *  2. 计算每块宽高：pieceWidth = floor(img.width / cols), pieceHeight = floor(img.height / rows)
 *  3. 对每个 (r, c) 创建 Canvas（pieceWidth × pieceHeight），drawImage 截取对应区域
 *  4. canvas.toBlob("image/png") 获取 PNG Blob
 *  5. 用 JSZip 打包所有 PNG，文件名格式: <basename>_<r>_<c>.png（r/c 从 1 开始）
 *  6. zip.generateAsync({ type: "blob" }) 返回 ZIP Blob
 *
 * 注意：rows/cols 范围 1-6（调用方负责校验）。
 */
export async function splitImageToGrid(
  file: File,
  rows: number,
  cols: number
): Promise<Blob> {
  const bitmap = await loadImageBitmap(file);

  const pieceWidth = Math.floor(bitmap.width / cols);
  const pieceHeight = Math.floor(bitmap.height / rows);

  if (pieceWidth < 1 || pieceHeight < 1) {
    throw new Error("Image too small to split");
  }

  const baseName = sanitizeBaseName(file.name);
  const zip = new JSZip();

  try {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const canvas = document.createElement("canvas");
        canvas.width = pieceWidth;
        canvas.height = pieceHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(
          bitmap,
          c * pieceWidth,
          r * pieceHeight,
          pieceWidth,
          pieceHeight,
          0,
          0,
          pieceWidth,
          pieceHeight
        );
        const blob = await canvasToBlob(canvas, "image/png");
        // r/c 从 1 开始
        zip.file(`${baseName}_${r + 1}_${c + 1}.png`, blob);
      }
    }
  } finally {
    bitmap.close();
  }

  return zip.generateAsync({ type: "blob" });
}
