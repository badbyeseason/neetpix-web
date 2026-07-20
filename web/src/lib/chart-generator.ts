// Neetpix Chart Generator
// 纯 SVG 手写的图表生成器，支持柱状图/折线图/饼图，100% 本地处理，0 依赖

export type ChartType = "bar" | "line" | "pie";
export type LegendPosition = "top" | "bottom" | "none";

export interface ChartSeries {
  label: string; // 系列名
  color: string; // hex 颜色
  values: number[]; // 数值数组
}

export interface ChartData {
  labels: string[]; // X 轴标签（柱状/折线）或饼图分片标签
  series: ChartSeries[]; // 1-3 个系列
}

export interface ChartOptions {
  title?: string;
  width: number; // SVG 宽度，默认 800
  height: number; // SVG 高度，默认 500
  legendPosition: LegendPosition;
}

// 5 套预设配色
export const COLOR_PALETTES: string[][] = [
  ["#0d9488", "#f97316", "#6366f1"], // teal/orange/indigo (默认)
  ["#3b82f6", "#ef4444", "#10b981"], // blue/red/green
  ["#8b5cf6", "#ec4899", "#f59e0b"], // purple/pink/amber
  ["#06b6d4", "#84cc16", "#f43f5e"], // cyan/lime/rose
  ["#1e293b", "#64748b", "#94a3b8"], // slate 渐变
];

const FONT_FAMILY = "system-ui, -apple-system, sans-serif";

// 转义 XML 特殊字符 <, >, &, ", '
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// 数字格式化：整数显示原样，小数最多 2 位
function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, "");
}

// 计算 Y 轴合适的刻度间隔（向上取整到 1/2/5×10^k）
function niceMax(value: number): { max: number; step: number; ticks: number } {
  if (value <= 0) return { max: 10, step: 2, ticks: 5 };
  // 向上取整到合适量级
  const exponent = Math.floor(Math.log10(value));
  const base = Math.pow(10, exponent);
  const normalized = value / base;
  let niceNormalized: number;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;
  const max = niceNormalized * base;
  const ticks = 5;
  const step = max / ticks;
  return { max, step, ticks };
}

// 渲染 SVG 根元素
function svgOpen(width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
}

// 渲染标题（顶部居中）
function renderTitle(title: string, width: number): string {
  if (!title) return "";
  const escaped = escapeXml(title);
  return `<text x="${width / 2}" y="28" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="18" font-weight="700" fill="#1e293b">${escaped}</text>`;
}

// 渲染图例（color rect + label text，水平排列）
function renderLegend(
  series: ChartSeries[],
  width: number,
  y: number
): string {
  if (series.length === 0) return "";
  // 估算每个图例项宽度：色块 14 + 间距 6 + 文本（按平均字符宽度估算）
  const itemWidths = series.map((s) => 14 + 6 + escapeXml(s.label).length * 7 + 18);
  const totalWidth = itemWidths.reduce((a, b) => a + b, 0);
  let x = (width - totalWidth) / 2;
  if (x < 10) x = 10;
  const parts: string[] = [];
  series.forEach((s, i) => {
    parts.push(
      `<rect x="${x.toFixed(1)}" y="${y}" width="14" height="14" rx="2" fill="${s.color}" />`
    );
    parts.push(
      `<text x="${(x + 18).toFixed(1)}" y="${(y + 11).toFixed(1)}" font-family="${FONT_FAMILY}" font-size="12" fill="#475569">${escapeXml(
        s.label
      )}</text>`
    );
    x += itemWidths[i];
  });
  return parts.join("");
}

// ====== 柱状图 ======
export function renderBarChart(data: ChartData, options: ChartOptions): string {
  const { width, height, title, legendPosition } = options;
  const { labels, series } = data;

  const titleHeight = title ? 40 : 10;
  const legendHeight = legendPosition !== "none" ? 30 : 0;
  const legendTopHeight = legendPosition === "top" ? legendHeight : 0;
  const legendBottomHeight = legendPosition === "bottom" ? legendHeight : 0;

  const padding = { top: titleHeight + legendTopHeight + 20, right: 30, bottom: 50 + legendBottomHeight, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // 计算最大值和最小值（含负数）
  let maxValue = 0;
  let minValue = 0;
  for (const s of series) {
    for (const v of s.values) {
      if (v > maxValue) maxValue = v;
      if (v < minValue) minValue = v;
    }
  }

  const hasNegative = minValue < 0;
  let scaledMax: number;
  let scaledMin: number;
  let step: number;
  let range: number;
  let tickValues: number[];
  if (hasNegative) {
    // 负值：基于实际范围计算 nice step，scaledMax/scaledMin 均对齐到 step，
    // 从而保证 0 必为刻度（如 minValue=-15 → scaledMin=-20，maxValue=30 → scaledMax=30）
    step = niceMax(maxValue - minValue).step;
    scaledMax = Math.ceil(maxValue / step) * step;
    scaledMin = Math.floor(minValue / step) * step;
    if (scaledMax === scaledMin) {
      scaledMax += step;
      scaledMin -= step;
    }
    range = scaledMax - scaledMin;
    const count = Math.round(range / step);
    tickValues = [];
    for (let i = 0; i <= count; i++) tickValues.push(scaledMin + step * i);
  } else {
    // 非负：保持原有逻辑（0 到 scaledMax，5 等分）
    const nice = niceMax(maxValue);
    scaledMax = nice.max;
    scaledMin = 0;
    step = nice.step;
    range = scaledMax;
    tickValues = [];
    for (let i = 0; i <= nice.ticks; i++) tickValues.push(step * i);
  }

  // 值 → Y 坐标
  const valueToY = (v: number): number =>
    padding.top + ((scaledMax - v) / range) * chartHeight;
  // 零线 Y 坐标（minValue >= 0 时即为 X 轴位置）
  const zeroY = hasNegative ? valueToY(0) : padding.top + chartHeight;

  const parts: string[] = [];
  parts.push(svgOpen(width, height));
  // 背景
  parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />`);

  // 顶部图例
  if (legendPosition === "top") {
    parts.push(renderLegend(series, width, titleHeight));
  }

  // 标题
  parts.push(renderTitle(title ?? "", width));

  // Y 轴刻度 + 横线（含负值时刻度包含 0）
  for (const value of tickValues) {
    const y = valueToY(value);
    parts.push(
      `<line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${(padding.left + chartWidth).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1" />`
    );
    parts.push(
      `<text x="${(padding.left - 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-family="${FONT_FAMILY}" font-size="11" fill="#64748b">${formatNumber(
        value
      )}</text>`
    );
  }

  // 零线（仅有负值时单独绘制，颜色略深于网格线）
  if (hasNegative) {
    parts.push(
      `<line x1="${padding.left}" y1="${zeroY.toFixed(1)}" x2="${(padding.left + chartWidth).toFixed(1)}" y2="${zeroY.toFixed(1)}" stroke="#94a3b8" stroke-width="1" />`
    );
  }

  // X 轴 & Y 轴
  parts.push(
    `<line x1="${padding.left}" y1="${(padding.top + chartHeight).toFixed(1)}" x2="${(padding.left + chartWidth).toFixed(1)}" y2="${(padding.top + chartHeight).toFixed(1)}" stroke="#94a3b8" stroke-width="1.5" />`
  );
  parts.push(
    `<line x1="${padding.left}" y1="${padding.top.toFixed(1)}" x2="${padding.left}" y2="${(padding.top + chartHeight).toFixed(1)}" stroke="#94a3b8" stroke-width="1.5" />`
  );

  // 柱状图：每组内系列并排，组间留间距
  const groupWidth = chartWidth / labels.length;
  const barWidth = (groupWidth / series.length) * 0.7;
  const groupInnerWidth = barWidth * series.length;
  const groupGap = (groupWidth - groupInnerWidth) / 2;

  labels.forEach((label, labelIdx) => {
    const groupX = padding.left + groupWidth * labelIdx + groupGap;
    series.forEach((s, seriesIdx) => {
      const value = s.values[labelIdx] ?? 0;
      const barX = groupX + barWidth * seriesIdx;
      // 正值从零线向上绘制，负值从零线向下绘制
      const topY = valueToY(Math.max(value, 0));
      const bottomY = valueToY(Math.min(value, 0));
      const barHeight = Math.max(0, bottomY - topY);
      parts.push(
        `<rect x="${barX.toFixed(1)}" y="${topY.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(
          1
        )}" fill="${s.color}" rx="2" />`
      );
      // 数据标签：正值显示在柱顶上方，负值显示在柱底下方
      if (value > 0) {
        parts.push(
          `<text x="${(barX + barWidth / 2).toFixed(1)}" y="${(topY - 4).toFixed(1)}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="10" fill="#475569">${formatNumber(
            value
          )}</text>`
        );
      } else if (value < 0) {
        parts.push(
          `<text x="${(barX + barWidth / 2).toFixed(1)}" y="${(bottomY + 12).toFixed(1)}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="10" fill="#475569">${formatNumber(
            value
          )}</text>`
        );
      }
    });
    // X 轴标签
    const labelX = padding.left + groupWidth * labelIdx + groupWidth / 2;
    const labelY = padding.top + chartHeight + 18;
    parts.push(
      `<text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="11" fill="#475569">${escapeXml(
        label
      )}</text>`
    );
  });

  // 底部图例
  if (legendPosition === "bottom") {
    parts.push(renderLegend(series, width, height - legendBottomHeight + 8));
  }

  parts.push("</svg>");
  return parts.join("");
}

// ====== 折线图 ======
export function renderLineChart(data: ChartData, options: ChartOptions): string {
  const { width, height, title, legendPosition } = options;
  const { labels, series } = data;

  const titleHeight = title ? 40 : 10;
  const legendHeight = legendPosition !== "none" ? 30 : 0;
  const legendTopHeight = legendPosition === "top" ? legendHeight : 0;
  const legendBottomHeight = legendPosition === "bottom" ? legendHeight : 0;

  const padding = { top: titleHeight + legendTopHeight + 20, right: 30, bottom: 50 + legendBottomHeight, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // 计算最大值和最小值（含负数）
  let maxValue = 0;
  let minValue = 0;
  for (const s of series) {
    for (const v of s.values) {
      if (v > maxValue) maxValue = v;
      if (v < minValue) minValue = v;
    }
  }

  const hasNegative = minValue < 0;
  let scaledMax: number;
  let scaledMin: number;
  let step: number;
  let range: number;
  let tickValues: number[];
  if (hasNegative) {
    // 负值：基于实际范围计算 nice step，scaledMax/scaledMin 均对齐到 step，
    // 从而保证 0 必为刻度
    step = niceMax(maxValue - minValue).step;
    scaledMax = Math.ceil(maxValue / step) * step;
    scaledMin = Math.floor(minValue / step) * step;
    if (scaledMax === scaledMin) {
      scaledMax += step;
      scaledMin -= step;
    }
    range = scaledMax - scaledMin;
    const count = Math.round(range / step);
    tickValues = [];
    for (let i = 0; i <= count; i++) tickValues.push(scaledMin + step * i);
  } else {
    // 非负：保持原有逻辑（0 到 scaledMax，5 等分）
    const nice = niceMax(maxValue);
    scaledMax = nice.max;
    scaledMin = 0;
    step = nice.step;
    range = scaledMax;
    tickValues = [];
    for (let i = 0; i <= nice.ticks; i++) tickValues.push(step * i);
  }

  // 值 → Y 坐标
  const valueToY = (v: number): number =>
    padding.top + ((scaledMax - v) / range) * chartHeight;
  // 零线 Y 坐标（minValue >= 0 时即为 X 轴位置）
  const zeroY = hasNegative ? valueToY(0) : padding.top + chartHeight;

  const parts: string[] = [];
  parts.push(svgOpen(width, height));
  parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />`);

  if (legendPosition === "top") {
    parts.push(renderLegend(series, width, titleHeight));
  }

  parts.push(renderTitle(title ?? "", width));

  // Y 轴刻度 + 横线（含负值时刻度包含 0）
  for (const value of tickValues) {
    const y = valueToY(value);
    parts.push(
      `<line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${(padding.left + chartWidth).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="1" />`
    );
    parts.push(
      `<text x="${(padding.left - 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-family="${FONT_FAMILY}" font-size="11" fill="#64748b">${formatNumber(
        value
      )}</text>`
    );
  }

  // 零线（仅有负值时单独绘制）
  if (hasNegative) {
    parts.push(
      `<line x1="${padding.left}" y1="${zeroY.toFixed(1)}" x2="${(padding.left + chartWidth).toFixed(1)}" y2="${zeroY.toFixed(1)}" stroke="#94a3b8" stroke-width="1" />`
    );
  }

  // 坐标轴
  parts.push(
    `<line x1="${padding.left}" y1="${(padding.top + chartHeight).toFixed(1)}" x2="${(padding.left + chartWidth).toFixed(1)}" y2="${(padding.top + chartHeight).toFixed(1)}" stroke="#94a3b8" stroke-width="1.5" />`
  );
  parts.push(
    `<line x1="${padding.left}" y1="${padding.top.toFixed(1)}" x2="${padding.left}" y2="${(padding.top + chartHeight).toFixed(1)}" stroke="#94a3b8" stroke-width="1.5" />`
  );

  // 每个标签的 X 坐标
  const labelCount = labels.length;
  const stepX = labelCount > 1 ? chartWidth / (labelCount - 1) : 0;

  // 渲染每条折线
  series.forEach((s) => {
    const points: { x: number; y: number; value: number }[] = [];
    for (let i = 0; i < labelCount; i++) {
      const value = s.values[i] ?? 0;
      const x = labelCount > 1 ? padding.left + stepX * i : padding.left + chartWidth / 2;
      const y = valueToY(value);
      points.push({ x, y, value });
    }

    // 填充区域（半透明）：有负值时填充到零线，否则填充到图表底部
    if (points.length >= 2) {
      const fillPoints = points
        .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(" ");
      const fillBaseY = hasNegative ? zeroY : padding.top + chartHeight;
      const areaPath = `M ${points[0].x.toFixed(1)},${fillBaseY.toFixed(
        1
      )} L ${fillPoints.replace(/ /g, " L ")} L ${points[points.length - 1].x.toFixed(
        1
      )},${fillBaseY.toFixed(1)} Z`;
      parts.push(
        `<path d="${areaPath}" fill="${s.color}" fill-opacity="0.15" stroke="none" />`
      );
    }

    // 折线
    if (points.length >= 2) {
      const linePoints = points
        .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(" ");
      parts.push(
        `<polyline points="${linePoints}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />`
      );
    }

    // 数据点
    points.forEach((p) => {
      parts.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${s.color}" stroke="#ffffff" stroke-width="1.5" />`);
      // 数据标签：正值显示在点上方，负值显示在点下方
      if (p.value > 0) {
        parts.push(
          `<text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="10" fill="#475569">${formatNumber(
            p.value
          )}</text>`
        );
      } else if (p.value < 0) {
        parts.push(
          `<text x="${p.x.toFixed(1)}" y="${(p.y + 14).toFixed(1)}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="10" fill="#475569">${formatNumber(
            p.value
          )}</text>`
        );
      }
    });
  });

  // X 轴标签
  labels.forEach((label, i) => {
    const x = labelCount > 1 ? padding.left + stepX * i : padding.left + chartWidth / 2;
    const y = padding.top + chartHeight + 18;
    parts.push(
      `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="11" fill="#475569">${escapeXml(
        label
      )}</text>`
    );
  });

  // 底部图例
  if (legendPosition === "bottom") {
    parts.push(renderLegend(series, width, height - legendBottomHeight + 8));
  }

  parts.push("</svg>");
  return parts.join("");
}

// ====== 饼图 ======
export function renderPieChart(data: ChartData, options: ChartOptions): string {
  const { width, height, title, legendPosition } = options;
  // 饼图只取第一个系列
  const series = data.series[0];
  if (!series) {
    return svgOpen(width, height) + `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" /></svg>`;
  }

  const values = series.values;
  const labels = data.labels;
  const colors = COLOR_PALETTES[0];

  // 计算总和
  const total = values.reduce((a, b) => a + Math.max(0, b), 0);

  const titleHeight = title ? 40 : 10;
  const legendHeight = legendPosition !== "none" ? 30 : 0;
  const legendTopHeight = legendPosition === "top" ? legendHeight : 0;
  const legendBottomHeight = legendPosition === "bottom" ? legendHeight : 0;

  // 饼图中心 & 半径
  const cx = width / 2;
  const cy = titleHeight + legendTopHeight + (height - titleHeight - legendTopHeight - legendBottomHeight) / 2;
  const radius = Math.min(width, height - titleHeight - legendTopHeight - legendBottomHeight) / 2 - 30;

  const parts: string[] = [];
  parts.push(svgOpen(width, height));
  parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />`);

  if (legendPosition === "top") {
    parts.push(renderLegend(series ? [series] : [], width, titleHeight));
  }

  parts.push(renderTitle(title ?? "", width));

  if (total > 0) {
    let startAngle = -Math.PI / 2; // 从 12 点钟方向开始
    values.forEach((value, i) => {
      if (value <= 0) return;
      const angle = (value / total) * 2 * Math.PI;
      const endAngle = startAngle + angle;
      const color = colors[i % colors.length];

      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);

      // 整圆特殊处理
      let path: string;
      if (angle >= 2 * Math.PI - 0.0001) {
        // 整圆：用两个半圆 arc
        path = `M ${cx.toFixed(1)},${(cy - radius).toFixed(1)} A ${radius.toFixed(1)},${radius.toFixed(
          1
        )} 0 1 1 ${(cx - 0.01).toFixed(1)},${(cy - radius).toFixed(1)} Z`;
      } else {
        const largeArc = angle > Math.PI ? 1 : 0;
        path = `M ${cx.toFixed(1)},${cy.toFixed(1)} L ${x1.toFixed(1)},${y1.toFixed(
          1
        )} A ${radius.toFixed(1)},${radius.toFixed(1)} 0 ${largeArc} 1 ${x2.toFixed(1)},${y2.toFixed(
          1
        )} Z`;
      }
      parts.push(`<path d="${path}" fill="${color}" stroke="#ffffff" stroke-width="1.5" />`);

      // 百分比标签（中点位置，半径外侧）
      const midAngle = startAngle + angle / 2;
      const percent = (value / total) * 100;
      // 只对占比 ≥ 5% 的片显示标签，避免拥挤
      if (percent >= 5) {
        const labelRadius = radius * 0.65;
        const lx = cx + labelRadius * Math.cos(midAngle);
        const ly = cy + labelRadius * Math.sin(midAngle);
        parts.push(
          `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="${FONT_FAMILY}" font-size="12" font-weight="600" fill="#ffffff">${percent.toFixed(
            1
          )}%</text>`
        );
      }

      // 外侧片名标签（仅占比 ≥ 5% 显示，避免重叠）
      if (percent >= 5 && labels[i]) {
        const outerRadius = radius + 18;
        const ox = cx + outerRadius * Math.cos(midAngle);
        const oy = cy + outerRadius * Math.sin(midAngle);
        const anchor = Math.cos(midAngle) > 0 ? "start" : "end";
        parts.push(
          `<text x="${ox.toFixed(1)}" y="${oy.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" font-family="${FONT_FAMILY}" font-size="11" fill="#475569">${escapeXml(
            labels[i]
          )}</text>`
        );
      }

      startAngle = endAngle;
    });
  } else {
    // 空数据提示
    parts.push(
      `<text x="${cx}" y="${cy}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="14" fill="#64748b">No data</text>`
    );
  }

  // 底部图例：使用饼图分片标签作为图例
  if (legendPosition === "bottom") {
    const legendSeries: ChartSeries[] = labels
      .map((label, i) => ({
        label,
        color: colors[i % colors.length],
        values: [values[i] ?? 0],
      }))
      .filter((_, i) => (values[i] ?? 0) > 0);
    parts.push(renderLegend(legendSeries, width, height - legendBottomHeight + 8));
  }

  parts.push("</svg>");
  return parts.join("");
}

// SVG 字符串 → PNG Blob（通过 Image + Canvas）
export async function svgToPngBlob(
  svgString: string,
  width: number,
  height: number
): Promise<Blob> {
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.width = width;
    img.height = height;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load SVG"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create PNG blob"));
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
