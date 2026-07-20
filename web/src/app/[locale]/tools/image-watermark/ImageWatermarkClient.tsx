"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/ui/Logo";
import {
  applyWatermark,
  addImageWatermark,
  downloadZip,
  formatBytes,
  type WatermarkResult,
  type WatermarkPosition,
} from "@/lib/image-watermark";

// 单张图片最大尺寸 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;
// logo 最大尺寸 5MB
const MAX_LOGO_SIZE = 5 * 1024 * 1024;
// 最多支持图片数量
const MAX_IMAGES = 20;

// worker pool 模式的并发限制执行器：最多 limit 个任务同时运行
async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;
  const workerCount = Math.min(limit, items.length);
  const workers: Promise<void>[] = [];
  const run = async () => {
    while (index < items.length) {
      const currentIndex = index++;
      await fn(items[currentIndex]);
    }
  };
  for (let i = 0; i < workerCount; i++) {
    workers.push(run());
  }
  await Promise.all(workers);
}

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

// 根据原始文件名生成下载文件名；图片水印模式按 blob 类型保持原格式
function getDownloadName(originalName: string, blobType?: string): string {
  const baseName = originalName.replace(/\.[^.]+$/, "");
  if (blobType === "image/jpeg") return `${baseName}.jpg`;
  if (blobType === "image/webp") return `${baseName}.webp`;
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
  // 大图预览相关状态
  const [previewItem, setPreviewItem] = useState<ImageItem | null>(null);
  const [previewMode, setPreviewMode] = useState<"watermarked" | "original">(
    "watermarked"
  );
  // 模式：文字水印 / 图片水印
  const [mode, setMode] = useState<"text" | "image">("text");
  // 批量模式：开启后隐藏大图预览，专注于多图打包下载
  const [batchMode, setBatchMode] = useState(false);
  // 图片水印：logo 文件与预览
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>("");
  const [logoSize, setLogoSize] = useState(20);
  const [logoDragOver, setLogoDragOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  // 记录所有需清理的 object URL（原图预览）
  const previewUrlsRef = useRef<string[]>([]);
  // 始终保持最新的 images 引用，供异步渲染回调读取
  const imagesRef = useRef<ImageItem[]>([]);
  // 保持最新的 logoFile 引用，供异步渲染回调读取
  const logoFileRef = useRef<File | null>(null);
  // 预览模态根节点 ref，用于焦点陷阱
  const previewModalRef = useRef<HTMLDivElement>(null);
  // 触发预览的按钮（缩略图）引用，用于模态关闭后归还焦点
  const previewTriggerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(() => {
    logoFileRef.current = logoFile;
  }, [logoFile]);

  // 组件卸载时统一释放所有 object URL，避免内存泄漏
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      imagesRef.current.forEach((item) => {
        if (item.result) URL.revokeObjectURL(item.result.url);
      });
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 大图预览模态：ESC 关闭 + 焦点陷阱 + 焦点归还
  useEffect(() => {
    if (!previewItem) return;
    const modal = previewModalRef.current;
    if (!modal) return;

    const FOCUSABLE_SELECTOR =
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const getFocusable = () =>
      Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    // 模态打开时将焦点移至首个可交互元素（setTimeout 0 让 DOM 渲染完成）
    const focusTimer = setTimeout(() => {
      const elements = getFocusable();
      if (elements.length > 0) elements[0].focus();
    }, 0);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewItem(null);
        return;
      }
      if (e.key !== "Tab") return;
      const elements = getFocusable();
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        // Shift+Tab 在首元素时回到末元素
        if (active === first || !modal.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab 在末元素时回到首元素
        if (active === last || !modal.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKey);
      // 模态关闭时焦点回到触发按钮
      if (previewTriggerRef.current) {
        previewTriggerRef.current.focus();
        previewTriggerRef.current = null;
      }
    };
  }, [previewItem]);

  // 校验并追加多张图片
  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      // 图片数量上限校验：当前数量 + 新增数量 > MAX_IMAGES 时拒绝
      if (imagesRef.current.length + files.length > MAX_IMAGES) {
        setErrorMsg(t("maxImagesExceeded"));
        return;
      }

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
    a.download = getDownloadName(item.file.name, item.result.blob.type);
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
        name: getDownloadName(i.file.name, i.result!.blob.type),
        blob: i.result!.blob,
      }))
    );
  }, [images]);

  // 处理 logo 上传（单张图片）
  const handleLogoFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setErrorMsg(t("errorFormat"));
        return;
      }
      if (file.size > MAX_LOGO_SIZE) {
        setErrorMsg(t("errorSize"));
        return;
      }
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      setLogoFile(file);
      setLogoPreviewUrl(URL.createObjectURL(file));
      setErrorMsg("");
    },
    [logoPreviewUrl, t]
  );

  // 移除 logo
  const removeLogo = useCallback(() => {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(null);
    setLogoPreviewUrl("");
  }, [logoPreviewUrl]);

  // 参数变化或图片数量变化时（debounce 300ms）自动重新渲染水印
  useEffect(() => {
    if (images.length === 0) {
      return;
    }
    // 图片水印模式下，未上传 logo 时不处理
    if (mode === "image" && !logoFile) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setIsProcessing(true);
      const current = imagesRef.current;
      const currentLogo = logoFileRef.current;
      try {
        // 使用 worker pool 限制并发为 4，避免大批量图片同时处理造成内存/CPU 压力
        const newResults: { id: string; result: WatermarkResult }[] = [];
        await runWithConcurrency(current, 4, async (item) => {
          let result: WatermarkResult;
          if (mode === "image" && currentLogo) {
            const blob = await addImageWatermark(item.file, currentLogo, {
              position,
              logoSize,
              opacity: opacity / 100,
            });
            const url = URL.createObjectURL(blob);
            result = { blob, url };
          } else {
            result = await applyWatermark(item.file, {
              text,
              position,
              fontSize,
              opacity,
              angle,
              color,
            });
          }
          newResults.push({ id: item.id, result });
        });
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
  }, [
    images.length,
    mode,
    logoFile,
    text,
    position,
    fontSize,
    opacity,
    angle,
    color,
    logoSize,
  ]);

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

      {/* 模式切换：文字水印 / 图片水印 */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-full border border-border bg-bg-warm p-1">
          <button
            type="button"
            onClick={() => setMode("text")}
            className={[
              "px-5 py-2 rounded-full text-sm font-medium transition-colors",
              mode === "text"
                ? "bg-teal text-white"
                : "text-text-secondary hover:text-text",
            ].join(" ")}
          >
            {t("textMode")}
          </button>
          <button
            type="button"
            onClick={() => setMode("image")}
            className={[
              "px-5 py-2 rounded-full text-sm font-medium transition-colors",
              mode === "image"
                ? "bg-teal text-white"
                : "text-text-secondary hover:text-text",
            ].join(" ")}
          >
            {t("imageMode")}
          </button>
        </div>
      </div>

      {/* 批量模式开关 */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={batchMode}
            onChange={(e) => setBatchMode(e.target.checked)}
            className="w-4 h-4 accent-teal cursor-pointer"
          />
          <span className="text-sm font-medium text-text">
            {t("batchMode")}
          </span>
        </label>
        <span className="text-xs text-text-secondary">{t("batchHint")}</span>
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

        {/* 图片水印模式：logo 上传区 */}
        {mode === "image" && (
          <div>
            {logoPreviewUrl ? (
              <div className="flex items-center gap-4 rounded-xl border border-border bg-bg-article p-3">
                <img
                  src={logoPreviewUrl}
                  alt="logo"
                  className="w-16 h-16 shrink-0 rounded-lg object-contain bg-bg-warm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">
                    {logoFile?.name}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {logoFile ? formatBytes(logoFile.size) : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium bg-bg-warm text-text border border-border hover:border-teal-light transition-colors"
                >
                  {t("uploadLogo")}
                </button>
                <button
                  type="button"
                  onClick={removeLogo}
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
            ) : (
              <div
                onDrop={(e) => {
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    e.preventDefault();
                    setLogoDragOver(false);
                    handleLogoFile(e.dataTransfer.files[0]);
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setLogoDragOver(true);
                }}
                onDragLeave={() => setLogoDragOver(false)}
                onClick={() => logoInputRef.current?.click()}
                className={[
                  "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all",
                  logoDragOver
                    ? "border-teal bg-teal-bg"
                    : "border-border hover:border-teal-light hover:bg-bg-warm",
                ].join(" ")}
              >
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    handleLogoFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-col items-center gap-2">
                  <svg
                    className="w-8 h-8 text-text-secondary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-sm font-medium text-text">
                    {t("uploadLogo")}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {t("logoHint")}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 错误提示 */}
        {errorMsg && (
          <p className="text-center text-sm text-coral">{errorMsg}</p>
        )}

        {/* 水印参数与结果列表 */}
        {images.length > 0 && (
          <>
            {/* 预设模板区（仅文字水印模式） */}
            {mode === "text" && (
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
            )}

            {/* 图片水印模式下未上传 logo 的提示 */}
            {mode === "image" && !logoFile && (
              <p className="text-center text-sm text-text-secondary">
                {t("uploadLogo")}
              </p>
            )}

            {/* 参数区：文字模式显示 文字/字号/角度/颜色；图片模式显示 Logo 大小；位置和透明度共用 */}
            <div className="grid sm:grid-cols-2 gap-6">
              {/* 水印文字（仅文字水印模式） */}
              {mode === "text" && (
                <div className="sm:col-span-2">
                  <label className="block mb-2 text-sm font-medium text-text">
                    {t("text")}
                  </label>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t("textPlaceholder")}
                    autoComplete="off"
                    className="w-full rounded-xl border border-border bg-bg-warm px-4 py-3 text-sm text-text placeholder:text-text-secondary focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                  />
                </div>
              )}

              {/* 位置（两种模式共用） */}
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

              {/* 字号滑块（仅文字水印模式） */}
              {mode === "text" && (
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
              )}

              {/* Logo 大小滑块（仅图片水印模式） */}
              {mode === "image" && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-text">
                      {t("logoSize")}
                    </p>
                    <span className="text-sm text-text-secondary">
                      {logoSize}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    value={logoSize}
                    onChange={(e) => setLogoSize(Number(e.target.value))}
                    className="w-full accent-teal cursor-pointer"
                  />
                </div>
              )}

              {/* 透明度滑块（两种模式共用） */}
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

              {/* 旋转角度滑块（仅文字水印模式） */}
              {mode === "text" && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-text">
                      {t("angle")}
                    </p>
                    <span className="text-sm text-text-secondary">
                      {angle}°
                    </span>
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
              )}

              {/* 颜色选择（仅文字水印模式） */}
              {mode === "text" && (
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
              )}
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
                  {/* 缩略图，点击打开大图预览（仅水印生成后、非批量模式可点击） */}
                  <img
                    src={item.result?.url ?? item.previewUrl}
                    alt={item.file.name}
                    tabIndex={item.result && !batchMode ? 0 : undefined}
                    role={
                      item.result && !batchMode ? "button" : undefined
                    }
                    onClick={
                      item.result && !batchMode
                        ? (e) => {
                            previewTriggerRef.current =
                              e.currentTarget as HTMLElement;
                            setPreviewItem(item);
                            setPreviewMode("watermarked");
                          }
                        : undefined
                    }
                    className={[
                      "w-16 h-16 shrink-0 rounded-lg object-cover bg-bg-warm",
                      item.result && !batchMode
                        ? "cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-teal"
                        : "",
                    ].join(" ")}
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
                      "shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
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
                  "inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
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

      {/* 大图预览 modal：支持原图/水印后对比切换 */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div
            ref={previewModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="watermark-preview-title"
            className="relative max-w-[90vw] max-h-[80vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 模态标题（仅供屏幕阅读器使用） */}
            <h2 id="watermark-preview-title" className="sr-only">
              {t("previewTitle")}
            </h2>
            {/* 顶部切换按钮 */}
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode("original")}
                className={[
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
                  previewMode === "original"
                    ? "bg-teal text-white border-teal"
                    : "bg-white/10 text-white border-white/30 hover:bg-white/20",
                ].join(" ")}
              >
                {t("previewOriginal")}
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("watermarked")}
                className={[
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
                  previewMode === "watermarked"
                    ? "bg-teal text-white border-teal"
                    : "bg-white/10 text-white border-white/30 hover:bg-white/20",
                ].join(" ")}
              >
                {t("previewWatermarked")}
              </button>
            </div>
            {/* 大图 */}
            <img
              src={
                previewMode === "watermarked"
                  ? previewItem.result?.url ?? previewItem.previewUrl
                  : previewItem.previewUrl
              }
              alt={previewItem.file.name}
              className="max-w-[90vw] max-h-[70vh] object-contain rounded-lg"
            />
            {/* 关闭按钮 */}
            <button
              type="button"
              onClick={() => setPreviewItem(null)}
              aria-label={t("close")}
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-bg-warm transition-colors shadow-lg"
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
        </div>
      )}
    </div>
  );
}
