// Neetpix Screenshot Translate Engine
// OCR: Tesseract.js (chi_sim + eng)，在浏览器本地运行
// Translate: 调用内部 API 代理 /api/translate → MyMemory

// 识别图片中的文字，支持中英文（chi_sim + eng）
// onProgress 回调返回 0-1 的识别进度
export async function ocrImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // 动态 import Tesseract.js，避免 SSR 问题
  const { default: Tesseract } = await import("tesseract.js");
  const result = await Tesseract.recognize(file, "chi_sim+eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(m.progress);
      }
    },
  });
  return result.data.text;
}

// 调用内部 API 代理进行翻译
// from / to 为语言代码，例如 "en"、"zh-CN"
export async function translateText(
  text: string,
  from: string,
  to: string
): Promise<string> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, from, to }),
  });
  if (!res.ok) {
    throw new Error("Translation failed");
  }
  const data = await res.json();
  return data.translatedText || "";
}

// 按换行符和句末标点（。.!?！？）分句，返回句子数组
export function splitIntoSentences(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const sentences: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // 按句末标点分句，并保留标点
    const parts = trimmed.split(/([。.!?！？])/);
    let current = "";
    for (const part of parts) {
      current += part;
      if (/[。.!?！？]/.test(part)) {
        const p = current.trim();
        if (p) sentences.push(p);
        current = "";
      }
    }
    const rest = current.trim();
    if (rest) sentences.push(rest);
  }
  return sentences;
}
