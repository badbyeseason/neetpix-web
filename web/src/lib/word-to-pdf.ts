// NeetPix Word to PDF Engine
// 使用 mammoth 解析 .docx -> HTML，再用 pdf-lib 生成 PDF。
// 由于 pdf-lib 的 StandardFonts 不支持中文字形，每一行文本都通过 Canvas
// 渲染为 PNG（浏览器原生支持中文）后嵌入 PDF。纯浏览器端执行。

import { PDFDocument } from "pdf-lib";

// 从 mammoth HTML 中提取的中间结构
interface Block {
  type: "h1" | "h2" | "h3" | "p" | "li";
  text: string;
}

// Canvas 字体栈（浏览器原生支持中文）
const FONT_STACK = `-apple-system, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif`;

// A4 页面尺寸（pt）
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
// 页边距（pt）
const PAGE_MARGIN = 50;
// 列表项缩进（pt）
const LIST_INDENT = 30;

// 根据块类型返回渲染样式
function getBlockStyle(
  type: Block["type"]
): { fontSize: number; isBold: boolean; indent: number } {
  switch (type) {
    case "h1":
      return { fontSize: 22, isBold: true, indent: 0 };
    case "h2":
      return { fontSize: 18, isBold: true, indent: 0 };
    case "h3":
      return { fontSize: 16, isBold: true, indent: 0 };
    case "li":
      return { fontSize: 12, isBold: false, indent: LIST_INDENT };
    case "p":
    default:
      return { fontSize: 12, isBold: false, indent: 0 };
  }
}

// 从 mammoth 输出的 HTML 中提取块结构
function extractBlocks(html: string): Block[] {
  // 将 <br> 转为换行符，保留段落内的显式换行
  const normalized = html.replace(/<br\s*\/?>/gi, "\n");
  const doc = new DOMParser().parseFromString(normalized, "text/html");
  const blocks: Block[] = [];

  const pushText = (type: Block["type"], text: string | null) => {
    const trimmed = (text ?? "").trim();
    if (trimmed) blocks.push({ type, text: trimmed });
  };

  const handleElement = (el: Element) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "h1" || tag === "h2" || tag === "h3") {
      pushText(tag, el.textContent);
    } else if (tag === "p") {
      pushText("p", el.textContent);
    } else if (tag === "ul" || tag === "ol") {
      // 仅取直接子级 li，避免嵌套列表重复
      Array.from(el.children).forEach((child) => {
        if (child.tagName.toLowerCase() === "li") {
          pushText("li", "• " + (child.textContent ?? "").trim());
        }
      });
    } else if (tag === "li") {
      pushText("li", "• " + (el.textContent ?? "").trim());
    } else {
      // 其他节点（table 等）：取整体文本作为一个段落
      pushText("p", el.textContent);
    }
  };

  Array.from(doc.body.childNodes).forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      handleElement(node as Element);
    } else if (node.nodeType === Node.TEXT_NODE) {
      pushText("p", node.textContent);
    }
  });

  return blocks;
}

// 按字符切分换行：用 Canvas measureText 测量，超出最大宽度则换行
function wrapText(
  text: string,
  fontSize: number,
  isBold: boolean,
  maxWidth: number
): string[] {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const weight = isBold ? "bold" : "normal";
  ctx.font = `${weight} ${fontSize}px ${FONT_STACK}`;

  const lines: string[] = [];
  // 先按显式换行拆分，再对每段做宽度换行
  const paragraphs = text.split("\n");
  for (const para of paragraphs) {
    if (para.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const ch of para) {
      const test = current + ch;
      if (ctx.measureText(test).width > maxWidth && current.length > 0) {
        lines.push(current);
        current = ch;
      } else {
        current = test;
      }
    }
    if (current.length > 0) lines.push(current);
  }
  return lines;
}

// 将单行文本渲染为 PNG（支持中文），返回 PNG 字节与图片宽度
async function renderLineToPng(
  text: string,
  fontSize: number,
  isBold: boolean
): Promise<{ bytes: Uint8Array; width: number }> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const weight = isBold ? "bold" : "normal";
  const height = Math.ceil(fontSize * 1.5);

  // 先测量文本宽度以确定 canvas 尺寸
  ctx.font = `${weight} ${fontSize}px ${FONT_STACK}`;
  const textWidth = ctx.measureText(text).width;
  const width = Math.max(Math.ceil(textWidth), 1);

  canvas.width = width;
  canvas.height = height;

  // canvas resize 后需重新设置字体与填充
  ctx.font = `${weight} ${fontSize}px ${FONT_STACK}`;
  ctx.fillStyle = "rgb(0, 0, 0)";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, height / 2);

  const pngBlob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/png")
  );
  const bytes = new Uint8Array(await pngBlob.arrayBuffer());
  return { bytes, width };
}

export async function convertDocxToPdf(file: File): Promise<Blob> {
  // 1. 用 mammoth 解析 docx -> HTML（动态加载以避免 SSR / Node 依赖问题）
  const arrayBuffer = await file.arrayBuffer();
  const mammothModule = await import("mammoth");
  // mammoth 使用 `export =` 语法，动态导入命名空间可能将 API 暴露在 default 或顶层
  const mammoth = mammothModule as typeof import("mammoth") & {
    default?: typeof import("mammoth");
  };
  const mammothApi = mammoth.default ?? mammoth;
  const result = await mammothApi.convertToHtml({ arrayBuffer });
  const html = result.value;

  // 2. 提取块结构
  const blocks = extractBlocks(html);

  // 3. 创建 PDF
  const doc = await PDFDocument.create();

  const lineWidth = PAGE_WIDTH - 2 * PAGE_MARGIN; // 可用行宽
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - PAGE_MARGIN; // 当前行顶部 y 坐标（pdf-lib 原点在左下角）

  for (const block of blocks) {
    const { fontSize, isBold, indent } = getBlockStyle(block.type);
    const startX = PAGE_MARGIN + indent;
    const blockLineWidth = lineWidth - indent;
    const lineHeightPx = Math.ceil(fontSize * 1.5);
    const paragraphGap = fontSize * 1.0;

    const lines = wrapText(block.text, fontSize, isBold, blockLineWidth);

    for (const line of lines) {
      // 自动分页：当前行底部低于下边距则新增页
      if (y - lineHeightPx < PAGE_MARGIN) {
        page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - PAGE_MARGIN;
      }

      if (line.length > 0) {
        const { bytes, width } = await renderLineToPng(
          line,
          fontSize,
          isBold
        );
        const img = await doc.embedPng(bytes);
        // 图片高度 = 行高，绘制时底部对齐 y - lineHeightPx
        page.drawImage(img, {
          x: startX,
          y: y - lineHeightPx,
          width,
          height: lineHeightPx,
        });
      }
      y -= lineHeightPx;
    }

    // 段落间距
    y -= paragraphGap;
  }

  // 4. 返回 PDF Blob
  const pdfBytes = await doc.save();
  const out = new Uint8Array(pdfBytes.byteLength);
  out.set(pdfBytes);
  return new Blob([out], { type: "application/pdf" });
}
