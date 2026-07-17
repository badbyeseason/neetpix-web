"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/ui/Logo";
import { recognizeText, type OcrLang } from "@/lib/image-ocr";

// 处理状态机：idle → processing → done / error
type Status = "idle" | "processing" | "done" | "error";
// 运行时错误类型（parse：识别抛错；noText：未识别到文字）
type ErrorKind = "parse" | "noText" | null;

// 单张图片最大尺寸 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// 语言选项：value 对应 tesseract.js 语言包
const LANG_OPTIONS: {
  value: OcrLang;
  key: "langChsEng" | "langEng" | "langJpn";
}[] = [
  { value: "chi_sim+eng", key: "langChsEng" },
  { value: "eng", key: "langEng" },
  { value: "jpn", key: "langJpn" },
];

export default function ImageOcrClient() {
  const t = useTranslations("imageOcr");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [lang, setLang] = useState<OcrLang>("chi_sim+eng");
  const [resultText, setResultText] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // 上传校验错误（format / size），内联显示在上传区上方
  const [uploadError, setUploadError] = useState("");
  // 运行时错误类型（parse / noText），决定错误屏内容
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  // 当前待处理文件（不参与渲染，用 ref 存取）
  const fileRef = useRef<File | null>(null);
  // 当前预览图的 object URL，便于释放
  const imageUrlRef = useRef<string | null>(null);

  // 组件卸载时统一释放 object URL，避免内存泄漏
  useEffect(() => {
    return () => {
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
        imageUrlRef.current = null;
      }
    };
  }, []);

  // 校验并载入图片
  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        setUploadError(t("errorFormat"));
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(t("errorSize"));
        return;
      }
      // 释放旧预览 URL
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      imageUrlRef.current = url;
      fileRef.current = file;
      setImageUrl(url);
      setStatus("idle");
      setUploadError("");
      setErrorKind(null);
      setResultText("");
      setCopied(false);
    },
    [t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  // 点击识别按钮：调用 tesseract.js
  const startRecognize = useCallback(async () => {
    const file = fileRef.current;
    if (!file) return;
    setStatus("processing");
    setErrorKind(null);
    setResultText("");
    setCopied(false);
    try {
      const text = await recognizeText(file, lang);
      if (!text) {
        // 未识别到文字
        setErrorKind("noText");
        setStatus("error");
        return;
      }
      setResultText(text);
      setStatus("done");
    } catch (e) {
      console.error("OCR error:", e);
      setErrorKind("parse");
      setStatus("error");
    }
  }, [lang]);

  // 复制识别结果到剪贴板
  const copyResult = useCallback(async () => {
    if (!resultText) return;
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 忽略剪贴板错误
    }
  }, [resultText]);

  // 重置回初始上传状态
  const reset = useCallback(() => {
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }
    fileRef.current = null;
    setImageUrl(null);
    setStatus("idle");
    setResultText("");
    setErrorKind(null);
    setUploadError("");
    setCopied(false);
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

      {/* 上传区域（无图片时） */}
      {status === "idle" && !imageUrl && (
        <div className="space-y-3">
          {uploadError && (
            <p className="text-center text-sm text-coral">{uploadError}</p>
          )}
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
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
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
        </div>
      )}

      {/* 图片已载入，等待识别 */}
      {status === "idle" && imageUrl && (
        <div className="space-y-6">
          <div className="relative rounded-xl overflow-hidden border border-border bg-bg-article">
            <img
              src={imageUrl}
              alt="Upload"
              className="max-h-80 mx-auto object-contain"
            />
            <button
              onClick={reset}
              aria-label={t("remove")}
              title={t("remove")}
              className="absolute top-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
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

          {/* 语言选择 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-secondary">
              {t("language")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLang(opt.value)}
                  className={[
                    "px-3 py-2 rounded-xl text-sm font-medium transition-colors border",
                    lang === opt.value
                      ? "border-teal bg-teal/10 text-teal"
                      : "border-border bg-bg-warm text-text-secondary hover:text-text hover:border-teal-light",
                  ].join(" ")}
                >
                  {t(opt.key)}
                </button>
              ))}
            </div>
          </div>

          {/* 识别按钮 */}
          <div className="flex justify-center">
            <button
              onClick={startRecognize}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-coral text-white font-semibold text-sm hover:bg-coral-light transition-colors"
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {t("recognize")}
            </button>
          </div>
        </div>
      )}

      {/* 识别中 */}
      {status === "processing" && (
        <div className="flex flex-col items-center justify-center py-16 gap-6">
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              className="max-h-40 rounded-lg border border-border object-contain"
            />
          )}
          <div className="w-12 h-12 border-3 border-teal border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary font-medium">{t("recognizing")}</p>
        </div>
      )}

      {/* 错误 / 无文字 */}
      {status === "error" && (
        <div className="space-y-4">
          <div className="text-center py-6">
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
            <p className="text-text-secondary mb-6">
              {errorKind === "noText" ? t("noText") : t("errorParse")}
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={startRecognize}
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
                {t("recognize")}
              </button>
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-bg-warm text-text-secondary font-semibold text-sm hover:text-text hover:bg-bg-article transition-colors border border-border"
              >
                {t("remove")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 完成：识别结果 */}
      {status === "done" && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-success">{t("success")}</p>
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">
              {t("result")}
            </p>
            <div className="relative">
              <textarea
                readOnly
                value={resultText}
                placeholder={t("resultPlaceholder")}
                className="w-full h-64 p-4 pr-20 rounded-xl border border-border bg-bg-article text-sm text-text leading-relaxed resize-y focus:outline-none focus:border-teal"
              />
              <button
                onClick={copyResult}
                className={[
                  "absolute top-2 right-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border",
                  copied
                    ? "bg-success text-white border-success"
                    : "bg-bg-warm text-text border-border hover:border-teal-light",
                ].join(" ")}
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                {copied ? t("copied") : t("copy")}
              </button>
            </div>
          </div>

          <div className="flex justify-center">
            <button
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
              {t("remove")}
            </button>
          </div>
        </div>
      )}

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
