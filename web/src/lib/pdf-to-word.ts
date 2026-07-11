// Neetpix PDF to Word Converter
// Uses pdfjs-dist to extract text and docx to generate .docx files
// Pure browser-side execution

// docx 类型仅用于编译期，不会产生运行时依赖，避免 SSR 问题
import type { Paragraph as ParagraphType, TextRun as TextRunType, PageBreak as PageBreakType } from "docx";

// PDF 文字 item 的最小结构（仅取用到的字段）
interface PdfTextItem {
  str: string;
  transform: number[];
  hasEOL?: boolean;
  height: number; // 文字高度（设备空间）
  width: number; // 文字宽度（设备空间）
  fontName: string; // 字体名称（可能含 Bold/Italic 信息）
}

// 单行格式信息
interface FormattedLine {
  text: string;
  y: number;
  fontSize: number; // 从 transform[0] 推算
  isBold: boolean; // fontName 含 "Bold" 或 "bold"
  isItalic: boolean; // fontName 含 "Italic" 或 "italic" 或 "Oblique"
  x: number; // transform[4]，用于判断对齐
}

// 段落格式信息
interface FormattedParagraph {
  text: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  isHeading: boolean; // 是否标题
  headingLevel: 1 | 2 | 3 | null;
  x: number; // 段落起始 x 坐标
  gapAfter: number; // 与下一段的间距（pt，用于 spacing.after）
}

// 从单个 item 计算格式属性
function parseItemFormat(item: PdfTextItem) {
  // transform[0] 是水平缩放因子，pdfjs 中通常等于字号（PT_SCALE=1 时）
  // 用 round(...*100)/10 保留一位小数，避免浮点抖动
  const fontSize = Math.round(item.transform[0] * 100) / 10;
  const isBold = /bold/i.test(item.fontName);
  const isItalic = /italic|oblique/i.test(item.fontName);
  const x = item.transform[4];
  const y = item.transform[5];
  return { fontSize, isBold, isItalic, x, y };
}

// 将一页的文字 items 结构化为带格式的行
function buildLines(items: PdfTextItem[]): FormattedLine[] {
  if (items.length === 0) return [];

  // 第一阶段：按 y 坐标将 items 组合成行
  // transform[5] 是文字基线的 y 坐标，y 相同视为同一行
  const lines: FormattedLine[] = [];
  let lineText = "";
  let currentY: number | null = null;
  let lineX: number | null = null;
  // 记录行内各 item 的格式，用于取主导格式
  let lineItems: {
    text: string;
    fontSize: number;
    isBold: boolean;
    isItalic: boolean;
    x: number;
  }[] = [];

  const pushLine = () => {
    const text = lineText.trim();
    if (text) {
      // 选择行内字符数最多的 item 的格式作为该行的代表格式
      let dominant = lineItems[0];
      for (const li of lineItems) {
        if (li.text.length > dominant.text.length) dominant = li;
      }
      lines.push({
        text,
        y: currentY ?? 0,
        fontSize: dominant.fontSize,
        isBold: dominant.isBold,
        isItalic: dominant.isItalic,
        x: lineX ?? dominant.x,
      });
    }
    lineText = "";
    lineItems = [];
    lineX = null;
  };

  for (const item of items) {
    const fmt = parseItemFormat(item);
    const lineItemFmt = {
      text: item.str,
      fontSize: fmt.fontSize,
      isBold: fmt.isBold,
      isItalic: fmt.isItalic,
      x: fmt.x,
    };

    if (currentY === null) {
      // 新行的第一个 item，记录起始 x
      currentY = fmt.y;
      lineX = fmt.x;
      lineText = item.str;
      lineItems = [lineItemFmt];
    } else if (Math.abs(fmt.y - currentY) < 1) {
      // 同一行，直接拼接
      lineText += item.str;
      lineItems.push(lineItemFmt);
    } else {
      // y 变化，新的一行
      pushLine();
      currentY = fmt.y;
      lineX = fmt.x;
      lineText = item.str;
      lineItems = [lineItemFmt];
    }
    // hasEOL 表示行末：结束当前行
    if (item.hasEOL) {
      pushLine();
      currentY = null;
    }
  }
  pushLine();

  return lines;
}

// 将行合并为段落（保留格式信息，标题级别后续统一判定）
function buildParagraphs(lines: FormattedLine[]): FormattedParagraph[] {
  if (lines.length === 0) return [];

  // 第二阶段：按行间距将行合并为段落
  // 行间距明显变大时视为换段
  const paragraphs: FormattedParagraph[] = [];
  let paraLines: FormattedLine[] = [lines[0]];
  let prevGap: number | null = null;

  const flushParagraph = (gapAfter: number) => {
    if (paraLines.length === 0) return;
    // 聚合格式：取段内字符数最多的行的格式作为段落代表格式
    // （简化实现：多数粗体 → 整段粗体，用最长行近似占比最多）
    let dominant = paraLines[0];
    for (const ln of paraLines) {
      if (ln.text.length > dominant.text.length) dominant = ln;
    }
    const text = paraLines.map((l) => l.text).join(" ");
    paragraphs.push({
      text,
      fontSize: dominant.fontSize,
      isBold: dominant.isBold,
      isItalic: dominant.isItalic,
      isHeading: false, // 后面统一判定
      headingLevel: null,
      x: paraLines[0].x,
      gapAfter,
    });
    paraLines = [];
  };

  for (let i = 1; i < lines.length; i++) {
    const gap = Math.abs(lines[i - 1].y - lines[i].y);
    // 当前间距显著大于上一处间距 → 换段
    const isParagraphBreak = prevGap !== null && gap > prevGap * 1.5 && gap > 2;

    if (isParagraphBreak) {
      // gapAfter = 与下一段的间距
      flushParagraph(gap);
      paraLines = [lines[i]];
      prevGap = null; // 换段后重置基线
    } else {
      // 同段落内换行，保留格式
      paraLines.push(lines[i]);
      prevGap = gap;
    }
  }
  // 最后一段：用最后一个行间距作为 gapAfter，无则用默认值
  flushParagraph(prevGap ?? 80);

  return paragraphs;
}

// 将一页的文字 items 结构化为带格式的段落（标题级别暂未判定）
function extractFormattedParagraphs(items: PdfTextItem[]): FormattedParagraph[] {
  const lines = buildLines(items);
  return buildParagraphs(lines);
}

// 计算正文字号（按字符数加权，取出现频次最高的字号作为正文基准）
function computeBodyFontSize(paragraphs: FormattedParagraph[]): number {
  if (paragraphs.length === 0) return 12;
  const freq = new Map<number, number>();
  for (const p of paragraphs) {
    if (p.fontSize > 0) {
      // 按字符数加权：正文段落字数多，自然占据主导
      freq.set(p.fontSize, (freq.get(p.fontSize) ?? 0) + p.text.length + 1);
    }
  }
  let best = 12;
  let bestCount = -1;
  for (const [size, count] of freq) {
    if (count > bestCount) {
      bestCount = count;
      best = size;
    }
  }
  return best > 0 ? best : 12;
}

// 根据字号比例判定标题级别
function detectHeading(
  p: FormattedParagraph,
  bodySize: number
): { isHeading: boolean; headingLevel: 1 | 2 | 3 | null } {
  if (bodySize <= 0) return { isHeading: false, headingLevel: null };
  const ratio = p.fontSize / bodySize;
  if (ratio >= 1.5) return { isHeading: true, headingLevel: 1 };
  if (ratio >= 1.3) return { isHeading: true, headingLevel: 2 };
  if (ratio >= 1.15) return { isHeading: true, headingLevel: 3 };
  // 粗体 + 字号略大于正文也可视为标题
  if (p.isBold && ratio >= 1.1) return { isHeading: true, headingLevel: 3 };
  return { isHeading: false, headingLevel: null };
}

export async function pdfToWord(
  file: File,
  onProgress?: (currentPage: number, totalPages: number) => void
): Promise<Blob> {
  // 动态加载 pdfjs-dist（避免 SSR 问题）
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  // 读取文件并加载 PDF 文档
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;

  // 逐页提取文字并结构化为带格式的段落
  const pageParagraphs: FormattedParagraph[][] = [];
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // content.items 可能包含 TextItem 与 TextMarkedContent，仅保留含 str 的文字项
    // 同时提取 height/width/fontName 等格式字段
    const items: PdfTextItem[] = content.items
      .filter(
        (item): item is Extract<(typeof content.items)[number], { str: string }> =>
          "str" in item
      )
      .map((item) => ({
        str: item.str,
        transform: item.transform,
        hasEOL: item.hasEOL,
        height: item.height,
        width: item.width,
        fontName: item.fontName,
      }));
    pageParagraphs.push(extractFormattedParagraphs(items));
    onProgress?.(i, totalPages);
  }

  // 计算全局正文字号（跨页统计，保证标题判定一致）
  const allParagraphs = pageParagraphs.flat();
  const bodySize = computeBodyFontSize(allParagraphs);
  // 为每个段落标记标题级别
  for (const para of allParagraphs) {
    const { isHeading, headingLevel } = detectHeading(para, bodySize);
    para.isHeading = isHeading;
    para.headingLevel = headingLevel;
  }

  // 动态加载 docx 库并生成 .docx
  const { Document, Packer, Paragraph, TextRun, PageBreak, HeadingLevel } = await import("docx");

  const children: ParagraphType[] = [];
  let addedPages = 0;
  for (let p = 0; p < pageParagraphs.length; p++) {
    const paragraphs = pageParagraphs[p];
    if (paragraphs.length === 0) continue; // 跳过空页

    for (let j = 0; j < paragraphs.length; j++) {
      const para = paragraphs[j];
      // 非首个有内容的页的第一段前插入分页符
      const isFirstOfPage = addedPages > 0 && j === 0;

      // 构建 TextRun 选项：标题不显式设置字号（由标题样式决定），
      // 正文段落按 PDF 字号设置 half-points（如 12pt → size: 24）
      const textRunOpts: {
        text: string;
        bold: boolean;
        italics: boolean;
        size?: number;
      } = {
        text: para.text,
        bold: para.isBold,
        italics: para.isItalic,
      };
      if (para.headingLevel === null) {
        const size = Math.round(para.fontSize * 2);
        if (size > 0) textRunOpts.size = size;
      }

      const runs = [];
      if (isFirstOfPage) {
        runs.push(new PageBreak());
      }
      runs.push(new TextRun(textRunOpts));

      // 段落属性：标题用 heading + 固定 spacing；正文用字号 + 段间距（twips）
      // 注意：spacing.after 单位为 twips（1pt = 20 twips），需将 pt 间距 × 20
      let paraOpts: {
        heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel];
        children: (TextRunType | PageBreakType)[];
        spacing: { after: number };
      };
      if (para.headingLevel === 1) {
        paraOpts = {
          heading: HeadingLevel.HEADING_1,
          children: runs,
          spacing: { after: 200 },
        };
      } else if (para.headingLevel === 2) {
        paraOpts = {
          heading: HeadingLevel.HEADING_2,
          children: runs,
          spacing: { after: 160 },
        };
      } else if (para.headingLevel === 3) {
        paraOpts = {
          heading: HeadingLevel.HEADING_3,
          children: runs,
          spacing: { after: 120 },
        };
      } else {
        const afterTwips = Math.round(para.gapAfter * 20);
        paraOpts = {
          children: runs,
          spacing: { after: afterTwips > 0 ? afterTwips : 80 },
        };
      }

      children.push(new Paragraph(paraOpts));
    }
    addedPages++;
  }

  const doc = new Document({
    sections: [{ children }],
  });
  return await Packer.toBlob(doc);
}
