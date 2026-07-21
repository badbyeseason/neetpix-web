"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/ui/Logo";
import { removeBackgroundAI } from "@/lib/remove-background";
import { trackEvent } from "@/lib/analytics";
import { addRecentTool } from "@/hooks/useRecentTools";

type Status = "idle" | "loading" | "processing" | "done" | "error";

export default function RemoveBackgroundClient() {
  const t = useTranslations("removeBackground");
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // 用 ref 存储 image URL，便于在组件卸载或重新上传时 revoke
  const imageUrlRef = useRef<string | null>(null);

  // 组件卸载时 revoke image URL，避免内存泄漏
  useEffect(() => {
    return () => {
      if (imageUrlRef.current) {
        URL.revokeObjectURL(imageUrlRef.current);
        imageUrlRef.current = null;
      }
    };
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg(t("errorFormat"));
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg(t("errorSize"));
      return;
    }
    setErrorMsg("");
    setResult(null);
    setProgress(0);
    setStatus("loading");

    // 重新上传时，先 revoke 旧的 image URL
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }

    const url = URL.createObjectURL(file);
    setImage(url);
    imageUrlRef.current = url;

    const img = new Image();
    img.onload = async () => {
      // 不在此处 revoke URL，因为 UI 中的 <img src={image}> 仍需要使用
      setStatus("processing");
      setProgress(0);

      try {
        const resultDataUrl = await removeBackgroundAI(file, (pct) => {
          setProgress(pct);
        });

        setResult(resultDataUrl);
        setStatus("done");
      } catch (err) {
        console.error("Processing error:", err);
        setErrorMsg(t("errorProcessing"));
        setStatus("error");
      }
    };
    img.onerror = () => {
      setErrorMsg(t("errorLoad"));
      setStatus("error");
    };
    img.src = url;
  }, [t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const reset = useCallback(() => {
    setImage(null);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
    setProgress(0);
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

      {status === "idle" && (
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
            }}
          />
          <div className="flex flex-col items-center gap-3">
            <svg className="w-10 h-10 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-base font-medium text-text">{t("upload")}</p>
            <p className="text-sm text-text-secondary">{t("uploadHint")}</p>
          </div>
        </div>
      )}

      {(status === "loading" || status === "processing") && (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="w-12 h-12 border-3 border-teal border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-text-secondary font-medium">{t("processing")}</p>
            <div className="mt-3 w-48 h-1.5 bg-bg-article rounded-full overflow-hidden">
              <div
                className="h-full bg-teal rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-text-secondary">{t("step")}</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="text-center py-12">
          <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-coral/10">
            <svg className="w-6 h-6 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-text-secondary mb-6">{errorMsg}</p>
          <button onClick={reset} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal text-white font-semibold text-sm hover:bg-teal-dark transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t("retry")}
          </button>
        </div>
      )}

      {status === "done" && result && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl overflow-hidden border border-border bg-bg-article">
              <div className="px-4 py-2 text-xs font-medium text-text-secondary border-b border-border">
                {t("original")}
              </div>
              <div className="p-2">
                {image && <img src={image} alt="Original" className="w-full h-auto" />}
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-border">
              <div className="px-4 py-2 text-xs font-medium text-text-secondary border-b border-border">
                {t("result")}
              </div>
              <div className="p-2 bg-[repeating-conic-gradient(#e8e8ed_0%_25%,_#f5f5f7_0%_50%)_50%_/_20px_20px]">
                <img src={result} alt="Result" className="w-full h-auto" />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <a
              href={result}
              download="neetpix-removed-background.png"
              onClick={() => {
                trackEvent("tool-used", { toolKey: "removeBackground" });
                addRecentTool("removeBackground");
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal text-white font-semibold text-sm hover:bg-teal-dark transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t("download")}
            </a>
            <button onClick={reset} className="inline-flex items-center gap-2 text-sm text-teal hover:underline">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t("retry")}
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-text-secondary">
        <svg className="w-4 h-4 text-teal-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        {t("privacy")}
      </div>
    </div>
  );
}
