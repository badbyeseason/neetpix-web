"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PDFDocument } from "pdf-lib";
import Logo from "@/components/ui/Logo";
import { trackEvent } from "@/lib/analytics";

type Status = "idle" | "processing" | "done" | "error";

const MAX_SIZE = 100 * 1024 * 1024;

interface SplitResult {
  range: string;
  url: string;
  pageCount: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// 解析页码范围字符串，如 "1-3,5,7-9" → [[0,2],[4],[6,8]]（0-based）
function parseRanges(input: string, total: number): number[][] {
  const parts = input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) throw new Error("empty");

  const result: number[][] = [];
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10);
      if (n < 1 || n > total) throw new Error("out-of-range");
      result.push([n - 1]);
    } else if (/^(\d+)-(\d+)$/.test(part)) {
      const [, aStr, bStr] = part.match(/^(\d+)-(\d+)$/)!;
      const a = parseInt(aStr, 10);
      const b = parseInt(bStr, 10);
      if (a < 1 || b < 1 || a > total || b > total || a > b)
        throw new Error("out-of-range");
      const indices: number[] = [];
      for (let i = a; i <= b; i++) indices.push(i - 1);
      result.push(indices);
    } else {
      throw new Error("invalid");
    }
  }
  return result;
}

export default function PdfSplitClient() {
  const t = useTranslations("pdfSplit");
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [ranges, setRanges] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [results, setResults] = useState<SplitResult[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // 清理所有旧结果的 object URLs（使用函数式更新避免依赖 results）
  const clearResults = useCallback(() => {
    setResults((prev) => {
      prev.forEach((r) => URL.revokeObjectURL(r.url));
      return [];
    });
  }, []);

  const handleFile = useCallback(
    async (selected: File) => {
      const isPdf =
        selected.type === "application/pdf" ||
        selected.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        setErrorMsg(t("errorFormat"));
        setStatus("error");
        return;
      }
      if (selected.size > MAX_SIZE) {
        setErrorMsg(t("errorSize"));
        setStatus("error");
        return;
      }
      setErrorMsg("");
      setFile(selected);
      setStatus("idle");
      clearResults();
      try {
        const buf = await selected.arrayBuffer();
        const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
        setPageCount(doc.getPageCount());
      } catch {
        setErrorMsg(t("errorParse"));
        setStatus("error");
      }
    },
    [t, clearResults]
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

  const removeFile = useCallback(() => {
    setFile(null);
    setPageCount(null);
    setRanges("");
    setErrorMsg("");
    setStatus("idle");
    clearResults();
    if (inputRef.current) inputRef.current.value = "";
  }, [clearResults]);

  const split = useCallback(async () => {
    if (!file || !pageCount) return;
    setStatus("processing");
    setErrorMsg("");
    clearResults();
    try {
      const parsed = parseRanges(ranges, pageCount);
      const srcBuf = await file.arrayBuffer();
      const src = await PDFDocument.load(srcBuf, { ignoreEncryption: true });

      const newResults: SplitResult[] = [];
      for (const indices of parsed) {
        const out = await PDFDocument.create();
        const pages = await out.copyPages(src, indices);
        pages.forEach((p) => out.addPage(p));
        const bytes = await out.save();
        const copy = new Uint8Array(bytes.byteLength);
        copy.set(bytes);
        const blob = new Blob([copy], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        urlsRef.current.push(url);
        const rangeLabel =
          indices.length === 1
            ? `${indices[0] + 1}`
            : `${indices[0] + 1}-${indices[indices.length - 1] + 1}`;
        newResults.push({ range: rangeLabel, url, pageCount: indices.length });
      }
      // 替换为新结果前，先 revoke 旧结果的 object URLs
      setResults((prev) => {
        prev.forEach((r) => URL.revokeObjectURL(r.url));
        return newResults;
      });
      setStatus("done");
    } catch (err) {
      console.error("Split error:", err);
      const msg = err instanceof Error ? err.message : "";
      if (msg === "out-of-range" || msg === "invalid" || msg === "empty") {
        setErrorMsg(t("errorRanges"));
      } else {
        setErrorMsg(t("errorParse"));
      }
      setStatus("error");
    }
  }, [file, pageCount, ranges, t, clearResults]);

  const reset = useCallback(() => {
    results.forEach((r) => {
      URL.revokeObjectURL(r.url);
      urlsRef.current = urlsRef.current.filter((u) => u !== r.url);
    });
    setResults([]);
    setStatus("idle");
    setErrorMsg("");
  }, [results]);

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

      {(status === "idle" || status === "processing") && (
        <div className="space-y-6">
          {/* 上传区域 */}
          {!file && (
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 0V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
                </svg>
                <p className="text-base font-medium text-text">{t("upload")}</p>
                <p className="text-sm text-text-secondary">{t("uploadHint")}</p>
              </div>
            </div>
          )}

          {/* 已选文件 + 范围输入 */}
          {file && (
            <div className="space-y-5">
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
                  <p className="text-xs text-text-secondary mt-0.5">
                    {formatFileSize(file.size)}
                    {pageCount !== null && (
                      <span className="ml-2">· {t("pages", { count: pageCount })}</span>
                    )}
                  </p>
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

              {/* 页码范围输入 */}
              <div>
                <label className="block mb-2 text-sm font-medium text-text">
                  {t("ranges")}
                </label>
                <input
                  type="text"
                  value={ranges}
                  onChange={(e) => setRanges(e.target.value)}
                  placeholder={t("rangesPlaceholder")}
                  className="w-full rounded-xl border border-border bg-bg-warm px-4 py-3 text-sm text-text placeholder:text-text-secondary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                />
                <p className="mt-2 text-xs text-text-secondary">{t("rangesHint")}</p>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={split}
                  disabled={!ranges.trim() || status === "processing"}
                  className={[
                    "inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-colors",
                    !ranges.trim() || status === "processing"
                      ? "bg-bg-article text-text-secondary cursor-not-allowed"
                      : "bg-teal text-white hover:bg-teal-dark",
                  ].join(" ")}
                >
                  {status === "processing" ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t("splitting")}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 5h8m-8 5h8M4 5v14a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2z" />
                      </svg>
                      {t("split")}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="text-center text-sm text-coral">{errorMsg}</p>
          )}
        </div>
      )}

      {/* 成功状态：多个下载链接 */}
      {status === "done" && results.length > 0 && (
        <div className="py-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="mb-2 inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-bg">
              <svg className="w-6 h-6 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-text-secondary">{t("success")}</p>
          </div>
          <div className="space-y-3">
            {results.map((r, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-bg-warm p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">
                    {t("resultItem", { range: r.range, count: r.pageCount })}
                  </p>
                </div>
                <a
                  href={r.url}
                  download={`neetpix-split-${r.range}.pdf`}
                  onClick={() => trackEvent("tool-used", { toolKey: "pdfSplit" })}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal text-white font-semibold text-sm hover:bg-teal-dark transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {t("download")}
                </a>
              </div>
            ))}
          </div>
          <div className="flex justify-center">
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
        </div>
      )}

      {/* 错误状态 */}
      {status === "error" && (
        <div className="text-center py-12">
          <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-coral/10">
            <svg className="w-6 h-6 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-text-secondary mb-6">{errorMsg}</p>
          <button
            onClick={() => {
              setErrorMsg("");
              setStatus("idle");
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal text-white font-semibold text-sm hover:bg-teal-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
