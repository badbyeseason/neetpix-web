"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PDFDocument } from "pdf-lib";
import Logo from "@/components/ui/Logo";
import { trackEvent } from "@/lib/analytics";

type Status = "idle" | "processing" | "done" | "error";

interface PdfItem {
  id: string;
  file: File;
  pageCount: number | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export default function PdfMergeClient() {
  const t = useTranslations("pdfMerge");
  const [items, setItems] = useState<PdfItem[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const loadPageCount = useCallback(async (file: File): Promise<number> => {
    const buf = await file.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    return doc.getPageCount();
  }, []);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter(
        (f) =>
          f.type === "application/pdf" ||
          f.name.toLowerCase().endsWith(".pdf")
      );
      if (files.length === 0) {
        setErrorMsg(t("errorFormat"));
        return;
      }
      let firstError = "";
      const validFiles: File[] = [];
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          firstError = firstError || t("errorSize");
          continue;
        }
        validFiles.push(file);
      }
      setErrorMsg(firstError);
      if (validFiles.length === 0) {
        return;
      }
      const newItems: PdfItem[] = validFiles.map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`,
        file,
        pageCount: null,
      }));
      setItems((prev) => [...prev, ...newItems]);

      for (const item of newItems) {
        try {
          const count = await loadPageCount(item.file);
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, pageCount: count } : it
            )
          );
        } catch {
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, pageCount: 0 } : it
            )
          );
        }
      }
    },
    [loadPageCount, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const moveItem = useCallback((index: number, direction: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const merge = useCallback(async () => {
    if (items.length < 2) return;
    setStatus("processing");
    setErrorMsg("");
    try {
      const outDoc = await PDFDocument.create();
      for (const item of items) {
        const buf = await item.file.arrayBuffer();
        const src = await PDFDocument.load(buf, { ignoreEncryption: true });
        const pages = await outDoc.copyPages(src, src.getPageIndices());
        pages.forEach((p) => outDoc.addPage(p));
      }
      const bytes = await outDoc.save();
      const out = new Uint8Array(bytes.byteLength);
      out.set(bytes);
      const blob = new Blob([out], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      urlsRef.current.push(url);
      setResultUrl(url);

      const a = document.createElement("a");
      a.href = url;
      a.download = "neetpix-merged.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      trackEvent("tool-used", { toolKey: "pdfMerge" });
      setStatus("done");
    } catch (err) {
      console.error("Merge error:", err);
      setErrorMsg(t("errorFormat"));
      setStatus("error");
    }
  }, [items, t]);

  const reset = useCallback(() => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      urlsRef.current = urlsRef.current.filter((u) => u !== resultUrl);
    }
    setResultUrl(null);
    setStatus("idle");
    setErrorMsg("");
  }, [resultUrl]);

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
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
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
                  d="M9 13h6m-3-3v6m-9 0V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-base font-medium text-text">{t("upload")}</p>
              <p className="text-sm text-text-secondary">{t("uploadHint")}</p>
            </div>
          </div>

          {errorMsg && (
            <p className="text-center text-sm text-coral">{errorMsg}</p>
          )}

          {/* 文件列表 */}
          {items.length > 0 && (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-bg-warm p-4 flex items-center gap-3"
                >
                  <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal/10 text-teal text-xs font-semibold">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium text-text truncate"
                      title={item.file.name}
                    >
                      {item.file.name}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {formatFileSize(item.file.size)}
                      {item.pageCount !== null && (
                        <span className="ml-2">
                          · {t("pages", { count: item.pageCount })}
                        </span>
                      )}
                      {item.pageCount === null && (
                        <span className="ml-2">· {t("loadingPages")}</span>
                      )}
                    </p>
                  </div>
                  {/* 排序按钮 */}
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      aria-label={t("moveUp")}
                      className="w-6 h-5 flex items-center justify-center text-text-secondary hover:text-teal disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 1)}
                      disabled={index === items.length - 1}
                      aria-label={t("moveDown")}
                      className="w-6 h-5 flex items-center justify-center text-text-secondary hover:text-teal disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {/* 删除 */}
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={t("remove")}
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-coral hover:bg-coral/10 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 合并按钮 */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={merge}
              disabled={items.length < 2 || status === "processing"}
              className={[
                "inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-colors",
                items.length < 2 || status === "processing"
                  ? "bg-bg-article text-text-secondary cursor-not-allowed"
                  : "bg-teal text-white hover:bg-teal-dark",
              ].join(" ")}
            >
              {status === "processing" ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t("merging")}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {t("merge")}
                </>
              )}
            </button>
            {items.length < 2 && items.length > 0 && (
              <p className="text-xs text-text-secondary">{t("minHint")}</p>
            )}
          </div>
        </div>
      )}

      {/* 成功状态 */}
      {status === "done" && resultUrl && (
        <div className="text-center py-12 space-y-6">
          <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-bg">
            <svg className="w-6 h-6 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-text-secondary">{t("success")}</p>
          <div className="flex flex-col items-center gap-4">
            <a
              href={resultUrl}
              download="neetpix-merged.pdf"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal text-white font-semibold text-sm hover:bg-teal-dark transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t("download")}
            </a>
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
