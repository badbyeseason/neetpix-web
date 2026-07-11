import { NextRequest, NextResponse } from "next/server";

// 翻译 API 代理端点
// 代理调用 MyMemory API，避免前端直接暴露及 SSRF 风险
// 目标 URL 硬编码为 MyMemory，不接受用户输入的 URL

const MAX_TEXT_LENGTH = 5000;
const TIMEOUT_MS = 10000;

// 语言代码白名单校验：字母 + 可选连字符区域子标签，如 en、zh-CN
function isValidLang(code: unknown): code is string {
  return (
    typeof code === "string" && /^[a-zA-Z]{2}(-[A-Za-z0-9]{2,8})?$/.test(code)
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { text, from, to } = (body || {}) as {
    text?: unknown;
    from?: unknown;
    to?: unknown;
  };

  // 输入校验
  if (typeof text !== "string" || !text) {
    return NextResponse.json({ error: "Invalid text" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Text too long (max ${MAX_TEXT_LENGTH} chars)` },
      { status: 400 }
    );
  }
  if (!isValidLang(from) || !isValidLang(to)) {
    return NextResponse.json({ error: "Invalid language code" }, { status: 400 });
  }

  // MyMemory langpair 格式: from|to
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    text
  )}&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      return NextResponse.json(
        { error: "Translation service error" },
        { status: 502 }
      );
    }
    const data = await res.json();
    const translatedText: string = data?.responseData?.translatedText || "";
    return NextResponse.json({ translatedText });
  } catch (e) {
    clearTimeout(timeout);
    const isAbort = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      { error: isAbort ? "Translation timed out" : "Translation failed" },
      { status: isAbort ? 504 : 500 }
    );
  }
}
