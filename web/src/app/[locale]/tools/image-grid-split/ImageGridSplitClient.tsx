"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/ui/Logo";
import { splitImageToGrid } from "@/lib/image-grid-split";

// 单张图片最大尺寸 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;
// 网格行列范围
const GRID_MIN = 1;
const GRID_MAX = 6;

type Status = "idle" | "processing" | "done" | "error";
type GridPreset = "2x2" | "3x3" | "4x4" | "custom";

// 根据所选网格预设计算 rows/cols
function resolveGrid(
  preset: GridPreset,
  customRows: number,
  customCols: number
): { rows: number; cols: number } {
  if (preset === "2x2") return { rows: 2, cols: 2 };
  if (preset === "3x3") return { rows: 3, cols: 3 };
  if (preset === "4x4") return { rows: 4, cols: 4 };
  return {
    rows: Math.max(GRID_MIN, Math.min(GRID_MAX, customRows || GRID_MIN)),
    cols: Math.max(GRID_MIN, Math.min(GRID_MAX, customCols || GRID_MIN)),
  };
}

// 格式化字节数为 B/KB/MB
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// 将数字 clamp 到 [GRID_MIN, GRID_MAX]
function clampGrid(value: number): number {
  if (Number.isNaN(value)) return GRID_MIN;
  return Math.max(GRID_MIN, Math.min(GRID_MAX, Math.floor(value)));
}

export default function ImageGridSplitClient() {
  const t = useTranslations("imageGridSplit");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedGrid, setSelectedGrid] = useState<GridPreset>("3x3");
  const [customRows, setCustomRows] = useState<number>(2);
  const [customCols, setCustomCols] = useState<number>(2);

  const inputRef = useRef<HTMLInputElement>(null);
  // 记录所有需清理的 object URL
  const urlsRef = useRef<string[]>([]);

  // 组件卸载时统一释放 object URL，避免内存泄漏
  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // 校验并接收单个文件
  const handleFile = useCallback(
    (fileList: FileList | File[]) => {
      const f = Array.from(fileList)[0];
      if (!f) return;

      if (!f.type.startsWith("image/")) {
        setErrorMsg(t("errorFormat"));
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        setErrorMsg(t("errorSize"));
        return;
      }

      // 释放旧预览与旧结果
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        urlsRef.current = urlsRef.current.filter((u) => u !== previewUrl);
      }
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
        urlsRef.current = urlsRef.current.filter((u) => u !== downloadUrl);
      }

      const url = URL.createObjectURL(f);
      urlsRef.current.push(url);
      setFile(f);
      setPreviewUrl(url);
      setDownloadUrl(null);
      setStatus("idle");
      setErrorMsg("");
    },
    [previewUrl, downloadUrl, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  // 移除当前文件，回到初始上传状态
  const removeFile = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      urlsRef.current = urlsRef.current.filter((u) => u !== previewUrl);
    }
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      urlsRef.current = urlsRef.current.filter((u) => u !== downloadUrl);
    }
    setFile(null);
    setPreviewUrl("");
    setDownloadUrl(null);
    setStatus("idle");
    setErrorMsg("");
  }, [previewUrl, downloadUrl]);

  // 触发 a.click() 下载 ZIP
  const triggerDownload = useCallback((url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  // 执行分割：调用 splitImageToGrid → 获取 ZIP Blob → 自动下载
  const handleSplit = useCallback(async () => {
    if (!file) return;
    setStatus("processing");
    setErrorMsg("");
    try {
      const { rows, cols } = resolveGrid(
        selectedGrid,
        customRows,
        customCols
      );
      const blob = await splitImageToGrid(file, rows, cols);
      const url = URL.createObjectURL(blob);
      urlsRef.current.push(url);

      // 释放旧结果 URL
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
        urlsRef.current = urlsRef.current.filter((u) => u !== downloadUrl);
      }

      setDownloadUrl(url);
      // 自动触发下载
      triggerDownload(url, "neetpix-gridsplit.zip");
      setStatus("done");
    } catch (err) {
      console.error("Grid split error:", err);
      setErrorMsg(t("errorParse"));
      setStatus("error");
    }
  }, [file, selectedGrid, customRows, customCols, downloadUrl, t, triggerDownload]);

  // 重置：保留文件，回到 idle 状态以重新选择网格
  const reset = useCallback(() => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      urlsRef.current = urlsRef.current.filter((u) => u !== downloadUrl);
    }
    setDownloadUrl(null);
    setStatus("idle");
    setErrorMsg("");
  }, [downloadUrl]);

  // 选项按钮组的通用样式
  const optionBtn = (active: boolean) =>
    [
      "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
      active
        ? "bg-teal text-white border-teal"
        : "bg-bg-warm text-text-secondary border-border hover:border-teal-light hover:text-text",
    ].join(" ");

  const previewGrid = resolveGrid(selectedGrid, customRows, customCols);

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

      <div className="space-y-6">
        {/* idle/processing 上传 + 选项区 */}
        {(status === "idle" || status === "processing") && (
          <>
            {!file ? (
              /* 上传区域 */
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => inputRef.current?.click()}
                className={[
                  "border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all",
                  dragOver
                    ? "border-teal bg-teal-bg"
                    : "border-border hover:border-teal-light hover:bg-bg-warm",
                ].join(" ")}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFile(e.target.files);
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-col items-center gap-3">
                  <svg
                    className="w-10 h-10 text-text-secondary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-base font-medium text-text">
                    {t("upload")}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {t("uploadHint")}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* 文件信息卡 */}
                <div className="flex items-center gap-4 rounded-xl border border-border bg-bg-article p-3">
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="w-16 h-16 shrink-0 rounded-lg object-cover bg-bg-warm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {file.name}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    aria-label={t("remove")}
                    className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full text-text-secondary hover:bg-coral hover:text-white transition-colors"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* 网格选择 */}
                <div>
                  <p className="mb-2 text-sm font-medium text-text">
                    {t("gridSelect")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedGrid("2x2")}
                      className={optionBtn(selectedGrid === "2x2")}
                    >
                      {t("grid2x2")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGrid("3x3")}
                      className={optionBtn(selectedGrid === "3x3")}
                    >
                      {t("grid3x3")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGrid("4x4")}
                      className={optionBtn(selectedGrid === "4x4")}
                    >
                      {t("grid4x4")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGrid("custom")}
                      className={optionBtn(selectedGrid === "custom")}
                    >
                      {t("gridCustom")}
                    </button>
                  </div>
                </div>

                {/* 自定义 rows/cols 输入 */}
                {selectedGrid === "custom" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-text">
                        {t("rows")}
                      </label>
                      <input
                        type="number"
                        min={GRID_MIN}
                        max={GRID_MAX}
                        value={customRows}
                        onChange={(e) =>
                          setCustomRows(clampGrid(Number(e.target.value)))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border bg-bg-article text-text text-sm focus:outline-none focus:border-teal"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-sm font-medium text-text">
                        {t("cols")}
                      </label>
                      <input
                        type="number"
                        min={GRID_MIN}
                        max={GRID_MAX}
                        value={customCols}
                        onChange={(e) =>
                          setCustomCols(clampGrid(Number(e.target.value)))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border bg-bg-article text-text text-sm focus:outline-none focus:border-teal"
                      />
                    </div>
                    <p className="col-span-2 text-xs text-text-secondary">
                      {t("customHint")}
                    </p>
                  </div>
                )}

                {/* 分割预览说明 */}
                <p className="text-center text-xs text-text-secondary">
                  {t("splitPreview", {
                    rows: previewGrid.rows,
                    cols: previewGrid.cols,
                  })}
                </p>

                {/* 分割并下载按钮 */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleSplit}
                    disabled={status === "processing"}
                    className={[
                      "inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-colors",
                      status === "processing"
                        ? "bg-bg-article text-text-secondary cursor-not-allowed"
                        : "bg-teal text-white hover:bg-teal-dark",
                    ].join(" ")}
                  >
                    {status === "processing" ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {t("processing")}
                      </>
                    ) : (
                      <>
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
                        {t("split")}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* 成功状态 */}
        {status === "done" && downloadUrl && (
          <div className="text-center py-12 space-y-6">
            <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-bg">
              <svg
                className="w-6 h-6 text-teal"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-text-secondary">{t("success")}</p>
            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  triggerDownload(downloadUrl, "neetpix-gridsplit.zip")
                }
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal text-white font-semibold text-sm hover:bg-teal-dark transition-colors"
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
                {t("download")}
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 text-sm text-teal hover:underline"
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {t("retry")}
              </button>
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {status === "error" && (
          <div className="text-center py-12">
            <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-coral/10">
              <svg
                className="w-6 h-6 text-coral"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <p className="text-text-secondary mb-6">{errorMsg}</p>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal text-white font-semibold text-sm hover:bg-teal-dark transition-colors"
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {t("retry")}
            </button>
          </div>
        )}

        {/* 错误提示（上传阶段） */}
        {errorMsg && status !== "error" && (
          <p className="text-center text-sm text-coral">{errorMsg}</p>
        )}
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
