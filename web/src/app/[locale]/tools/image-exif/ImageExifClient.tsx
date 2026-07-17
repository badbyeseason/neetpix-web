"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/ui/Logo";
import { parseExif, stripExif, type ExifData } from "@/lib/image-exif";
import { formatBytes } from "@/lib/image-watermark";

// 单张图片最大尺寸 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

type Mode = "view" | "strip";
type Status = "idle" | "parsing" | "stripping" | "done" | "error";

interface StripResult {
  url: string;
  blob: Blob;
  strippedCount: number;
}

// 根据原始文件名与输出 mime 生成下载文件名
function getDownloadName(originalName: string, isJpeg: boolean): string {
  const baseName = originalName.replace(/\.[^.]+$/, "");
  const ext = isJpeg ? "jpg" : "png";
  return `${baseName}-no-exif.${ext}`;
}

export default function ImageExifClient() {
  const t = useTranslations("imageExif");
  const [mode, setMode] = useState<Mode>("view");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [exifData, setExifData] = useState<ExifData | null>(null);
  const [stripResult, setStripResult] = useState<StripResult | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  // 记录所有需清理的 object URL，组件卸载时统一释放
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const isProcessing = status === "parsing" || status === "stripping";

  // 释放并清空当前文件相关状态
  const resetFileState = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      urlsRef.current = urlsRef.current.filter((u) => u !== previewUrl);
    }
    if (stripResult) {
      URL.revokeObjectURL(stripResult.url);
      urlsRef.current = urlsRef.current.filter((u) => u !== stripResult.url);
    }
    setFile(null);
    setPreviewUrl("");
    setExifData(null);
    setStripResult(null);
    setStatus("idle");
    setErrorMsg("");
  }, [previewUrl, stripResult]);

  // 处理上传文件：校验 → 解析 EXIF
  const handleFile = useCallback(
    async (f: File) => {
      if (!f.type.startsWith("image/")) {
        setErrorMsg(t("errorFormat"));
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        setErrorMsg(t("errorSize"));
        return;
      }

      // 清空旧状态
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        urlsRef.current = urlsRef.current.filter((u) => u !== previewUrl);
      }
      if (stripResult) {
        URL.revokeObjectURL(stripResult.url);
        urlsRef.current = urlsRef.current.filter((u) => u !== stripResult.url);
      }

      const url = URL.createObjectURL(f);
      urlsRef.current.push(url);
      setFile(f);
      setPreviewUrl(url);
      setExifData(null);
      setStripResult(null);
      setErrorMsg("");
      setStatus("parsing");

      try {
        const data = await parseExif(f);
        setExifData(data);
        setStatus("idle");
      } catch {
        setStatus("error");
        setErrorMsg(t("errorParse"));
      }
    },
    [t, previewUrl, stripResult]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  // 切换模式：保留文件与解析结果，仅清空剥离结果
  const switchMode = useCallback((next: Mode) => {
    setMode((prev) => {
      if (prev === next) return prev;
      if (stripResult) {
        URL.revokeObjectURL(stripResult.url);
        urlsRef.current = urlsRef.current.filter((u) => u !== stripResult.url);
      }
      setStripResult(null);
      setStatus("idle");
      setErrorMsg("");
      return next;
    });
  }, [stripResult]);

  // 执行剥离
  const handleStrip = useCallback(async () => {
    if (!file) return;
    // 清空旧剥离结果
    if (stripResult) {
      URL.revokeObjectURL(stripResult.url);
      urlsRef.current = urlsRef.current.filter((u) => u !== stripResult.url);
    }
    setStripResult(null);
    setErrorMsg("");
    setStatus("stripping");

    try {
      const { blob, strippedCount } = await stripExif(file);
      const url = URL.createObjectURL(blob);
      urlsRef.current.push(url);
      setStripResult({ url, blob, strippedCount });
      setStatus("done");
    } catch {
      setStatus("error");
      setErrorMsg(t("errorParse"));
    }
  }, [file, stripResult, t]);

  // 触发下载
  const handleDownload = useCallback(() => {
    if (!stripResult || !file) return;
    const a = document.createElement("a");
    a.href = stripResult.url;
    a.download = getDownloadName(
      file.name,
      stripResult.blob.type === "image/jpeg"
    );
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [stripResult, file]);

  // EXIF 表格行
  const renderRow = (label: string, value: string | number) => (
    <div className="flex justify-between border-b border-border py-2">
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd className="text-sm font-medium text-text text-right ml-4 break-all">
        {value}
      </dd>
    </div>
  );

  // 是否有任意 EXIF 字段可展示
  const hasExifFields = !!(
    exifData &&
    (exifData.cameraModel ||
      exifData.lens ||
      exifData.aperture ||
      exifData.shutter ||
      exifData.iso ||
      exifData.gps ||
      exifData.captureTime)
  );

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
        {/* 模式切换 */}
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => switchMode("view")}
            className={[
              "px-6 py-2.5 rounded-full text-sm font-medium transition-colors border",
              mode === "view"
                ? "bg-teal text-white border-teal"
                : "bg-bg-warm text-text-secondary border-border hover:border-teal-light hover:text-text",
            ].join(" ")}
          >
            {t("viewMode")}
          </button>
          <button
            type="button"
            onClick={() => switchMode("strip")}
            className={[
              "px-6 py-2.5 rounded-full text-sm font-medium transition-colors border",
              mode === "strip"
                ? "bg-teal text-white border-teal"
                : "bg-bg-warm text-text-secondary border-border hover:border-teal-light hover:text-text",
            ].join(" ")}
          >
            {t("stripMode")}
          </button>
        </div>

        {/* 上传区域（无文件时显示） */}
        {!file && (
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
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
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
              <p className="text-base font-medium text-text">{t("upload")}</p>
              <p className="text-sm text-text-secondary">{t("uploadHint")}</p>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {errorMsg && (
          <p className="text-center text-sm text-coral">{errorMsg}</p>
        )}

        {/* 处理中状态 */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
            <span className="w-4 h-4 border-2 border-teal border-t-transparent rounded-full animate-spin" />
            {t("stripping")}
          </div>
        )}

        {/* 文件已加载：预览 + 结果 */}
        {file && !isProcessing && (
          <>
            {/* 文件信息条 */}
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
                {exifData && (
                  <p className="mt-1 text-xs text-text-secondary">
                    {exifData.dimensions.width} × {exifData.dimensions.height} ·{" "}
                    {formatBytes(exifData.fileSize)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={resetFileState}
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

            {/* 查看模式 */}
            {mode === "view" && exifData && (
              <>
                {exifData.gps && (
                  <div className="bg-coral/10 text-coral rounded-lg p-3 text-sm">
                    {t("gpsWarning")}
                  </div>
                )}

                {hasExifFields ? (
                  <dl className="rounded-xl border border-border bg-bg-article p-4">
                    {exifData.cameraModel &&
                      renderRow(t("cameraModel"), exifData.cameraModel)}
                    {exifData.lens && renderRow(t("lens"), exifData.lens)}
                    {exifData.aperture &&
                      renderRow(t("aperture"), exifData.aperture)}
                    {exifData.shutter && renderRow(t("shutter"), exifData.shutter)}
                    {exifData.iso !== undefined &&
                      renderRow(t("iso"), exifData.iso)}
                    {exifData.captureTime &&
                      renderRow(t("captureTime"), exifData.captureTime)}
                    {exifData.gps &&
                      renderRow(
                        t("gps"),
                        `${exifData.gps.latitude.toFixed(6)}, ${exifData.gps.longitude.toFixed(6)}`
                      )}
                    {renderRow(
                      t("dimensions"),
                      `${exifData.dimensions.width} × ${exifData.dimensions.height}`
                    )}
                    {renderRow(t("fileSize"), formatBytes(exifData.fileSize))}
                  </dl>
                ) : (
                  <p className="text-center text-sm text-text-secondary py-6">
                    {t("noExif")}
                  </p>
                )}
              </>
            )}

            {/* 剥离模式 */}
            {mode === "strip" && exifData && (
              <div className="rounded-xl border border-border bg-bg-article p-4 space-y-4">
                {status === "done" && stripResult ? (
                  <>
                    <div className="bg-teal/10 text-teal rounded-lg p-3 text-sm">
                      {t("success", { count: stripResult.strippedCount })}
                    </div>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-teal text-white font-semibold text-sm hover:bg-teal-dark transition-colors"
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
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-center text-sm text-text">
                      {t("fieldCount", { count: exifData.fieldCount })}
                    </p>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={handleStrip}
                        disabled={exifData.fieldCount === 0}
                        className={[
                          "inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors",
                          exifData.fieldCount === 0
                            ? "bg-bg-warm text-text-secondary cursor-not-allowed"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        {t("strip")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
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
