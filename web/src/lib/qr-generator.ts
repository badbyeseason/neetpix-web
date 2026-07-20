// Neetpix QR Code Generator
// 基于 qrcode 库的浏览器端二维码生成，100% 本地处理
import QRCode from "qrcode";

export type QrErrorLevel = "L" | "M" | "Q" | "H";

export interface QrOptions {
  size: number; // 像素尺寸: 128/256/512/1024
  color: string; // 前景色 hex, e.g. "#000000"
  background: string; // 背景色 hex, e.g. "#FFFFFF"
  errorCorrectionLevel: QrErrorLevel;
}

// 返回 PNG data URL (base64)
// 注：QRCode.toDataURL 的 overload 在 TS 下解析不稳定，使用类型断言锁定 string overload
export async function generateQrPng(
  text: string,
  options: QrOptions
): Promise<string> {
  return (QRCode.toDataURL as (text: string, options?: QRCode.QRCodeToDataURLOptions) => Promise<string>)(text, {
    errorCorrectionLevel: options.errorCorrectionLevel,
    width: options.size,
    color: { dark: options.color, light: options.background },
    margin: 0,
  });
}

// 返回 SVG 字符串
export async function generateQrSvg(
  text: string,
  options: QrOptions
): Promise<string> {
  return (QRCode.toString as (text: string, options?: QRCode.QRCodeToStringOptions) => Promise<string>)(text, {
    errorCorrectionLevel: options.errorCorrectionLevel,
    width: options.size,
    color: { dark: options.color, light: options.background },
    type: "svg",
    margin: 0,
  });
}
