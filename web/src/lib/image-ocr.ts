// Neetpix Image OCR Engine
// OCR: Tesseract.js (chi_sim+eng / eng / jpn)，在浏览器本地运行
// 仅做文字识别，不做翻译，输出纯文本

// 支持的识别语言组合
export type OcrLang = "chi_sim+eng" | "eng" | "jpn";

// 识别图片中的文字，返回 trim 后的纯文本
// 若未识别到任何文字，返回空字符串（由 Client 组件显示 noText 提示）
// 注意：tesseract.js 语言包（chi_sim、eng、jpn）需从 CDN 下载，首次使用会有延迟，
// 调用方需自行处理 loading 状态。
export async function recognizeText(file: File, lang: OcrLang): Promise<string> {
  // 动态 import Tesseract.js，避免 SSR 问题（参考 screenshot-translate.ts）
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(lang);
  try {
    const { data } = await worker.recognize(file);
    return (data?.text ?? "").trim();
  } finally {
    await worker.terminate();
  }
}
