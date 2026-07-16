"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/ui/Logo";
import { rotatePdf } from "@/lib/pdf-rotate";

type Status = "idle" | "processing" | "done" | "error";
type Angle = 90 | 180 | 270;
type ApplyMode = "all" | "pages";

// 文件大小上限：50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// 将字节数格式化为 KB / MB 显示
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function PdfRotateClient() {
  const t = useTranslations("pdfRotate");
  const [file, setFile] = useState<File | null>(null);
  const [angle, setAngle] = useState<Angle>(90);
  const [applyMode, setApplyMode] = useState<ApplyMode>("all");
  const [pagesInput, setPagesInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // 跟踪所有创建的 Object URL，组件卸载时统一释放
  const urlsRef = useRef<string[]>([]);

  // 组件卸载时释放所有创建的 Object URL
  // 捕获 ref.current 到局部变量，避免 cleanup 时 ref 已变更（同 array 引用，push 可见）
  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // 校验并设置选中的文件
  const handleFile = useCallback(
    (selected: File) => {
      // 格式校验：仅支持 .pdf
      const isPdf =
        selected.type === "application/pdf" ||
        selected.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        setErrorMsg(t("errorFormat"));
        setStatus("error");
        return;
      }
      // 大小校验：≤ 50MB
      if (selected.size > MAX_FILE_SIZE) {
        setErrorMsg(t("errorSize"));
        setStatus("error");
        return;
      }
      setErrorMsg("");
      setFile(selected);
      setApplyMode("all");
      setPagesInput("");
      setStatus("idle");
    },
    [t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  // 移除已选文件，回到上传区域
  const removeFile = useCallback(() => {
    setFile(null);
    setApplyMode("all");
    setPagesInput("");
    setErrorMsg("");
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  // 可旋转条件：文件存在 + (全部页面模式 或 页码输入非空)
  const canRotate =
    !!file && (applyMode === "all" || pagesInput.trim().length > 0);

  // 执行 PDF 旋转
  const rotate = useCallback(async () => {
    if (!file) return;
    setStatus("processing");
    setErrorMsg("");
    try {
      const blob = await rotatePdf(
        file,
        angle,
        applyMode === "all" ? "all" : pagesInput
      );
      const url = URL.createObjectURL(blob);
      urlsRef.current.push(url);
      // 自动触发下载
      const a = document.createElement("a");
      a.href = url;
      a.download = "neetpix-rotated.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // 保留下载链接，便于用户手动重新下载
      setDownloadUrl(url);
      setStatus("done");
    } catch (err) {
      console.error("Rotate error:", err);
      const msg = err instanceof Error ? err.message : "";
      // 页码格式无效或超出范围均映射为 errorPages
      if (msg === "invalid-pages" || msg === "out-of-range") {
        setErrorMsg(t("errorPages"));
      } else {
        setErrorMsg(t("errorParse"));
      }
      setStatus("error");
    }
  }, [file, angle, applyMode, pagesInput, t]);

  // 重置全部状态，回到初始上传界面
  const reset = useCallback(() => {
    setFile(null);
    setAngle(90);
    setApplyMode("all");
    setPagesInput("");
    setErrorMsg("");
    setDownloadUrl(null);
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  return (
    <div>
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

      {/* 上传区域：未选文件时显示 */}
      {status === "idle" && !file && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={[
            "border-2 border-dashed rounded-2xl p-12 sm:p-16 text-center cursor-pointer transition-all",
            dragOver
              ? "border-teal bg-teal-bg"
              : "border-border hover:border-teal-light hover:bg-bg-warm",
          ].join(" ")}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) handleFile(selected);
            }}
          />
          <div className="flex flex-col items-center gap-3">
            <svg className="w-10 h-10 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-base font-medium text-text">{t("upload")}</p>
            <p className="text-sm text-text-secondary">{t("uploadHint")}</p>
          </div>
        </div>
      )}

      {/* 已选文件信息 + 角度选择 + 应用范围 + 旋转按钮 */}
      {status === "idle" && file && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-bg-warm p-5 flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-coral/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text-secondary">{t("fileLabel")}</p>
              <p className="text-sm font-semibold text-text truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">{formatFileSize(file.size)}</p>
            </div>
            <button
              onClick={removeFile}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-coral hover:bg-coral/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 旋转角度选择 */}
          <div>
            <label className="block mb-2 text-sm font-medium text-text">
              {t("angle")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([90, 180, 270] as Angle[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAngle(a)}
                  className={[
                    "px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    angle === a
                      ? "bg-teal text-white"
                      : "bg-bg-warm text-text-secondary hover:bg-bg-article",
                  ].join(" ")}
                >
                  {t(a === 90 ? "angle90" : a === 180 ? "angle180" : "angle270")}
                </button>
              ))}
            </div>
          </div>

          {/* 应用范围选择 */}
          <div>
            <label className="block mb-2 text-sm font-medium text-text">
              {t("applyTo")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setApplyMode("all")}
                className={[
                  "px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  applyMode === "all"
                    ? "bg-teal text-white"
                    : "bg-bg-warm text-text-secondary hover:bg-bg-article",
                ].join(" ")}
              >
                {t("applyAll")}
              </button>
              <button
                type="button"
                onClick={() => setApplyMode("pages")}
                className={[
                  "px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  applyMode === "pages"
                    ? "bg-teal text-white"
                    : "bg-bg-warm text-text-secondary hover:bg-bg-article",
                ].join(" ")}
              >
                {t("applyPages")}
              </button>
            </div>
            {applyMode === "pages" && (
              <div className="mt-3">
                <input
                  type="text"
                  value={pagesInput}
                  onChange={(e) => setPagesInput(e.target.value)}
                  placeholder={t("pagesPlaceholder")}
                  className="w-full rounded-xl border border-border bg-bg-warm px-4 py-3 text-sm text-text placeholder:text-text-secondary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                />
                <p className="mt-2 text-xs text-text-secondary">{t("pagesHint")}</p>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={rotate}
              disabled={!canRotate}
              className={[
                "inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-colors",
                !canRotate
                  ? "bg-bg-article text-text-secondary cursor-not-allowed"
                  : "bg-teal text-white hover:bg-teal-dark",
              ].join(" ")}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t("rotate")}
            </button>
          </div>

          {errorMsg && (
            <p className="text-center text-sm text-coral">{errorMsg}</p>
          )}
        </div>
      )}

      {/* 处理中：加载动画 */}
      {status === "processing" && (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="w-12 h-12 border-3 border-teal border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary font-medium">{t("rotating")}</p>
        </div>
      )}

      {/* 错误：提示 + 重试 */}
      {status === "error" && (
        <div className="text-center py-12">
          <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-coral/10">
            <svg className="w-6 h-6 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-text-secondary mb-6">{errorMsg}</p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal text-white font-semibold text-sm hover:bg-teal-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t("retry")}
          </button>
        </div>
      )}

      {/* 完成：成功提示 + 下载 + 重试 */}
      {status === "done" && (
        <div className="flex flex-col items-center gap-5 py-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-teal-bg">
            <svg className="w-7 h-7 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-text font-medium">{t("success")}</p>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download="neetpix-rotated.pdf"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal text-white font-semibold text-sm hover:bg-teal-dark transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t("download")}
            </a>
          )}
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 text-sm text-teal hover:underline"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t("retry")}
          </button>
        </div>
      )}

      {/* 隐私提示 */}
      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-text-secondary">
        <svg className="w-4 h-4 text-teal-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        {t("privacy")}
      </div>
    </div>
  );
}
