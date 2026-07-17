// Neetpix ID Photo Generator
// Reuses removeBackgroundAI to strip the background, then composites the
// person onto a solid-color canvas at standard ID photo dimensions.
// 100% browser-local processing.
import { removeBackgroundAI } from "./remove-background";

export const ID_PHOTO_SIZES = {
  oneInch: { name: "oneInch", width: 295, height: 413 },
  twoInch: { name: "twoInch", width: 413, height: 579 },
  smallOneInch: { name: "smallOneInch", width: 260, height: 390 },
  largeOneInch: { name: "largeOneInch", width: 390, height: 567 },
} as const;

export const BACKGROUND_COLORS = {
  white: "#FFFFFF",
  blue: "#438EDB",
  red: "#D9001B",
} as const;

export type IdPhotoSize = keyof typeof ID_PHOTO_SIZES;
export type BgColor = keyof typeof BACKGROUND_COLORS;

type Stage = "removingBg" | "compositing";

/**
 * Generate a standard ID photo from an uploaded image.
 *
 * 1. Removes the background (reuses the ONNX-based removeBackgroundAI).
 *    Note: first run downloads the ~178MB model, which is then cached.
 * 2. Composites the transparent cutout onto a solid-color canvas at the
 *    target ID photo size, scaling the person to fill 85% of the height
 *    and centering horizontally/vertically.
 * 3. Encodes the result as JPEG (quality 0.95).
 */
export async function generateIdPhoto(
  file: File,
  size: IdPhotoSize,
  bgColor: BgColor,
  onStage?: (stage: Stage) => void
): Promise<Blob> {
  // Stage 1: remove background → transparent PNG data URL
  onStage?.("removingBg");
  const cutoutDataUrl = await removeBackgroundAI(file);

  // Load the transparent cutout into an HTMLImageElement
  const img = await loadHtmlImage(cutoutDataUrl);

  // Stage 2: composite onto a solid-color canvas at the target size
  onStage?.("compositing");
  const spec = ID_PHOTO_SIZES[size];
  const canvas = document.createElement("canvas");
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext("2d")!;

  // Fill the background color
  ctx.fillStyle = BACKGROUND_COLORS[bgColor];
  ctx.fillRect(0, 0, spec.width, spec.height);

  // Scale the person so its height fills 85% of the canvas height,
  // centered horizontally and vertically. Clamp width to avoid overflow
  // for unusually wide inputs.
  const targetHeight = spec.height * 0.85;
  let scale = targetHeight / img.height;
  let drawWidth = img.width * scale;
  if (drawWidth > spec.width) {
    scale = spec.width / img.width;
    drawWidth = spec.width;
  }
  const drawHeight = img.height * scale;
  const offsetX = (spec.width - drawWidth) / 2;
  const offsetY = (spec.height - drawHeight) / 2;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

  // Encode as JPEG (ID photos use JPEG)
  return await canvasToBlob(canvas, "image/jpeg", 0.95);
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load cutout image"));
    img.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to encode canvas to blob"));
      },
      type,
      quality
    );
  });
}
