"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PDFDocument, degrees } from "pdf-lib";
import Logo from "@/components/ui/Logo";

type Status = "idle" | "processing" | "done" | "error";
type Position = "center" | "tiled";

const MAX_SIZE = 100 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function PdfWatermarkClient() {
  const t = useTranslations("pdfWatermark");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("CONFIDENTIAL");
  const [position, setPosition] = useState<Position>("center");
  const [opacity, setOpacity] = useState(0.3);
  const [fontSize, setFontSize] = useState(50);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleFile = useCallback(
    (selected: File) => {
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
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
        urlsRef.current = urlsRef.current.filter((u) => u !== downloadUrl);
        setDownloadUrl(null);
      }
    },
    [downloadUrl, t]
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
    setErrorMsg("");
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const applyWatermark = useCallback(async () => {
    if (!file || !text.trim()) return;
    setStatus("processing");
    setErrorMsg("");
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = doc.getPages();

      // 用 Canvas 渲染水印文字为 PNG（浏览器原生支持中文）
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const fontStack = `-apple-system, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif`;
      ctx.font = `bold ${fontSize}px ${fontStack}`;
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      // Canvas 尺寸：文字宽度 + padding，高度 = 字号 * 1.5
      const padding = fontSize * 0.5;
      canvas.width = Math.ceil(textWidth + padding * 2);
      canvas.height = Math.ceil(fontSize * 1.5);
      // 重新设置 font（canvas resize 后需重新设置）
      ctx.font = `bold ${fontSize}px ${fontStack}`;
      ctx.fillStyle = "rgb(128, 128, 128)"; // 灰色水印
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      // 转为 PNG bytes
      const pngBlob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png")
      );
      const pngBytes = await pngBlob.arrayBuffer();
      const embeddedImage = await doc.embedPng(pngBytes);

      for (const page of pages) {
        const { width, height } = page.getSize();

        if (position === "center") {
          // 居中放置，旋转 45 度
          const imgWidth = embeddedImage.width;
          const imgHeight = embeddedImage.height;
          page.drawImage(embeddedImage, {
            x: width / 2 - imgWidth / 2,
            y: height / 2 - imgHeight / 2,
            width: imgWidth,
            height: imgHeight,
            opacity,
            rotate: degrees(45),
          });
        } else {
          // 平铺模式：在页面上以网格形式重复绘制水印
          const imgWidth = embeddedImage.width;
          const imgHeight = embeddedImage.height;
          const stepX = Math.max(imgWidth + fontSize * 2, fontSize * 6);
          const stepY = Math.max(imgHeight + fontSize * 2, fontSize * 4);
          for (let y = -stepY; y < height + stepY; y += stepY) {
            for (let x = -stepX; x < width + stepX; x += stepX) {
              page.drawImage(embeddedImage, {
                x,
                y,
                width: imgWidth,
                height: imgHeight,
                opacity,
                rotate: degrees(45),
              });
            }
          }
        }
      }

      const bytes = await doc.save();
      const out = new Uint8Array(bytes.byteLength);
      out.set(bytes);
      const blob = new Blob([out], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      urlsRef.current.push(url);
      setDownloadUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
          urlsRef.current = urlsRef.current.filter((u) => u !== prev);
        }
        return url;
      });

      const a = document.createElement("a");
      a.href = url;
      a.download = "neetpix-watermarked.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setStatus("done");
    } catch (err) {
      console.error("Watermark error:", err);
      setErrorMsg(t("errorParse"));
      setStatus("error");
    }
  }, [file, text, position, opacity, fontSize, t]);

  const reset = useCallback(() => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      urlsRef.current = urlsRef.current.filter((u) => u !== downloadUrl);
    }
    setDownloadUrl(null);
    setFile(null);
    setStatus("idle");
    setErrorMsg("");
    if (inputRef.current) inputRef.current.value = "";
  }, [downloadUrl]);

  const optionBtn = (active: boolean) =>
    [
      "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
      active
        ? "bg-teal text-white border-teal"
        : "bg-bg-warm text-text-secondary border-border hover:border-teal-light hover:text-text",
    ].join(" ");

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

          {/* 已选文件 + 水印设置 */}
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

              {/* 水印文字 */}
              <div>
                <label className="block mb-2 text-sm font-medium text-text">
                  {t("text")}
                </label>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t("textPlaceholder")}
                  className="w-full rounded-xl border border-border bg-bg-warm px-4 py-3 text-sm text-text placeholder:text-text-secondary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                />
                <p className="mt-2 text-xs text-text-secondary">{t("textHint")}</p>
              </div>

              {/* 位置选择 */}
              <div>
                <p className="mb-2 text-sm font-medium text-text">{t("position")}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPosition("center")}
                    className={optionBtn(position === "center")}
                  >
                    {t("positionCenter")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosition("tiled")}
                    className={optionBtn(position === "tiled")}
                  >
                    {t("positionTiled")}
                  </button>
                </div>
              </div>

              {/* 透明度 + 字号 */}
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="flex items-center justify-between mb-2 text-sm font-medium text-text">
                    <span>{t("opacity")}</span>
                    <span className="text-text-secondary">{Math.round(opacity * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="w-full accent-teal"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-text">
                    {t("fontSize")}
                  </label>
                  <input
                    type="number"
                    min={8}
                    max={200}
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value, 10) || 50)}
                    className="w-full rounded-xl border border-border bg-bg-warm px-4 py-3 text-sm text-text focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={applyWatermark}
                  disabled={!text.trim() || status === "processing"}
                  className={[
                    "inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-colors",
                    !text.trim() || status === "processing"
                      ? "bg-bg-article text-text-secondary cursor-not-allowed"
                      : "bg-teal text-white hover:bg-teal-dark",
                  ].join(" ")}
                >
                  {status === "processing" ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t("applying")}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      {t("apply")}
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

      {/* 完成 */}
      {status === "done" && downloadUrl && (
        <div className="flex flex-col items-center gap-5 py-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-teal-bg">
            <svg className="w-7 h-7 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-text font-medium">{t("success")}</p>
          <a
            href={downloadUrl}
            download="neetpix-watermarked.pdf"
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
