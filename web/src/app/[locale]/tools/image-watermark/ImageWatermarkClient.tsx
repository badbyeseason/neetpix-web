"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/ui/Logo";
import {
  applyWatermark,
  downloadZip,
  formatBytes,
  type WatermarkResult,
  type WatermarkPosition,
} from "@/lib/image-watermark";

// 单张图片最大尺寸 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// 单张图片信息
interface ImageItem {
  id: string;
  file: File;
  previewUrl: string; // 原图预览 url
  result?: WatermarkResult;
}

// 可选颜色
const COLORS: { value: string; labelKey: string }[] = [
  { value: "#FFFFFF", labelKey: "colorWhite" },
  { value: "#000000", labelKey: "colorBlack" },
  { value: "#888888", labelKey: "colorGray" },
  { value: "#FF0000", labelKey: "colorRed" },
];

// 根据原始文件名生成 PNG 下载文件名
function getDownloadName(originalName: string): string {
  const baseName = originalName.replace(/\.[^.]+$/, "");
  return `${baseName}.png`;
}

export default function ImageWatermarkClient() {
  const t = useTranslations("imageWatermark");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [text, setText] = useState("CONFIDENTIAL");
  const [position, setPosition] = useState<WatermarkPosition>("tiled");
  const [fontSize, setFontSize] = useState(32);
  const [opacity, setOpacity] = useState(30);
  const [angle, setAngle] = useState(-30);
  const [color, setColor] = useState("#FFFFFF");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  // 记录所有需清理的 object URL（原图预览）
  const previewUrlsRef = useRef<string[]>([]);
  // 始终保持最新的 images 引用，供异步渲染回调读取
  const imagesRef = useRef<ImageItem[]>([]);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // 组件卸载时统一释放所有 object URL，避免内存泄漏
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      imagesRef.current.forEach((item) => {
        if (item.result) URL.revokeObjectURL(item.result.url);
      });
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
        URL.revokeObjectURL(target.previewUrl);
        previewUrlsRef.current = previewUrlsRef.current.filter(
          (u) => u !== target.previewUrl
        );
        if (target.result) URL.revokeObjectURL(target.result.url);
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  // 单张下载
  const downloadOne = useCallback((item: ImageItem) => {
    if (!item.result) return;
    const a = document.createElement("a");
    a.href = item.result.url;
    a.download = getDownloadName(item.file.name);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  // 批量下载（ZIP）
  const handleDownloadAll = useCallback(async () => {
    const items = images.filter((i) => i.result);
    if (items.length === 0) return;
    await downloadZip(
      items.map((i) => ({
        name: getDownloadName(i.file.name),
        blob: i.result!.blob,
      }))
    );
  }, [images]);

  // 参数变化或图片数量变化时（debounce 300ms）自动重新渲染水印
  useEffect(() => {
    if (images.length === 0) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setIsProcessing(true);
      const current = imagesRef.current;
      try {
        const newResults = await Promise.all(
          current.map(async (item) => {
            const result = await applyWatermark(item.file, {
              text,
              position,
              fontSize,
              opacity,
              angle,
              color,
            });
            return { id: item.id, result };
          })
        );
        if (cancelled) {
          // 已取消，释放这些将不会使用的 url
          newResults.forEach((r) => URL.revokeObjectURL(r.result.url));
          return;
        }
        setImages((prev) => {
          // 释放已被移除图片对应的新结果 url，避免泄漏
          newResults.forEach((r) => {
            if (!prev.find((p) => p.id === r.id)) {
              URL.revokeObjectURL(r.result.url);
            }
          });
          return prev.map((item) => {
            const found = newResults.find((r) => r.id === item.id);
            if (!found) return item;
            // 释放旧结果 url
            if (item.result) URL.revokeObjectURL(item.result.url);
            return { ...item, result: found.result };
          });
        });
      } catch (err) {
        console.error("Watermark error:", err);
        if (!cancelled) {
          setErrorMsg(t("errorFormat"));
        }
      } finally {
        if (!cancelled) setIsProcessing(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // 仅依赖参数与数量，避免 setImages 更新结果时触发循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length, text, position, fontSize, opacity, angle, color]);

  // 选项按钮组的通用样式
  const optionBtn = (active: boolean) =>
    [
      "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
      active
        ? "bg-teal text-white border-teal"
        : "bg-bg-warm text-text-secondary border-border hover:border-teal-light hover:text-text",
    ].join(" ");

  // 应用预设模板
  const applyPreset = useCallback(
    (
      presetText: string,
      presetPosition: WatermarkPosition,
      presetOpacity: number,
      presetAngle: number
    ) => {
      setText(presetText);
      setPosition(presetPosition);
      setOpacity(presetOpacity);
      setAngle(presetAngle);
    },
    []
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

        {/* 水印参数与结果列表 */}
        {images.length > 0 && (
          <>
            {/* 预设模板区 */}
            <div>
              <p className="mb-2 text-sm font-medium text-text">
                {t("templates")}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    applyPreset(t("templateVerify"), "tiled", 30, -30)
                  }
                  className={optionBtn(false)}
                >
                  {t("templateVerify")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset(t("templateUse"), "tiled", 40, -30)
                  }
                  className={optionBtn(false)}
                >
                  {t("templateUse")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset(t("templateConfidential"), "center", 50, 0)
                  }
                  className={optionBtn(false)}
                >
                  {t("templateConfidential")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset(t("templateDraft"), "bottom-right", 60, 0)
                  }
                  className={optionBtn(false)}
                >
                  {t("templateDraft")}
                </button>
              </div>
            </div>

            {/* 参数区：文字 + 位置 + 字号 + 透明度 + 角度 + 颜色 */}
            <div className="grid sm:grid-cols-2 gap-6">
              {/* 水印文字 */}
              <div className="sm:col-span-2">
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
              </div>

              {/* 位置 */}
              <div className="sm:col-span-2">
                <p className="mb-2 text-sm font-medium text-text">
                  {t("position")}
                </p>
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
                  <button
                    type="button"
                    onClick={() => setPosition("bottom-left")}
                    className={optionBtn(position === "bottom-left")}
                  >
                    {t("positionBottomLeft")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosition("bottom-right")}
                    className={optionBtn(position === "bottom-right")}
                  >
                    {t("positionBottomRight")}
                  </button>
                </div>
              </div>

              {/* 字号滑块 */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-text">
                    {t("fontSize")}
                  </p>
                  <span className="text-sm text-text-secondary">
                    {fontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={96}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-teal cursor-pointer"
                />
              </div>

              {/* 透明度滑块 */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-text">
                    {t("opacity")}
                  </p>
                  <span className="text-sm text-text-secondary">
                    {opacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-teal cursor-pointer"
                />
              </div>

              {/* 旋转角度滑块 */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-text">{t("angle")}</p>
                  <span className="text-sm text-text-secondary">{angle}°</span>
                </div>
                <input
                  type="range"
                  min={-90}
                  max={90}
                  value={angle}
                  onChange={(e) => setAngle(Number(e.target.value))}
                  className="w-full accent-teal cursor-pointer"
                />
              </div>

              {/* 颜色选择 */}
              <div>
                <p className="mb-2 text-sm font-medium text-text">
                  {t("color")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      aria-label={t(c.labelKey)}
                      title={t(c.labelKey)}
                      className={[
                        "w-9 h-9 rounded-full border-2 transition-all",
                        color === c.value
                          ? "border-teal ring-2 ring-teal ring-offset-2 ring-offset-bg-warm"
                          : "border-border hover:border-teal-light",
                      ].join(" ")}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 处理中状态 */}
            {isProcessing && (
              <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
                <span className="w-4 h-4 border-2 border-teal border-t-transparent rounded-full animate-spin" />
                {t("processing")}
              </div>
            )}

            {/* 结果列表 */}
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
                    {item.result ? (
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary">
                        <span>
                          {t("original")}: {formatBytes(item.file.size)}
                        </span>
                        <span>
                          {t("watermarked")}:{" "}
                          {formatBytes(item.result.blob.size)}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-text-secondary">
                        {t("processing")}
                      </p>
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

            {/* 操作区：继续添加 + 批量下载 */}
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
                onClick={handleDownloadAll}
                disabled={
                  images.every((i) => !i.result) || isProcessing
                }
                className={[
                  "inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors",
                  images.every((i) => !i.result) || isProcessing
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
