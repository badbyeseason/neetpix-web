"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/ui/Logo";
import {
  renderBarChart,
  renderLineChart,
  renderPieChart,
  svgToPngBlob,
  COLOR_PALETTES,
  type ChartType,
  type ChartSeries,
  type LegendPosition,
} from "@/lib/chart-generator";

const CHART_WIDTH = 800;
const CHART_HEIGHT = 500;
const MAX_SERIES = 3;
const MIN_SERIES = 1;
const MAX_ROWS = 20;
const MIN_ROWS = 2;

// 默认数据：1 个系列，3 个值 [10, 20, 15]
function createDefaultSeries(palette: string[]): ChartSeries[] {
  return [
    {
      label: "Series 1",
      color: palette[0],
      values: [10, 20, 15],
    },
  ];
}

// 检查数据是否全为 0/空
function hasNonZeroValues(series: ChartSeries[]): boolean {
  return series.some((s) => s.values.some((v) => v > 0));
}

export default function ChartGeneratorClient() {
  const t = useTranslations("chartGenerator");

  const [chartType, setChartType] = useState<ChartType>("bar");
  const [labels, setLabels] = useState<string[]>(["A", "B", "C"]);
  const [series, setSeries] = useState<ChartSeries[]>(() =>
    createDefaultSeries(COLOR_PALETTES[0])
  );
  const [title, setTitle] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [legendPosition, setLegendPosition] = useState<LegendPosition>("bottom");
  const [svgString, setSvgString] = useState("");

  // 下载用 object URL 生命周期管理
  const urlsRef = useRef<string[]>([]);

  // 组件卸载时统一释放所有 object URL
  useEffect(() => {
    return () => {
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      urlsRef.current = [];
    };
  }, []);

  // 应用当前配色到系列
  const applyPalette = useCallback(
    (newPaletteIndex: number, currentSeries: ChartSeries[]): ChartSeries[] => {
      const palette = COLOR_PALETTES[newPaletteIndex];
      return currentSeries.map((s, i) => ({
        ...s,
        color: palette[i % palette.length],
      }));
    },
    []
  );

  // 实时预览：依赖项变化时重新生成 SVG
  useEffect(() => {
    // 空数据保护
    if (labels.length === 0 || !hasNonZeroValues(series)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSvgString("");
      return;
    }

    const data = { labels, series };
    const options = {
      title,
      width: CHART_WIDTH,
      height: CHART_HEIGHT,
      legendPosition,
    };

    let svg = "";
    try {
      if (chartType === "bar") {
        svg = renderBarChart(data, options);
      } else if (chartType === "line") {
        svg = renderLineChart(data, options);
      } else {
        svg = renderPieChart(data, options);
      }
    } catch (err) {
      console.error("Chart render error:", err);
      svg = "";
    }
    setSvgString(svg);
  }, [chartType, labels, series, title, legendPosition]);

  // ===== 表格操作 =====
  // 更新某行的标签
  const handleLabelChange = useCallback((rowIdx: number, value: string) => {
    setLabels((prev) => {
      const next = [...prev];
      next[rowIdx] = value;
      return next;
    });
  }, []);

  // 更新某系列某行的值
  const handleValueChange = useCallback(
    (seriesIdx: number, rowIdx: number, value: number) => {
      setSeries((prev) => {
        const next = prev.map((s, i) => {
          if (i !== seriesIdx) return s;
          const values = [...s.values];
          values[rowIdx] = isNaN(value) ? 0 : value;
          return { ...s, values };
        });
        return next;
      });
    },
    []
  );

  // 更新系列名
  const handleSeriesLabelChange = useCallback(
    (seriesIdx: number, value: string) => {
      setSeries((prev) =>
        prev.map((s, i) => (i === seriesIdx ? { ...s, label: value } : s))
      );
    },
    []
  );

  // 添加系列（最多 3 个）
  const handleAddSeries = useCallback(() => {
    setSeries((prev) => {
      if (prev.length >= MAX_SERIES) return prev;
      const palette = COLOR_PALETTES[paletteIndex];
      const newSeries: ChartSeries = {
        label: `Series ${prev.length + 1}`,
        color: palette[prev.length % palette.length],
        values: labels.map(() => 0),
      };
      return [...prev, newSeries];
    });
  }, [paletteIndex, labels]);

  // 删除系列（≥2 时显示，即保留至少 1 个）
  const handleRemoveSeries = useCallback((seriesIdx: number) => {
    setSeries((prev) => {
      if (prev.length <= MIN_SERIES) return prev;
      return prev.filter((_, i) => i !== seriesIdx);
    });
  }, []);

  // 添加行（最多 20 行）
  const handleAddRow = useCallback(() => {
    setLabels((prev) => {
      if (prev.length >= MAX_ROWS) return prev;
      return [...prev, `Item ${prev.length + 1}`];
    });
    setSeries((prev) =>
      prev.map((s) => ({
        ...s,
        values: [...s.values, 0],
      }))
    );
  }, []);

  // 删除行（≥2 时显示）
  const handleRemoveRow = useCallback((rowIdx: number) => {
    setLabels((prev) => {
      if (prev.length <= MIN_ROWS) return prev;
      return prev.filter((_, i) => i !== rowIdx);
    });
    setSeries((prev) =>
      prev.map((s) => ({
        ...s,
        values: s.values.filter((_, i) => i !== rowIdx),
      }))
    );
  }, []);

  // 切换配色
  const handlePaletteChange = useCallback(
    (newPaletteIndex: number) => {
      setPaletteIndex(newPaletteIndex);
      setSeries((prev) => applyPalette(newPaletteIndex, prev));
    },
    [applyPalette]
  );

  // ===== 导出 =====
  // PNG 导出
  const handleDownloadPng = useCallback(async () => {
    if (!svgString) return;
    try {
      const blob = await svgToPngBlob(svgString, CHART_WIDTH, CHART_HEIGHT);
      const url = URL.createObjectURL(blob);
      urlsRef.current.push(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = "chart.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // 延迟释放，确保下载已开始
      setTimeout(() => {
        URL.revokeObjectURL(url);
        urlsRef.current = urlsRef.current.filter((u) => u !== url);
      }, 1000);
    } catch (err) {
      console.error("PNG export error:", err);
    }
  }, [svgString]);

  // SVG 导出
  const handleDownloadSvg = useCallback(() => {
    if (!svgString) return;
    try {
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      urlsRef.current.push(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = "chart.svg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => {
        URL.revokeObjectURL(url);
        urlsRef.current = urlsRef.current.filter((u) => u !== url);
      }, 1000);
    } catch (err) {
      console.error("SVG export error:", err);
    }
  }, [svgString]);

  // 选项按钮通用样式
  const optionBtn = (active: boolean) =>
    [
      "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
      active
        ? "bg-teal text-white border-teal"
        : "bg-bg-warm text-text-secondary border-border hover:border-teal-light hover:text-text",
    ].join(" ");

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-border bg-bg-article text-text text-sm focus:outline-none focus:border-teal";

  const tableInputClass =
    "w-full px-2 py-1.5 rounded-md border border-border bg-bg-article text-text text-sm focus:outline-none focus:border-teal";

  const chartTypes: { key: ChartType; label: string }[] = [
    { key: "bar", label: t("typeBar") },
    { key: "line", label: t("typeLine") },
    { key: "pie", label: t("typePie") },
  ];

  const legendPositions: { key: LegendPosition; label: string }[] = [
    { key: "top", label: t("legendTop") },
    { key: "bottom", label: t("legendBottom") },
    { key: "none", label: t("legendNone") },
  ];

  return (
    <div>
      {/* 标题区 */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Logo className="w-12 h-12" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-text tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-2 text-text-secondary max-w-lg mx-auto">
          {t("description")}
        </p>
      </div>

      {/* 类型切换 */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-full border border-border bg-bg-warm p-1">
          {chartTypes.map((ct) => (
            <button
              key={ct.key}
              type="button"
              onClick={() => setChartType(ct.key)}
              className={[
                "px-6 py-2 rounded-full text-sm font-semibold transition-colors",
                chartType === ct.key
                  ? "bg-teal text-white"
                  : "text-text-secondary hover:text-text",
              ].join(" ")}
            >
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 左栏：表格 + 样式控制 */}
        <div className="space-y-6">
          {/* 数据表格 */}
          <div className="rounded-2xl border border-border bg-bg-article p-5 space-y-4">
            <p className="text-sm font-medium text-text">{t("data")}</p>

            {/* 表格 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-2 pb-2 text-xs font-medium text-text-secondary">
                      {t("label")}
                    </th>
                    {series.map((s, seriesIdx) => (
                      <th
                        key={seriesIdx}
                        className="px-1 pb-2 text-left text-xs font-medium text-text-secondary"
                      >
                        <div className="flex items-center gap-1">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: s.color }}
                            aria-hidden="true"
                          />
                          <input
                            type="text"
                            value={s.label}
                            onChange={(e) =>
                              handleSeriesLabelChange(seriesIdx, e.target.value)
                            }
                            className="w-full min-w-[80px] px-1.5 py-1 rounded-md border border-border bg-bg-article text-text text-xs focus:outline-none focus:border-teal"
                            aria-label={t("seriesName")}
                            autoComplete="off"
                          />
                          {series.length > MIN_SERIES && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSeries(seriesIdx)}
                              aria-label={t("removeSeries")}
                              className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-text-secondary hover:bg-coral hover:text-white transition-colors"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="w-8 pb-2" aria-label="actions" />
                  </tr>
                </thead>
                <tbody>
                  {labels.map((label, rowIdx) => (
                    <tr key={rowIdx} className="border-t border-border">
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={label}
                          onChange={(e) =>
                            handleLabelChange(rowIdx, e.target.value)
                          }
                          className={tableInputClass}
                          aria-label={t("label")}
                          autoComplete="off"
                        />
                      </td>
                      {series.map((s, seriesIdx) => (
                        <td key={seriesIdx} className="px-1 py-1.5">
                          <input
                            type="number"
                            value={s.values[rowIdx] ?? 0}
                            onChange={(e) =>
                              handleValueChange(
                                seriesIdx,
                                rowIdx,
                                Number(e.target.value)
                              )
                            }
                            className={tableInputClass}
                            aria-label={`${s.label} ${label}`}
                            autoComplete="off"
                          />
                        </td>
                      ))}
                      <td className="px-1 py-1.5">
                        {labels.length > MIN_ROWS && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(rowIdx)}
                            aria-label={t("removeRow")}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-text-secondary hover:bg-coral hover:text-white transition-colors"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 添加系列 / 添加行 */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleAddSeries}
                disabled={series.length >= MAX_SERIES}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-warm text-text text-xs font-medium border border-border hover:border-teal-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                {t("addSeries")}
              </button>
              {labels.length < MAX_ROWS && (
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-warm text-text text-xs font-medium border border-border hover:border-teal-light transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  {t("addRow")}
                </button>
              )}
            </div>

            {/* 饼图多系列提示 */}
            {chartType === "pie" && series.length > 1 && (
              <p className="text-xs text-coral">{t("pieMultiSeriesHint")}</p>
            )}
          </div>

          {/* 样式控制 */}
          <div className="rounded-2xl border border-border bg-bg-article p-5 space-y-4">
            {/* 标题 */}
            <div>
              <label className="block mb-2 text-sm font-medium text-text">
                {t("chartTitle")}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("chartTitlePlaceholder")}
                maxLength={80}
                autoComplete="off"
                className={inputClass}
              />
            </div>

            {/* 配色选择 */}
            <div>
              <p className="mb-2 text-sm font-medium text-text">
                {t("palette")}
              </p>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTES.map((palette, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePaletteChange(idx)}
                    aria-label={`${t("palette")} ${idx + 1}`}
                    className={[
                      "inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border transition-colors",
                      paletteIndex === idx
                        ? "border-teal bg-teal/5"
                        : "border-border bg-bg-warm hover:border-teal-light",
                    ].join(" ")}
                  >
                    {palette.slice(0, 3).map((c, i) => (
                      <span
                        key={i}
                        className="w-4 h-4 rounded-sm"
                        style={{ backgroundColor: c }}
                        aria-hidden="true"
                      />
                    ))}
                  </button>
                ))}
              </div>
            </div>

            {/* 图例位置 */}
            <div>
              <p className="mb-2 text-sm font-medium text-text">
                {t("legendPosition")}
              </p>
              <div className="flex flex-wrap gap-2">
                {legendPositions.map((lp) => (
                  <button
                    key={lp.key}
                    type="button"
                    onClick={() => setLegendPosition(lp.key)}
                    className={optionBtn(legendPosition === lp.key)}
                  >
                    {lp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右栏：预览 + 导出 */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-bg-article p-5">
            <p className="mb-3 text-sm font-medium text-text">{t("preview")}</p>
            <div className="flex items-center justify-center rounded-xl bg-white p-4 min-h-[280px]">
              {svgString ? (
                <div
                  className="w-full max-w-full"
                  dangerouslySetInnerHTML={{ __html: svgString }}
                />
              ) : (
                <p className="text-center text-sm text-text-secondary">
                  {t("emptyHint")}
                </p>
              )}
            </div>
          </div>

          {/* 导出按钮 */}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={!svgString}
              className={[
                "inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors",
                !svgString
                  ? "bg-bg-article text-text-secondary cursor-not-allowed"
                  : "bg-teal text-white hover:bg-teal-dark",
              ].join(" ")}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {t("exportPng")}
            </button>
            <button
              type="button"
              onClick={handleDownloadSvg}
              disabled={!svgString}
              className={[
                "inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors border",
                !svgString
                  ? "bg-bg-article text-text-secondary border-border cursor-not-allowed"
                  : "bg-bg-warm text-text border-border hover:border-teal-light",
              ].join(" ")}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {t("exportSvg")}
            </button>
          </div>
        </div>
      </div>

      {/* 隐私提示 */}
      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-text-secondary">
        <svg
          className="w-4 h-4 text-teal-light"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        {t("privacy")}
      </div>
    </div>
  );
}
