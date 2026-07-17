"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/ui/Logo";
import { blurRegion, type BlurIntensity, type BlurRegion } from "@/lib/image-blur";

// 单张图片最大尺寸 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

type Status = "idle" | "processing" | "done" | "error";

interface Selection {
  x: number; // 0-1 比例（相对于显示图片）
  y: number;
  w: number;
  h: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export default function ImageBlurClient() {
  const t = useTranslations("imageBlur");

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [workingFile, setWorkingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [intensity, setIntensity] = useState<BlurIntensity>("medium");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [appliedCount, setAppliedCount] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const urlsRef = useRef<string[]>([]);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
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

  // ===== 文件处理 =====
  const handleFile = useCallback(
    async (fileList: FileList | File[]) => {
      const file = Array.from(fileList)[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setError(t("errorFormat"));
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(t("errorSize"));
        return;
      }

      // 释放旧预览
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        urlsRef.current = urlsRef.current.filter((u) => u !== previewUrl);
      }

      const url = URL.createObjectURL(file);
      urlsRef.current.push(url);
      setOriginalFile(file);
      setWorkingFile(file);
      setPreviewUrl(url);
      setSelection(null);
      setAppliedCount(0);
      setStatus("idle");
      setError("");
    },
    [previewUrl, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files);
      }
    },
    [handleFile]
  );

  // ===== 框选交互（pointer events，兼容鼠标与触摸） =====
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const img = imgRef.current;
    if (!img) return;
    e.preventDefault();
    const rect = img.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    dragStateRef.current = { pointerId: e.pointerId, startX: x, startY: y };
    setSelection({ x, y, w: 0, h: 0 });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const state = dragStateRef.current;
    if (!state) return;
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    const sx = Math.min(state.startX, x);
    const sy = Math.min(state.startY, y);
    const w = Math.abs(x - state.startX);
    const h = Math.abs(y - state.startY);
    setSelection({ x: sx, y: sy, w, h });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
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

  // ===== 应用模糊 =====
  const handleApply = useCallback(async () => {
    if (!workingFile || !selection) return;
    // 过小的选区忽略
    if (selection.w < 0.01 || selection.h < 0.01) return;

    setStatus("processing");
    setError("");

    try {
      const img = imgRef.current;
      const naturalW = img?.naturalWidth || 0;
      const naturalH = img?.naturalHeight || 0;
      if (naturalW === 0 || naturalH === 0) {
        throw new Error("Image not loaded");
      }

      // 将比例选区换算为原图像素坐标
      const region: BlurRegion = {
        x: Math.round(selection.x * naturalW),
        y: Math.round(selection.y * naturalH),
        width: Math.round(selection.w * naturalW),
        height: Math.round(selection.h * naturalH),
      };

      const blob = await blurRegion(workingFile, [region], intensity);
      const newFile = new File([blob], originalFile?.name ?? "image", {
        type: blob.type,
      });

      // 释放旧预览 url
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        urlsRef.current = urlsRef.current.filter((u) => u !== previewUrl);
      }

      const url = URL.createObjectURL(blob);
      urlsRef.current.push(url);

      setWorkingFile(newFile);
      setPreviewUrl(url);
      setAppliedCount((c) => c + 1);
      setStatus("done");
    } catch (err) {
      console.error("Blur error:", err);
      setError(t("errorParse"));
      setStatus("error");
    }
  }, [workingFile, selection, intensity, originalFile, previewUrl, t]);

  // 清除当前选区，允许框选新区域
  const handleAddRegion = useCallback(() => {
    setSelection(null);
    setStatus("idle");
  }, []);

  // 全部重置：恢复原图
  const handleReset = useCallback(() => {
    if (!originalFile) return;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      urlsRef.current = urlsRef.current.filter((u) => u !== previewUrl);
    }
    const url = URL.createObjectURL(originalFile);
    urlsRef.current.push(url);
    setWorkingFile(originalFile);
    setPreviewUrl(url);
    setSelection(null);
    setAppliedCount(0);
    setStatus("idle");
    setError("");
  }, [originalFile, previewUrl]);

  const handleDownload = useCallback(() => {
    if (!workingFile || !originalFile) return;
    const baseName = originalFile.name.replace(/\.[^.]+$/, "");
    const ext = workingFile.type === "image/png" ? "png" : "jpg";
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `${baseName}-blurred.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [workingFile, originalFile, previewUrl]);

  const hasValidSelection =
    selection !== null && selection.w >= 0.01 && selection.h >= 0.01;

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
        {/* 上传区 */}
        {!workingFile && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
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
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFile(e.target.files);
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

        {error && (
          <p className="text-center text-sm text-coral">{error}</p>
        )}

        {workingFile && (
          <>
            {/* 模糊强度选择 */}
            <div>
              <p className="mb-2 text-sm font-medium text-text">
                {t("intensity")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { key: "intensityLight", value: "light" as const },
                    { key: "intensityMedium", value: "medium" as const },
                    { key: "intensityHeavy", value: "heavy" as const },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIntensity(opt.value)}
                    className={optionBtn(intensity === opt.value)}
                  >
                    {t(opt.key)}
                  </button>
                ))}
              </div>
            </div>

            {/* 图片预览 + 框选 */}
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">
                {t("dragToSelect")}
              </p>
              <div
                className="relative inline-block w-full select-none touch-none cursor-crosshair"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                <img
                  ref={imgRef}
                  src={previewUrl}
                  alt={originalFile?.name ?? ""}
                  className="w-full h-auto rounded-xl block touch-none pointer-events-none"
                  draggable={false}
                />
                {selection && selection.w > 0 && selection.h > 0 && (
                  <div
                    className="absolute border-2 border-teal bg-teal/20 pointer-events-none"
                    style={{
                      left: `${selection.x * 100}%`,
                      top: `${selection.y * 100}%`,
                      width: `${selection.w * 100}%`,
                      height: `${selection.h * 100}%`,
                      boxSizing: "border-box",
                    }}
                  />
                )}
              </div>
            </div>

            {/* 已应用区域数 */}
            {appliedCount > 0 && (
              <p className="text-center text-sm text-teal">
                {t("regionsCount", { count: appliedCount })}
              </p>
            )}

            {/* 成功提示 */}
            {status === "done" && (
              <p className="text-center text-sm text-teal">{t("success")}</p>
            )}

            {/* 操作按钮 */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleApply}
                disabled={!hasValidSelection || status === "processing"}
                className={[
                  "inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors",
                  !hasValidSelection || status === "processing"
                    ? "bg-bg-article text-text-secondary cursor-not-allowed"
                    : "bg-teal text-white hover:bg-teal-dark",
                ].join(" ")}
              >
                {status === "processing" && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {status === "processing" ? t("applying") : t("apply")}
              </button>

              <button
                type="button"
                onClick={handleAddRegion}
                disabled={status === "processing"}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-bg-warm text-text font-semibold text-sm border border-border hover:border-teal-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("addRegion")}
              </button>

              {appliedCount > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={status === "processing"}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-bg-warm text-text font-semibold text-sm border border-border hover:border-coral hover:text-coral transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("reset")}
                </button>
              )}

              {appliedCount > 0 && (
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={status === "processing"}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm bg-teal text-white hover:bg-teal-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              )}
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
