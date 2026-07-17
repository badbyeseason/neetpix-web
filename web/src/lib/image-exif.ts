// Neetpix Image EXIF Engine
// 基于 exifr 解析 EXIF 元数据，基于 Canvas 重绘剥离元数据
import exifr from "exifr";

export interface ExifData {
  cameraModel?: string;
  lens?: string;
  aperture?: string;
  shutter?: string;
  iso?: number;
  gps?: { latitude: number; longitude: number };
  captureTime?: string;
  dimensions: { width: number; height: number };
  fileSize: number;
  fieldCount: number; // 总 EXIF 字段数
}

// 格式化快门速度：>=1s 显示原值，<1s 显示分数
function formatShutter(exposureTime: number): string {
  if (exposureTime >= 1) {
    return `${exposureTime}s`;
  }
  return `1/${Math.round(1 / exposureTime)}s`;
}

// 格式化拍摄时间为 YYYY-MM-DD HH:MM:SS
function formatCaptureTime(dt: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

// 解析图片 EXIF 元数据
// - 用 createImageBitmap 获取尺寸，用 exifr 解析 EXIF（含 GPS / TIFF / IFD0）
// - 解析失败或无 EXIF 时返回仅含尺寸与文件大小的基本信息（fieldCount=0）
export async function parseExif(file: File): Promise<ExifData> {
  // 获取图片尺寸
  const bitmap = await createImageBitmap(file);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();

  const base: ExifData = {
    dimensions,
    fileSize: file.size,
    fieldCount: 0,
  };

  let exif: Record<string, unknown> | null = null;
  try {
    exif = await exifr.parse(file, {
      gps: true,
      tiff: true,
      exif: true,
    });
  } catch {
    // 解析失败时返回基本信息（视为无 EXIF）
    return base;
  }

  if (!exif || Object.keys(exif).length === 0) {
    return base;
  }

  const data: ExifData = {
    ...base,
    fieldCount: Object.keys(exif).length,
  };

  // 相机型号：Make + Model
  const make = exif.Make as string | undefined;
  const model = exif.Model as string | undefined;
  if (make || model) {
    data.cameraModel = [make, model].filter(Boolean).join(" ").trim();
  }

  // 镜头
  if (exif.LensModel) {
    data.lens = String(exif.LensModel);
  }

  // 光圈
  if (exif.FNumber) {
    data.aperture = `f/${exif.FNumber}`;
  }

  // 快门
  if (exif.ExposureTime) {
    data.shutter = formatShutter(Number(exif.ExposureTime));
  }

  // ISO
  if (exif.ISO) {
    data.iso = Number(exif.ISO);
  }

  // GPS
  const latitude = exif.latitude as number | undefined;
  const longitude = exif.longitude as number | undefined;
  if (typeof latitude === "number" && typeof longitude === "number") {
    data.gps = { latitude, longitude };
  }

  // 拍摄时间
  if (exif.DateTimeOriginal instanceof Date) {
    data.captureTime = formatCaptureTime(exif.DateTimeOriginal);
  }

  return data;
}

// 剥离 EXIF 元数据
// - 先解析统计被剥离字段数，再用 Canvas 重绘（重绘天然丢弃所有元数据）
// - JPEG 输出 JPEG，其余输出 PNG（保留透明度）
// - 返回 { blob, strippedCount }
export async function stripExif(
  file: File
): Promise<{ blob: Blob; strippedCount: number }> {
  // 先解析获取字段数
  let strippedCount = 0;
  try {
    const exif = await exifr.parse(file, {
      gps: true,
      tiff: true,
      exif: true,
    });
    if (exif) {
      strippedCount = Object.keys(exif).length;
    }
  } catch {
    // 解析失败仍可剥离（重绘）
  }

  // Canvas 重绘
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  // 保持原格式：JPEG 输出 JPEG，其余输出 PNG
  const isJpeg = file.type === "image/jpeg";
  const mimeType = isJpeg ? "image/jpeg" : "image/png";
  const quality = isJpeg ? 0.92 : undefined;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (outBlob) => {
        if (outBlob) {
          resolve(outBlob);
        } else {
          reject(new Error("Failed to export image"));
        }
      },
      mimeType,
      quality
    );
  });

  return { blob, strippedCount };
}
