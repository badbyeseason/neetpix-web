"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/ui/Logo";
import {
  resizeImages,
  cropImage,
  getImageDimensions,
  downloadZip,
  formatBytes,
  type ResizeOptions,
} from "@/lib/image-resize";

// 单张图片最大尺寸 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

type Mode = "resize" | "crop";
type ResizeMode = "percentage" | "pixels";
type Status = "idle" | "processing" | "done" | "error";

interface ResizeItem {
  id: string;
  file: File;
  previewUrl: string;
  originalSize: number;
}

interface ResizeResultItem {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  originalSize: number;
  resizedSize: number;
}

interface CropResultItem {
  name: string;
  blob: Blob;
  url: string;
}

interface Preset {
  key: string;
  ratio: number; // width / height
  targetWidth: number;
  targetHeight: number;
}

// 社媒预设：尺寸锁定为预设比例，位置可拖动
const PRESETS: Preset[] = [
  { key: "presetIgSquare", ratio: 1, targetWidth: 1080, targetHeight: 1080 },
  { key: "presetIgStory", ratio: 9 / 16, targetWidth: 1080, targetHeight: 1920 },
  { key: "presetTwitter", ratio: 16 / 9, targetWidth: 1200, targetHeight: 675 },
  { key: "presetYoutube", ratio: 16 / 9, targetWidth: 1280, targetHeight: 720 },
  { key: "presetFbCover", ratio: 820 / 312, targetWidth: 820, targetHeight: 312 },
];

// 生成唯一 id
function makeId(file: File): string {
  return `${file.name}-${file.size}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function ImageResizeClient() {
  const t = useTranslations("imageResize");

  const [mode, setMode] = useState<Mode>("resize");

  // ---------- 缩放模式 ----------
  const [images, setImages] = useState<ResizeItem[]>([]);
  const [resizeMode, setResizeMode] = useState<ResizeMode>("percentage");
  const [percentage, setPercentage] = useState(50);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [maintainRatio, setMaintainRatio] = useState(true);
  const [firstDims, setFirstDims] = useState<{ w: number; h: number } | null>(
    null
  );
  const [resizeResults, setResizeResults] = useState<ResizeResultItem[]>([]);
  const [resizeStatus, setResizeStatus] = useState<Status>("idle");
  const [resizeError, setResizeError] = useState("");
  const [resizeDragOver, setResizeDragOver] = useState(false);

  // ---------- 裁剪模式 ----------
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState("");
  const [cropDims, setCropDims] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });
  const [presetIdx, setPresetIdx] = useState(0);
  // 裁剪框位置（以可拖动范围的 0-1 比例表示，0.5/0.5 为居中）
  const [cropOffset, setCropOffset] = useState<{ x: number; y: number }>({
    x: 0.5,
    y: 0.5,
  });
  const [displayDims, setDisplayDims] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });
  const [cropResult, setCropResult] = useState<CropResultItem | null>(null);
  const [cropStatus, setCropStatus] = useState<Status>("idle");
  const [cropError, setCropError] = useState("");
  const [cropDragOver, setCropDragOver] = useState(false);

  // ---------- refs ----------
  const resizeInputRef = useRef<HTMLInputElement>(null);
  const cropInputRef = useRef<HTMLInputElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);
  const urlsRef = useRef<string[]>([]);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
    maxX: number;
    maxY: number;
  } | null>(null);

  // 组件卸载时统一释放所有 object URL
  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // 选项按钮通用样式
  const optionBtn = (active: boolean) =>
    [
      "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
      active
        ? "bg-teal text-white border-teal"
        : "bg-bg-warm text-text-secondary border-border hover:border-teal-light hover:text-text",
    ].join(" ");

  // ===== 缩放模式：文件处理 =====
  const handleResizeFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      const validItems: ResizeItem[] = [];
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
        urlsRef.current.push(previewUrl);
        validItems.push({
          id: makeId(file),
          file,
          previewUrl,
          originalSize: file.size,
        });
      }

      if (validItems.length > 0) {
        setImages((prev) => [...prev, ...validItems]);
        setResizeError("");
        // 释放旧结果
        setResizeResults((prev) => {
          prev.forEach((r) => {
            URL.revokeObjectURL(r.url);
            urlsRef.current = urlsRef.current.filter((u) => u !== r.url);
          });
          return [];
        });
        setResizeStatus("idle");

        // 加载第一张图片的尺寸用于像素模式预览
        if (!firstDims) {
          try {
            const dims = await getImageDimensions(validItems[0].file);
            setFirstDims({ w: dims.width, h: dims.height });
          } catch {
            // 忽略，预览降级为 "auto"
          }
        }
      }
      if (firstError) setResizeError(firstError);
    },
    [t, firstDims]
  );

  const handleResizeDrop = useCallback(
    (e: React.DragEvent) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        e.preventDefault();
        setResizeDragOver(false);
        handleResizeFiles(e.dataTransfer.files);
      }
    },
    [handleResizeFiles]
  );

  const removeResizeImage = useCallback((id: string) => {
    setImages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        urlsRef.current = urlsRef.current.filter(
          (u) => u !== target.previewUrl
        );
      }
      return prev.filter((item) => item.id !== id);
    });
    // 移除对应结果
    setResizeResults((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
        urlsRef.current = urlsRef.current.filter((u) => u !== target.url);
      }
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  // ===== 缩放模式：执行批量缩放 =====
  const handleApplyResize = useCallback(async () => {
    if (images.length === 0) return;

    // 参数校验
    if (resizeMode === "percentage") {
      if (!percentage || percentage < 1 || percentage > 200) {
        setResizeError(t("errorFormat"));
        return;
      }
    } else {
      // pixels 模式
      if (maintainRatio) {
        if (width <= 0 && height <= 0) {
          setResizeError(t("errorFormat"));
          return;
        }
      } else {
        if (width <= 0 || height <= 0) {
          setResizeError(t("errorFormat"));
          return;
        }
      }
    }

    setResizeStatus("processing");
    setResizeError("");

    try {
      const options: ResizeOptions = {
        mode: resizeMode,
        maintainRatio,
        ...(resizeMode === "percentage"
          ? { percentage }
          : {
              width: width > 0 ? width : undefined,
              height: height > 0 ? height : undefined,
            }),
      };

      const outputs = await resizeImages(
        images.map((i) => i.file),
        options
      );

      // 释放旧结果 url
      setResizeResults((prev) => {
        prev.forEach((r) => {
          URL.revokeObjectURL(r.url);
          urlsRef.current = urlsRef.current.filter((u) => u !== r.url);
        });
        return [];
      });

      const newResults: ResizeResultItem[] = outputs.map((out, idx) => {
        const url = URL.createObjectURL(out.blob);
        urlsRef.current.push(url);
        return {
          id: images[idx].id,
          name: out.name,
          blob: out.blob,
          url,
          originalSize: images[idx].originalSize,
          resizedSize: out.blob.size,
        };
      });
      setResizeResults(newResults);
      setResizeStatus("done");
    } catch (err) {
      console.error("Resize error:", err);
      setResizeError(t("errorParse"));
      setResizeStatus("error");
    }
  }, [images, resizeMode, percentage, width, height, maintainRatio, t]);

  const downloadResizeOne = useCallback((item: ResizeResultItem) => {
    const a = document.createElement("a");
    a.href = item.url;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleDownloadAllResize = useCallback(async () => {
    if (resizeResults.length === 0) return;
    await downloadZip(
      resizeResults.map((r) => ({ name: r.name, blob: r.blob }))
    );
  }, [resizeResults]);

  // ===== 裁剪模式：文件处理 =====
  const handleCropFile = useCallback(
    async (fileList: FileList | File[]) => {
      const file = Array.from(fileList)[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setCropError(t("errorFormat"));
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setCropError(t("errorSize"));
        return;
      }

      // 释放旧预览与旧结果
      if (cropPreviewUrl) {
        URL.revokeObjectURL(cropPreviewUrl);
        urlsRef.current = urlsRef.current.filter((u) => u !== cropPreviewUrl);
      }
      if (cropResult) {
        URL.revokeObjectURL(cropResult.url);
        urlsRef.current = urlsRef.current.filter((u) => u !== cropResult.url);
      }

      const previewUrl = URL.createObjectURL(file);
      urlsRef.current.push(previewUrl);
      setCropFile(file);
      setCropPreviewUrl(previewUrl);
      setCropResult(null);
      setCropStatus("idle");
      setCropError("");
      setCropOffset({ x: 0.5, y: 0.5 });

      try {
        const dims = await getImageDimensions(file);
        setCropDims({ w: dims.width, h: dims.height });
      } catch {
        setCropError(t("errorParse"));
      }
    },
    [cropPreviewUrl, cropResult, t]
  );

  const handleCropDrop = useCallback(
    (e: React.DragEvent) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        e.preventDefault();
        setCropDragOver(false);
        handleCropFile(e.dataTransfer.files);
      }
    },
    [handleCropFile]
  );

  // 图片加载完成后读取显示尺寸，并在窗口尺寸变化时刷新
  const updateDisplayDims = useCallback(() => {
    const img = cropImgRef.current;
    if (img) {
      setDisplayDims({ w: img.clientWidth, h: img.clientHeight });
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", updateDisplayDims);
    return () => window.removeEventListener("resize", updateDisplayDims);
  }, [updateDisplayDims]);

  // 切换预设时重置裁剪框到居中
  const selectPreset = useCallback((idx: number) => {
    setPresetIdx(idx);
    setCropOffset({ x: 0.5, y: 0.5 });
  }, []);

  // ===== 裁剪框拖动（pointer events，兼容鼠标与触摸） =====
  const onCropPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const img = cropImgRef.current;
      if (!img) return;
      e.preventDefault();
      const displayedW = img.clientWidth;
      const displayedH = img.clientHeight;
      if (displayedW === 0 || displayedH === 0) return;
      const preset = PRESETS[presetIdx];
      const imageRatio = displayedW / displayedH;
      let displaySW: number;
      let displaySH: number;
      if (preset.ratio > imageRatio) {
        displaySW = displayedW;
        displaySH = displayedW / preset.ratio;
      } else {
        displaySH = displayedH;
        displaySW = displayedH * preset.ratio;
      }
      const maxX = Math.max(0, displayedW - displaySW);
      const maxY = Math.max(0, displayedH - displaySH);
      dragStateRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startOffsetX: cropOffset.x * maxX,
        startOffsetY: cropOffset.y * maxY,
        maxX,
        maxY,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [presetIdx, cropOffset]
  );

  const onCropPointerMove = useCallback((e: React.PointerEvent) => {
    const state = dragStateRef.current;
    if (!state) return;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    const newOffsetX = Math.max(0, Math.min(state.maxX, state.startOffsetX + dx));
    const newOffsetY = Math.max(0, Math.min(state.maxY, state.startOffsetY + dy));
    setCropOffset({
      x: state.maxX > 0 ? newOffsetX / state.maxX : 0.5,
      y: state.maxY > 0 ? newOffsetY / state.maxY : 0.5,
    });
  }, []);

  const onCropPointerUp = useCallback((e: React.PointerEvent) => {
    if (dragStateRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(
          dragStateRef.current.pointerId
        );
      } catch {
        // 忽略释放异常
      }
      dragStateRef.current = null;
    }
  }, []);

  // ===== 执行裁剪 =====
  const handleApplyCrop = useCallback(async () => {
    if (!cropFile || cropDims.w === 0 || cropDims.h === 0) return;

    setCropStatus("processing");
    setCropError("");

    try {
      const originalW = cropDims.w;
      const originalH = cropDims.h;
      const preset = PRESETS[presetIdx];
      const imageRatio = originalW / originalH;
      let sWidth: number;
      let sHeight: number;
      if (preset.ratio > imageRatio) {
        sWidth = originalW;
        sHeight = originalW / preset.ratio;
      } else {
        sHeight = originalH;
        sWidth = originalH * preset.ratio;
      }
      const maxOffsetX = Math.max(0, originalW - sWidth);
      const maxOffsetY = Math.max(0, originalH - sHeight);
      const sx = cropOffset.x * maxOffsetX;
      const sy = cropOffset.y * maxOffsetY;

      const blob = await cropImage(cropFile, {
        targetWidth: preset.targetWidth,
        targetHeight: preset.targetHeight,
        sx,
        sy,
        sWidth,
        sHeight,
      });

      // 释放旧结果
      if (cropResult) {
        URL.revokeObjectURL(cropResult.url);
        urlsRef.current = urlsRef.current.filter((u) => u !== cropResult.url);
      }

      const url = URL.createObjectURL(blob);
      urlsRef.current.push(url);
      const baseName = cropFile.name.replace(/\.[^.]+$/, "");
      const ext = blob.type === "image/png" ? "png" : "jpg";
      setCropResult({ name: `${baseName}-cropped.${ext}`, blob, url });
      setCropStatus("done");
    } catch (err) {
      console.error("Crop error:", err);
      setCropError(t("errorParse"));
      setCropStatus("error");
    }
  }, [cropFile, cropDims, presetIdx, cropOffset, cropResult, t]);

  const downloadCropResult = useCallback(() => {
    if (!cropResult) return;
    const a = document.createElement("a");
    a.href = cropResult.url;
    a.download = cropResult.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [cropResult]);

  // ===== 计算裁剪框在显示层的尺寸/位置 =====
  const cropBoxStyle = (() => {
    if (displayDims.w === 0 || displayDims.h === 0) return null;
    const preset = PRESETS[presetIdx];
    const imageRatio = displayDims.w / displayDims.h;
    let displaySW: number;
    let displaySH: number;
    if (preset.ratio > imageRatio) {
      displaySW = displayDims.w;
      displaySH = displayDims.w / preset.ratio;
    } else {
      displaySH = displayDims.h;
      displaySW = displayDims.h * preset.ratio;
    }
    const maxX = Math.max(0, displayDims.w - displaySW);
    const maxY = Math.max(0, displayDims.h - displaySH);
    const left = cropOffset.x * maxX;
    const top = cropOffset.y * maxY;
    return {
      width: displaySW,
      height: displaySH,
      left,
      top,
    };
  })();

  // 像素模式 + maintainRatio 时的高度预览（基于第一张图比例）
  const previewHeight =
    maintainRatio && firstDims && width > 0
      ? Math.max(1, Math.round((width * firstDims.h) / firstDims.w))
      : null;

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

      {/* 模式切换 tab */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-full border border-border bg-bg-warm p-1">
          <button
            type="button"
            onClick={() => setMode("resize")}
            className={[
              "px-6 py-2 rounded-full text-sm font-semibold transition-colors",
              mode === "resize"
                ? "bg-teal text-white"
                : "text-text-secondary hover:text-text",
            ].join(" ")}
          >
            {t("resizeMode")}
          </button>
          <button
            type="button"
            onClick={() => setMode("crop")}
            className={[
              "px-6 py-2 rounded-full text-sm font-semibold transition-colors",
              mode === "crop"
                ? "bg-teal text-white"
                : "text-text-secondary hover:text-text",
            ].join(" ")}
          >
            {t("cropMode")}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* ============ 缩放模式 ============ */}
        {mode === "resize" && (
          <>
            {/* 上传区 */}
            <div
              onDrop={handleResizeDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setResizeDragOver(true);
              }}
              onDragLeave={() => setResizeDragOver(false)}
              onClick={() => resizeInputRef.current?.click()}
              className={[
                "border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all",
                resizeDragOver
                  ? "border-teal bg-teal-bg"
                  : "border-border hover:border-teal-light hover:bg-bg-warm",
              ].join(" ")}
            >
              <input
                ref={resizeInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleResizeFiles(e.target.files);
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

            {resizeError && (
              <p className="text-center text-sm text-coral">{resizeError}</p>
            )}

            {images.length > 0 && (
              <>
                {/* 缩放参数区 */}
                <div className="grid sm:grid-cols-2 gap-6">
                  {/* 缩放方式 */}
                  <div className="sm:col-span-2">
                    <p className="mb-2 text-sm font-medium text-text">
                      {t("resizeMode")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setResizeMode("percentage")}
                        className={optionBtn(resizeMode === "percentage")}
                      >
                        {t("percentage")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setResizeMode("pixels")}
                        className={optionBtn(resizeMode === "pixels")}
                      >
                        {t("pixels")}
                      </button>
                    </div>
                  </div>

                  {/* 百分比模式 */}
                  {resizeMode === "percentage" ? (
                    <div className="sm:col-span-2">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-text">
                          {t("percentage")}
                        </p>
                        <span className="text-sm text-text-secondary">
                          {percentage}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={200}
                        value={percentage}
                        onChange={(e) => setPercentage(Number(e.target.value))}
                        className="w-full accent-teal cursor-pointer"
                      />
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={percentage}
                        onChange={(e) =>
                          setPercentage(
                            Math.max(1, Math.min(200, Number(e.target.value) || 1))
                          )
                        }
                        className="mt-3 w-32 px-3 py-2 rounded-lg border border-border bg-bg-article text-text text-sm focus:outline-none focus:border-teal"
                      />
                    </div>
                  ) : (
                    <>
                      {/* 宽度 */}
                      <div>
                        <p className="mb-2 text-sm font-medium text-text">
                          {t("width")}
                        </p>
                        <input
                          type="number"
                          min={1}
                          value={width || ""}
                          placeholder={firstDims ? String(firstDims.w) : "0"}
                          onChange={(e) =>
                            setWidth(Math.max(0, Number(e.target.value) || 0))
                          }
                          className="w-full px-3 py-2 rounded-lg border border-border bg-bg-article text-text text-sm focus:outline-none focus:border-teal"
                        />
                      </div>
                      {/* 高度 */}
                      <div>
                        <p className="mb-2 text-sm font-medium text-text">
                          {t("height")}
                        </p>
                        <input
                          type="number"
                          min={1}
                          value={
                            maintainRatio
                              ? previewHeight ?? ""
                              : height || ""
                          }
                          placeholder={firstDims ? String(firstDims.h) : "0"}
                          disabled={maintainRatio}
                          onChange={(e) =>
                            setHeight(Math.max(0, Number(e.target.value) || 0))
                          }
                          className={[
                            "w-full px-3 py-2 rounded-lg border border-border bg-bg-article text-text text-sm focus:outline-none focus:border-teal",
                            maintainRatio
                              ? "opacity-60 cursor-not-allowed"
                              : "",
                          ].join(" ")}
                        />
                      </div>
                      {/* 保持宽高比 */}
                      <div className="sm:col-span-2">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={maintainRatio}
                            onChange={(e) => setMaintainRatio(e.target.checked)}
                            className="w-4 h-4 accent-teal cursor-pointer"
                          />
                          <span className="text-sm text-text">
                            {t("maintainRatio")}
                          </span>
                        </label>
                      </div>
                    </>
                  )}
                </div>

                {/* 应用按钮 */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleApplyResize}
                    disabled={resizeStatus === "processing"}
                    className={[
                      "inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors",
                      resizeStatus === "processing"
                        ? "bg-bg-article text-text-secondary cursor-not-allowed"
                        : "bg-teal text-white hover:bg-teal-dark",
                    ].join(" ")}
                  >
                    {resizeStatus === "processing" && (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {resizeStatus === "processing" ? t("applying") : t("apply")}
                  </button>
                </div>

                {/* 结果列表 */}
                {resizeResults.length > 0 && (
                  <div className="space-y-3">
                    {resizeResults.map((item) => {
                      const original = images.find((i) => i.id === item.id);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 rounded-xl border border-border bg-bg-article p-3"
                        >
                          <img
                            src={item.url}
                            alt={item.name}
                            className="w-16 h-16 shrink-0 rounded-lg object-cover bg-bg-warm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-text">
                              {item.name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary">
                              {original && (
                                <span>
                                  {formatBytes(original.originalSize)}
                                </span>
                              )}
                              <span className="text-teal">→</span>
                              <span>{formatBytes(item.resizedSize)}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => downloadResizeOne(item)}
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium bg-teal text-white hover:bg-teal-dark transition-colors"
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
                            <span className="hidden sm:inline">
                              {t("download")}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeResizeImage(item.id)}
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
                      );
                    })}
                  </div>
                )}

                {/* 操作区：继续添加 + 批量下载 */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => resizeInputRef.current?.click()}
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
                    onClick={handleDownloadAllResize}
                    disabled={
                      resizeResults.length === 0 ||
                      resizeStatus === "processing"
                    }
                    className={[
                      "inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors",
                      resizeResults.length === 0 ||
                      resizeStatus === "processing"
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
          </>
        )}

        {/* ============ 裁剪模式 ============ */}
        {mode === "crop" && (
          <>
            {/* 上传区（单张） */}
            {!cropFile && (
              <div
                onDrop={handleCropDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setCropDragOver(true);
                }}
                onDragLeave={() => setCropDragOver(false)}
                onClick={() => cropInputRef.current?.click()}
                className={[
                  "border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all",
                  cropDragOver
                    ? "border-teal bg-teal-bg"
                    : "border-border hover:border-teal-light hover:bg-bg-warm",
                ].join(" ")}
              >
                <input
                  ref={cropInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleCropFile(e.target.files);
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
                      d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2M9 12h.01M15 12h.01M9 16h6"
                    />
                  </svg>
                  <p className="text-base font-medium text-text">
                    {t("upload")}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {t("uploadHint")}
                  </p>
                </div>
              </div>
            )}

            {cropError && (
              <p className="text-center text-sm text-coral">{cropError}</p>
            )}

            {cropFile && (
              <>
                {/* 预设选择 */}
                <div>
                  <p className="mb-2 text-sm font-medium text-text">
                    {t("preset")}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PRESETS.map((preset, idx) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => selectPreset(idx)}
                        className={[
                          "px-3 py-2.5 rounded-xl text-xs font-medium transition-colors border text-left",
                          presetIdx === idx
                            ? "bg-teal text-white border-teal"
                            : "bg-bg-warm text-text-secondary border-border hover:border-teal-light hover:text-text",
                        ].join(" ")}
                      >
                        {t(preset.key)}
                        <span
                          className={[
                            "block mt-0.5 text-[10px]",
                            presetIdx === idx
                              ? "text-white/70"
                              : "text-text-secondary/70",
                          ].join(" ")}
                        >
                          {preset.targetWidth}×{preset.targetHeight}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 图片预览 + 裁剪框 */}
                <div className="space-y-3">
                  <p className="text-sm text-text-secondary">
                    {t("dragToCrop")}
                  </p>
                  <div className="relative inline-block w-full select-none">
                    <img
                      ref={cropImgRef}
                      src={cropPreviewUrl}
                      alt={cropFile.name}
                      onLoad={updateDisplayDims}
                      className="w-full h-auto rounded-xl block touch-none"
                      draggable={false}
                    />
                    {cropBoxStyle && (
                      <div
                        onPointerDown={onCropPointerDown}
                        onPointerMove={onCropPointerMove}
                        onPointerUp={onCropPointerUp}
                        onPointerCancel={onCropPointerUp}
                        className="absolute border-2 border-teal bg-teal/20 cursor-move touch-none"
                        style={{
                          width: cropBoxStyle.width,
                          height: cropBoxStyle.height,
                          left: cropBoxStyle.left,
                          top: cropBoxStyle.top,
                          boxSizing: "border-box",
                        }}
                      >
                        {/* 四角标记 */}
                        <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-teal bg-white rounded-sm" />
                        <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-teal bg-white rounded-sm" />
                        <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-teal bg-white rounded-sm" />
                        <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-teal bg-white rounded-sm" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 裁剪按钮 */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleApplyCrop}
                    disabled={cropStatus === "processing"}
                    className={[
                      "inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors",
                      cropStatus === "processing"
                        ? "bg-bg-article text-text-secondary cursor-not-allowed"
                        : "bg-teal text-white hover:bg-teal-dark",
                    ].join(" ")}
                  >
                    {cropStatus === "processing" && (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {cropStatus === "processing" ? t("cropping") : t("crop")}
                  </button>
                </div>

                {/* 裁剪结果 */}
                {cropResult && (
                  <div className="rounded-xl border border-border bg-bg-article p-4 space-y-3">
                    <p className="text-sm font-medium text-teal">{t("success")}</p>
                    <div className="flex items-center gap-4">
                      <img
                        src={cropResult.url}
                        alt={cropResult.name}
                        className="w-24 h-24 shrink-0 rounded-lg object-cover bg-bg-warm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">
                          {cropResult.name}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {formatBytes(cropResult.blob.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={downloadCropResult}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium bg-teal text-white hover:bg-teal-dark transition-colors"
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
                        <span className="hidden sm:inline">
                          {t("download")}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 重新选择 */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => cropInputRef.current?.click()}
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
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 4v12m0-12l-4 4m4-4l4 4"
                      />
                    </svg>
                    {t("upload")}
                  </button>
                  <input
                    ref={cropInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) handleCropFile(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>
              </>
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
