"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/ui/Logo";
import {
  convertImage,
  downloadZip,
  formatBytes,
  getOutputName,
  isAvifSupported,
  isHeicFile,
  type TargetFormat,
} from "@/lib/image-convert";
import { trackEvent } from "@/lib/analytics";
import { addRecentTool } from "@/hooks/useRecentTools";

// 单张图片最大尺寸 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// 单张图片信息
interface ImageItem {
  id: string;
  file: File;
  previewUrl: string; // 原图预览 url
  result?: { blob: Blob; url: string; name: string };
  error?: string;
}

type Status = "idle" | "processing" | "done" | "error";

const FORMAT_OPTIONS: {
  value: TargetFormat;
  labelKey: "formatJpg" | "formatPng" | "formatWebp" | "formatAvif";
}[] = [
  { value: "jpeg", labelKey: "formatJpg" },
  { value: "png", labelKey: "formatPng" },
  { value: "webp", labelKey: "formatWebp" },
  { value: "avif", labelKey: "formatAvif" },
];

// 取文件扩展名（小写，无点）
function getExt(name: string): string {
  const m = name.toLowerCase().match(/\.([^.]+)$/);
  return m ? m[1] : "";
}

export default function ImageConvertClient() {
  const t = useTranslations("imageConvert");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [targetFormat, setTargetFormat] = useState<TargetFormat>("jpeg");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  // 惰性初始化检测 AVIF 编码支持（SSR 安全：服务端返回 false）
  const [avifSupported] = useState(() => isAvifSupported());

  const inputRef = useRef<HTMLInputElement>(null);
  // 记录所有需清理的 object URL（原图预览 + 转换结果）
  const previewUrlsRef = useRef<string[]>([]);
  const resultUrlsRef = useRef<string[]>([]);
  // 始终保持最新的 images 引用，供异步转换回调读取
  const imagesRef = useRef<ImageItem[]>([]);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // 组件卸载时统一释放所有 object URL，避免内存泄漏
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      resultUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const avifBlocked = targetFormat === "avif" && !avifSupported;

  // 清除已有转换结果（切换格式 / 追加文件时调用）
  const clearResults = useCallback(() => {
    imagesRef.current.forEach((item) => {
      if (item.result) URL.revokeObjectURL(item.result.url);
    });
    resultUrlsRef.current = [];
    setImages((prev) =>
      prev.map((item) =>
        item.result || item.error
          ? { ...item, result: undefined, error: undefined }
          : item
      )
    );
    setStatus("idle");
    setErrorMsg("");
  }, []);

  // 校验并追加多张图片
  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      const validItems: ImageItem[] = [];
      let firstError = "";

      for (const file of files) {
        const isImage = file.type.startsWith("image/") || isHeicFile(file);
        if (!isImage) {
          firstError = firstError || t("errorFormat");
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          firstError = firstError || t("errorSize");
          continue;
        }
        const previewUrl = URL.createObjectURL(file);
        previewUrlsRef.current.push(previewUrl);
        validItems.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,
          file,
          previewUrl,
        });
      }

      if (validItems.length > 0) {
        // 追加新文件后，旧结果失效
        imagesRef.current.forEach((item) => {
          if (item.result) URL.revokeObjectURL(item.result.url);
        });
        resultUrlsRef.current = [];
        setImages((prev) => [
          ...prev.map((item) =>
            item.result || item.error
              ? { ...item, result: undefined, error: undefined }
              : item
          ),
          ...validItems,
        ]);
        setStatus("idle");
        setErrorMsg("");
      }
      if (firstError) setErrorMsg(firstError);
    },
    [t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        e.preventDefault();
        setDragOver(false);
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

  // 切换目标格式：清空旧结果
  const handleFormatChange = useCallback(
    (fmt: TargetFormat) => {
      if (fmt === targetFormat) return;
      setTargetFormat(fmt);
      clearResults();
    },
    [targetFormat, clearResults]
  );

  // 删除指定图片，并释放其 object URL
  const removeImage = useCallback((id: string) => {
    const target = imagesRef.current.find((item) => item.id === id);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
      previewUrlsRef.current = previewUrlsRef.current.filter(
        (u) => u !== target.previewUrl
      );
      if (target.result) {
        URL.revokeObjectURL(target.result.url);
        resultUrlsRef.current = resultUrlsRef.current.filter(
          (u) => u !== target.result!.url
        );
      }
    }
    setImages((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // 单张下载
  const downloadOne = useCallback((item: ImageItem) => {
    if (!item.result) return;
    const a = document.createElement("a");
    a.href = item.result.url;
    a.download = item.result.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    trackEvent("tool-used", { toolKey: "imageConvert" });
    addRecentTool("imageConvert");
  }, []);

  // 批量下载（ZIP）
  const handleDownloadAll = useCallback(async () => {
    const items = imagesRef.current.filter((i) => i.result);
    if (items.length === 0) return;
    await downloadZip(
      items.map((i) => ({ name: i.result!.name, blob: i.result!.blob }))
    );
    trackEvent("tool-used", { toolKey: "imageConvert" });
    addRecentTool("imageConvert");
  }, []);

  // 批量转换所有图片
  const handleConvert = useCallback(async () => {
    const current = imagesRef.current;
    if (current.length === 0) return;
    if (targetFormat === "avif" && !isAvifSupported()) {
      setErrorMsg(t("avifNotSupported"));
      setStatus("error");
      return;
    }

    // 清除旧结果
    current.forEach((item) => {
      if (item.result) URL.revokeObjectURL(item.result.url);
    });
    resultUrlsRef.current = [];
    setImages((prev) =>
      prev.map((item) =>
        item.result || item.error
          ? { ...item, result: undefined, error: undefined }
          : item
      )
    );
    setStatus("processing");
    setErrorMsg("");

    const updates = await Promise.all(
      current.map(
        async (item): Promise<{
          id: string;
          result?: { blob: Blob; url: string; name: string };
          error?: string;
        }> => {
          try {
            const blob = await convertImage(item.file, targetFormat);
            const url = URL.createObjectURL(blob);
            resultUrlsRef.current.push(url);
            return {
              id: item.id,
              result: {
                blob,
                url,
                name: getOutputName(item.file.name, targetFormat),
              },
            };
          } catch (err) {
            const msg =
              err instanceof Error && err.message === "avif-unsupported"
                ? t("avifNotSupported")
                : isHeicFile(item.file)
                ? t("heicNotSupported")
                : t("errorParse");
            return { id: item.id, error: msg };
          }
        }
      )
    );

    setImages((prev) => {
      // 转换期间被移除的图片：释放其新创建的 url，避免泄漏
      updates.forEach((u) => {
        if (u.result && !prev.find((p) => p.id === u.id)) {
          URL.revokeObjectURL(u.result.url);
          resultUrlsRef.current = resultUrlsRef.current.filter(
            (x) => x !== u.result!.url
          );
        }
      });
      return prev.map((item) => {
        const u = updates.find((x) => x.id === item.id);
        if (!u) return item;
        return { ...item, result: u.result, error: u.error };
      });
    });

    const anySuccess = updates.some((u) => u.result);
    if (anySuccess) {
      setStatus("done");
    } else {
      setStatus("error");
      const firstErr = updates.find((u) => u.error)?.error;
      if (firstErr) setErrorMsg(firstErr);
    }
  }, [targetFormat, t]);

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
        {/* 上传区域（始终可继续添加） */}
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
            accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif,.avif"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              // 重置 input 以便再次选择相同文件
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

        {/* 错误提示 */}
        {errorMsg && (
          <p className="text-center text-sm text-coral">{errorMsg}</p>
        )}

        {images.length > 0 && (
          <>
            {/* 目标格式选择 */}
            <div>
              <p className="mb-3 text-sm font-medium text-text">
                {t("selectFormat")}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {FORMAT_OPTIONS.map((opt) => {
                  const active = targetFormat === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleFormatChange(opt.value)}
                      className={[
                        "rounded-xl border-2 p-4 text-center transition-all",
                        active
                          ? "border-teal bg-teal-bg"
                          : "border-border bg-bg-warm hover:border-teal-light",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "block text-sm font-semibold",
                          active ? "text-teal" : "text-text",
                        ].join(" ")}
                      >
                        {t(opt.labelKey)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {avifBlocked && (
                <p className="mt-2 text-sm text-coral">
                  {t("avifNotSupported")}
                </p>
              )}
            </div>

            {/* 转换中状态 */}
            {status === "processing" && (
              <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
                <span className="w-4 h-4 border-2 border-teal border-t-transparent rounded-full animate-spin" />
                {t("converting")}
              </div>
            )}

            {/* 成功提示 */}
            {status === "done" && (
              <p className="text-center text-sm text-teal font-medium">
                {t("success")}
              </p>
            )}

            {/* 文件列表 */}
            <div className="space-y-3">
              {images.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-bg-article p-3"
                >
                  {/* 缩略图 */}
                  <img
                    src={item.result?.url ?? item.previewUrl}
                    alt={item.file.name}
                    className="w-16 h-16 shrink-0 rounded-lg object-cover bg-bg-warm"
                  />
                  {/* 详情 */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {item.file.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary">
                      <span>
                        {t("original")}: {formatBytes(item.file.size)}
                        {getExt(item.file.name)
                          ? ` · ${getExt(item.file.name).toUpperCase()}`
                          : ""}
                      </span>
                      {item.result && (
                        <span>
                          {t("converted")}:{" "}
                          {formatBytes(item.result.blob.size)}
                        </span>
                      )}
                    </div>
                    {item.error && (
                      <p className="mt-1 text-xs text-coral">{item.error}</p>
                    )}
                  </div>
                  {/* 单张下载 */}
                  <button
                    type="button"
                    onClick={() => downloadOne(item)}
                    disabled={!item.result}
                    className={[
                      "shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors",
                      item.result
                        ? "bg-teal text-white hover:bg-teal-dark"
                        : "bg-bg-warm text-text-secondary cursor-not-allowed",
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
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    <span className="hidden sm:inline">{t("download")}</span>
                  </button>
                  {/* 删除按钮 */}
                  <button
                    type="button"
                    onClick={() => removeImage(item.id)}
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
              ))}
            </div>

            {/* 操作区：继续添加 + 转换 + 批量下载 */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-bg-warm text-text font-semibold text-sm border border-border hover:border-teal-light transition-colors"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                {t("addMore")}
              </button>

              <button
                type="button"
                onClick={handleConvert}
                disabled={status === "processing" || avifBlocked}
                className={[
                  "inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors",
                  status === "processing" || avifBlocked
                    ? "bg-bg-article text-text-secondary cursor-not-allowed"
                    : "bg-teal text-white hover:bg-teal-dark",
                ].join(" ")}
              >
                {status === "processing" ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
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
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                )}
                {status === "processing" ? t("converting") : t("convert")}
              </button>

              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={
                  !images.some((i) => i.result) || status === "processing"
                }
                className={[
                  "inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors",
                  !images.some((i) => i.result) || status === "processing"
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
                {t("downloadAll")}
              </button>
            </div>
          </>
        )}
      </div>

      {/* 隐私提示 */}
      <p className="mt-8 text-sm text-text-secondary text-center">
        {t("privacy")}
      </p>
    </div>
  );
}
