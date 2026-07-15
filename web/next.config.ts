import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // qpdf-wasm 的 Node.js 内置模块引用通过运行时 fetch + new Function 加载来绕过，
  // 不需要 Turbopack resolveAlias（全局别名会影响其他包如 mammoth / tesseract.js）。
};

export default withNextIntl(nextConfig);
