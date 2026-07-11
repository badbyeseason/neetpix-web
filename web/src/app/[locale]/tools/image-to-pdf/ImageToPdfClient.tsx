"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/ui/Logo";
import {
  imagesToPdf,
  type PageSize,
  type Orientation,
} from "@/lib/image-to-pdf";

// 单张图片最大尺寸 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// 单张图片信息
interface ImageItem {
  id: string;
  file: File;
  url: string;
}

type Status = "idle" | "generating" | "done" | "error";

export default function ImageToPdfClient() {
  const t = useTranslations("imageToPdf");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  // 拖拽排序相关状态
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  // 生成的 PDF 结果 url
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  // 记录所有需清理的 object URL
  const urlsRef = useRef<string[]>([]);

  // 组件卸载时统一释放 object URL，避免内存泄漏
  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // 校验并追加多张图片
  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      const validItems: ImageItem[] = [];
      let firstError = "";

      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          firstError = firstError || t("errorFormat");
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          firstError = firstError || t("errorSize");
          continue;
        }
        const url = URL.createObjectURL(file);
        urlsRef.current.push(url);
        validItems.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,
          file,
          url,
        });
      }

      if (validItems.length > 0) {
        setImages((prev) => [...prev, ...validItems]);
        setErrorMsg("");
      }
      if (firstError) {
        setErrorMsg(firstError);
      }
    },
    [t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      // 忽略缩略图之间排序触发的 drop 冒泡
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

  // 删除指定图片，并释放其 object URL
  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
        urlsRef.current = urlsRef.current.filter((u) => u !== target.url);
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  // 拖拽排序：开始拖动
  const handleItemDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  // 拖拽排序：拖动经过某项
  const handleItemDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragIndex !== null && dragIndex !== index) {
        setDragOverIndex(index);
      }
    },
    [dragIndex]
  );

  // 拖拽排序：放下，重排数组
  const handleItemDrop = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragIndex === null || dragIndex === index) {
        setDragIndex(null);
        setDragOverIndex(null);
        return;
      }
      setImages((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(index, 0, moved);
        return next;
      });
      setDragIndex(null);
      setDragOverIndex(null);
    },
    [dragIndex]
  );

  const handleItemDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  // 生成 PDF
  const generatePdf = useCallback(async () => {
    if (images.length === 0) return;
    setStatus("generating");
    setErrorMsg("");
    try {
      const blob = await imagesToPdf(
        images.map((item) => item.file),
        { pageSize, orientation }
      );
      const url = URL.createObjectURL(blob);
      urlsRef.current.push(url);
      setResultUrl(url);

      // 自动触发下载
      const a = document.createElement("a");
      a.href = url;
      a.download = "neetpix-images.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setStatus("done");
    } catch (err) {
      console.error("Generate PDF error:", err);
      setErrorMsg(t("errorFormat"));
      setStatus("error");
    }
  }, [images, pageSize, orientation, t]);

  // 重置，回到初始上传状态
  const reset = useCallback(() => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      urlsRef.current = urlsRef.current.filter((u) => u !== resultUrl);
    }
    setResultUrl(null);
    setStatus("idle");
    setErrorMsg("");
  }, [resultUrl]);

  // 选项按钮组的通用样式
  const optionBtn = (active: boolean) =>
    [
      "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
      active
        ? "bg-teal text-white border-teal"
        : "bg-bg-warm text-text-secondary border-border hover:border-teal-light hover:text-text",
    ].join(" ");

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

      {(status === "idle" || status === "generating") && (
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
              accept="image/jpeg,image/png,image/webp"
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

          {/* 缩略图列表 */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {images.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleItemDragStart(index)}
                  onDragOver={(e) => handleItemDragOver(e, index)}
                  onDrop={(e) => handleItemDrop(e, index)}
                  onDragEnd={handleItemDragEnd}
                  className={[
                    "relative group rounded-xl overflow-hidden border bg-bg-article",
                    dragIndex === index
                      ? "opacity-40 border-teal"
                      : "border-border",
                    dragOverIndex === index && dragIndex !== index
                      ? "ring-2 ring-teal-light"
                      : "",
                  ].join(" ")}
                >
                  {/* 序号 */}
                  <span className="absolute top-2 left-2 z-10 inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/50 text-white text-xs font-semibold">
                    {index + 1}
                  </span>
                  {/* 删除按钮 */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(item.id);
                    }}
                    aria-label={t("remove")}
                    className="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/50 text-white hover:bg-coral transition-colors"
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
                        strokeWidth={2.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  <img
                    src={item.url}
                    alt={item.file.name}
                    className="w-full h-32 object-cover cursor-grab active:cursor-grabbing"
                  />
                  <p className="px-2 py-1.5 text-xs text-text-secondary truncate">
                    {item.file.name}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 选项区：页面尺寸 + 方向 */}
          {images.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-6">
              {/* 页面尺寸 */}
              <div>
                <p className="mb-2 text-sm font-medium text-text">
                  {t("pageSize")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPageSize("a4")}
                    className={optionBtn(pageSize === "a4")}
                  >
                    {t("pageSizeA4")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageSize("letter")}
                    className={optionBtn(pageSize === "letter")}
                  >
                    {t("pageSizeLetter")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageSize("fit")}
                    className={optionBtn(pageSize === "fit")}
                  >
                    {t("pageSizeFit")}
                  </button>
                </div>
              </div>

              {/* 方向 */}
              <div>
                <p className="mb-2 text-sm font-medium text-text">
                  {t("orientation")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setOrientation("portrait")}
                    className={optionBtn(orientation === "portrait")}
                  >
                    {t("portrait")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation("landscape")}
                    className={optionBtn(orientation === "landscape")}
                  >
                    {t("landscape")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 生成 PDF 按钮 */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={generatePdf}
              disabled={images.length === 0 || status === "generating"}
              className={[
                "inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-colors",
                images.length === 0 || status === "generating"
                  ? "bg-bg-article text-text-secondary cursor-not-allowed"
                  : "bg-teal text-white hover:bg-teal-dark",
              ].join(" ")}
            >
              {status === "generating" ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t("generating")}
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
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  {t("generate")}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 成功状态 */}
      {status === "done" && resultUrl && (
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
            <a
              href={resultUrl}
              download="neetpix-images.pdf"
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
            </a>
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
