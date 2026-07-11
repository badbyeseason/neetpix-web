"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/ui/Logo";
import {
  ocrImage,
  translateText,
  splitIntoSentences,
} from "@/lib/screenshot-translate";

// 处理状态机：idle → ocr → translating → done / error
type Status = "idle" | "ocr" | "translating" | "done" | "error";
// 翻译方向
type Direction = "auto" | "en2zh" | "zh2en";
// 错误阶段
type ErrorStage = "ocr" | "translate" | "empty" | null;

// 单张图片最大尺寸 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// 原文 / 译文对照
interface Pair {
  original: string;
  translated: string;
}

export default function ScreenshotTranslateClient() {
  const t = useTranslations("screenshotTranslate");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [direction, setDirection] = useState<Direction>("auto");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrText, setOcrText] = useState("");
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorStage, setErrorStage] = useState<ErrorStage>(null);
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);

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

  // 根据方向 + 文本内容解析 MyMemory 的 from / to
  const resolveLangPair = useCallback(
    (dir: Direction, text: string): { from: string; to: string } => {
      if (dir === "en2zh") return { from: "en", to: "zh-CN" };
      if (dir === "zh2en") return { from: "zh-CN", to: "en" };
      // 自动检测：按中文字符数 vs 拉丁字母数判断
      const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
      const latin = (text.match(/[a-zA-Z]/g) || []).length;
      return cjk > latin ? { from: "zh-CN", to: "en" } : { from: "en", to: "zh-CN" };
    },
    []
  );

  // 执行翻译（逐句翻译，保证 1:1 对照）
  const runTranslate = useCallback(
    async (text: string, dir: Direction) => {
      setStatus("translating");
      const sentences = splitIntoSentences(text);
      const { from, to } = resolveLangPair(dir, text);
      try {
        const translated = await Promise.all(
          sentences.map((s) => translateText(s, from, to))
        );
        setPairs(
          sentences.map((original, i) => ({
            original,
            translated: translated[i] || "",
          }))
        );
        setStatus("done");
      } catch (e) {
        console.error("Translate error:", e);
        setErrorStage("translate");
        setErrorMsg(t("errorTranslate"));
        setStatus("error");
      }
    },
    [resolveLangPair, t]
  );

  // 处理图片：OCR → 翻译
  const processImage = useCallback(
    async (file: File, dir: Direction) => {
      setStatus("ocr");
      setOcrProgress(0);
      setPairs([]);
      setOcrText("");
      setErrorMsg("");
      setErrorStage(null);
      try {
        const text = await ocrImage(file, (p) => setOcrProgress(p));
        if (!text.trim()) {
          // OCR 无文字
          setErrorStage("empty");
          setStatus("error");
          return;
        }
        setOcrText(text);
        // OCR 完成后自动开始翻译
        await runTranslate(text, dir);
      } catch (e) {
        console.error("OCR error:", e);
        setErrorStage("ocr");
        setErrorMsg(t("errorOcr"));
        setStatus("error");
      }
    },
    [runTranslate, t]
  );

  // 校验并载入图片（等待用户点击翻译）
  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        setErrorMsg(t("errorFormat"));
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setErrorMsg(t("errorSize"));
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
      setErrorMsg("");
      setErrorStage(null);
      setPairs([]);
      setOcrText("");
      setOcrProgress(0);
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

  // 点击翻译按钮：先 OCR 再翻译
  const startTranslate = useCallback(() => {
    if (!fileRef.current) return;
    void processImage(fileRef.current, direction);
  }, [processImage, direction]);

  // 监听粘贴（Ctrl+V / Cmd+V）上传图片
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      // 处理中忽略粘贴
      if (status === "ocr" || status === "translating") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleFile(file);
            break;
          }
        }
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [status, handleFile]);

  // 复制全部译文到剪贴板
  const copyAll = useCallback(async () => {
    const text = pairs.map((p) => p.translated).join("\n");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // 忽略剪贴板错误
    }
  }, [pairs]);

  // 重置回初始上传状态
  const reset = useCallback(() => {
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }
    fileRef.current = null;
    setImageUrl(null);
    setStatus("idle");
    setPairs([]);
    setOcrText("");
    setOcrProgress(0);
    setErrorMsg("");
    setErrorStage(null);
    setCopied(false);
  }, []);

  // 错误重试：根据失败阶段决定重试范围
  const handleErrorRetry = useCallback(() => {
    if (errorStage === "translate" && fileRef.current && ocrText) {
      // 仅重试翻译
      void runTranslate(ocrText, direction);
    } else if (errorStage === "ocr" && fileRef.current) {
      // 重试 OCR + 翻译
      void processImage(fileRef.current, direction);
    } else {
      // 空识别或无文件：回到上传
      reset();
    }
  }, [errorStage, ocrText, direction, runTranslate, processImage, reset]);

  const directionOptions: { value: Direction; key: string }[] = [
    { value: "auto", key: "autoDetect" },
    { value: "en2zh", key: "en2zh" },
    { value: "zh2en", key: "zh2en" },
  ];

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
          {errorMsg && (
            <p className="text-center text-sm text-coral">{errorMsg}</p>
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
              <p className="text-xs text-text-secondary">{t("pasteHint")}</p>
            </div>
          </div>
        </div>
      )}

      {/* 图片已载入，等待翻译 */}
      {status === "idle" && imageUrl && (
        <div className="space-y-6">
          <div className="rounded-xl overflow-hidden border border-border bg-bg-article">
            <img
              src={imageUrl}
              alt="Screenshot"
              className="max-h-80 mx-auto object-contain"
            />
          </div>

          {/* 方向选择 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-secondary">
              {t("direction")}
            </p>
            <div className="flex flex-wrap gap-2">
              {directionOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDirection(opt.value)}
                  className={[
                    "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                    direction === opt.value
                      ? "bg-teal text-white"
                      : "bg-bg-warm text-text-secondary hover:text-text hover:bg-bg-article",
                  ].join(" ")}
                >
                  {t(opt.key)}
                </button>
              ))}
            </div>
          </div>

          {/* 翻译按钮 */}
          <div className="flex justify-center">
            <button
              onClick={startTranslate}
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
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.77 15.61 4.499 18.129"
                />
              </svg>
              {t("translate")}
            </button>
          </div>
        </div>
      )}

      {/* OCR 识别中 */}
      {status === "ocr" && (
        <div className="flex flex-col items-center justify-center py-16 gap-6">
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              className="max-h-40 rounded-lg border border-border object-contain"
            />
          )}
          <div className="w-12 h-12 border-3 border-teal border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-text-secondary font-medium">{t("ocr")}</p>
            <div className="mt-3 w-56 h-1.5 bg-bg-article rounded-full overflow-hidden">
              <div
                className="h-full bg-teal rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.round(ocrProgress * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              {Math.round(ocrProgress * 100)}%
            </p>
          </div>
        </div>
      )}

      {/* 翻译中 */}
      {status === "translating" && (
        <div className="flex flex-col items-center justify-center py-16 gap-6">
          <div className="w-12 h-12 border-3 border-teal border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary font-medium">{t("translating")}</p>
        </div>
      )}

      {/* 错误 */}
      {status === "error" && (
        <div className="space-y-4">
          {/* 翻译失败时，先展示已识别的原文 */}
          {errorStage === "translate" && ocrText && (
            <div className="rounded-xl border border-border bg-bg-warm p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary mb-2">
                {t("original")}
              </div>
              <p className="text-sm text-text leading-relaxed whitespace-pre-wrap break-words">
                {ocrText}
              </p>
            </div>
          )}
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
              {errorStage === "empty" ? t("emptyOcr") : errorMsg}
            </p>
            <button
              onClick={handleErrorRetry}
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
        </div>
      )}

      {/* 完成：逐句对照 */}
      {status === "done" && pairs.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-success">{t("success")}</p>
            <button
              onClick={copyAll}
              className={[
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors",
                copied
                  ? "bg-success text-white"
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
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              {copied ? t("copied") : t("copy")}
            </button>
          </div>

          {/* 逐句对照：左右两列 */}
          <div className="space-y-3">
            {pairs.map((p, i) => (
              <div
                key={i}
                className="grid grid-cols-1 sm:grid-cols-2 rounded-xl border border-border overflow-hidden"
              >
                <div className="p-4 border-b sm:border-b-0 sm:border-r border-border bg-bg-warm">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary mb-1">
                    {t("original")}
                  </div>
                  <p className="text-sm text-text leading-relaxed whitespace-pre-wrap break-words">
                    {p.original}
                  </p>
                </div>
                <div className="p-4 bg-bg-article">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-teal mb-1">
                    {t("translated")}
                  </div>
                  <p className="text-sm text-text leading-relaxed whitespace-pre-wrap break-words">
                    {p.translated}
                  </p>
                </div>
              </div>
            ))}
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
              {t("retry")}
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
