"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import {
  decodeQrFromImage,
  detectContentType,
  type QrContentInfo,
} from "@/lib/qr-decode";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function QrDecodeClient() {
  const t = useTranslations("qrDecode");
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [contentInfo, setContentInfo] = useState<QrContentInfo | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (f: File | null) => {
      if (!f) return;
      if (!f.type.startsWith("image/")) {
        setError(t("errorFormat"));
        return;
      }
      if (f.size >= MAX_FILE_SIZE) {
        setError(t("errorSize"));
        return;
      }
      setFile(f);
      setDecoding(true);
      setError("");
      setResult(null);
      setContentInfo(null);
      try {
        const text = await decodeQrFromImage(f);
        if (text === null) {
          setError(t("noQrFound"));
        } else {
          setResult(text);
          setContentInfo(detectContentType(text));
        }
      } catch {
        setError(t("noQrFound"));
      } finally {
        setDecoding(false);
      }
    },
    [t]
  );

  // 全局粘贴监听：支持从剪贴板直接粘贴图片解码
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const pastedFile = item.getAsFile();
          if (pastedFile) {
            handleFile(pastedFile);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFile]);

  // copied 复位定时器
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
  }, [result]);

  const handleCopyText = useCallback((text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
  }, []);

  const handleOpenLink = useCallback(() => {
    if (!result) return;
    window.open(result, "_blank", "noopener,noreferrer");
  }, [result]);

  const handleGenerateQr = useCallback(() => {
    if (!result) return;
    const path = window.location.pathname;
    const base = path.startsWith("/zh")
      ? "/zh/tools/qr-code"
      : "/tools/qr-code";
    router.push(`${base}?content=${encodeURIComponent(result)}`);
  }, [result, router]);

  const handleAddToContacts = useCallback(() => {
    if (!contentInfo) return;
    const { vcardName, vcardPhone, vcardEmail } = contentInfo.meta;
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${vcardName ?? ""}`,
      `TEL:${vcardPhone ?? ""}`,
      `EMAIL:${vcardEmail ?? ""}`,
      "END:VCARD",
    ].join("\n");
    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contact.vcf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [contentInfo]);

  const handleSendEmail = useCallback(() => {
    const email = contentInfo?.meta.email;
    if (!email) return;
    window.location.href = `mailto:${email}`;
  }, [contentInfo]);

  const handleCallPhone = useCallback(() => {
    const phone = contentInfo?.meta.phone;
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  }, [contentInfo]);

  const handleReset = useCallback(() => {
    setFile(null);
    setDecoding(false);
    setResult(null);
    setContentInfo(null);
    setError("");
    setCopied(false);
    setDragging(false);
  }, []);

  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    // 重置 value 允许重复选择同一文件
    e.target.value = "";
  };

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click();
  };

  // 类型徽章配色
  const badgeClass = (type: QrContentInfo["type"]): string => {
    switch (type) {
      case "url":
        return "bg-blue-100 text-blue-700";
      case "wifi":
        return "bg-purple-100 text-purple-700";
      case "vcard":
        return "bg-teal-100 text-teal-700";
      case "email":
        return "bg-orange-100 text-orange-700";
      case "phone":
        return "bg-green-100 text-green-700";
      case "text":
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const badgeLabel = (type: QrContentInfo["type"]): string => {
    switch (type) {
      case "url":
        return t("typeUrl");
      case "wifi":
        return t("typeWifi");
      case "vcard":
        return t("typeVcard");
      case "email":
        return t("typeEmail");
      case "phone":
        return t("typePhone");
      case "text":
      default:
        return t("typeText");
    }
  };

  const primaryBtn =
    "px-4 py-2 rounded-full text-sm font-medium bg-teal text-white hover:bg-teal-dark";
  const secondaryBtn =
    "px-4 py-2 rounded-full text-sm font-medium border border-border bg-bg-warm text-text-secondary hover:text-text hover:border-teal-light";

  const showResult = result && contentInfo && !decoding && !error;

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

      {/* 上传区 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleUploadAreaClick}
        className={[
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
          dragging
            ? "border-teal bg-teal/5"
            : "border-border bg-bg-article hover:border-teal-light",
        ].join(" ")}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <svg
          className="mx-auto w-10 h-10 text-text-secondary mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        <p className="text-sm font-medium text-text">{t("upload")}</p>
        <p className="mt-1 text-xs text-text-secondary">{t("uploadHint")}</p>
        <p className="mt-1 text-xs text-text-secondary">{t("pasteHint")}</p>
      </div>

      {/* 解码中 */}
      {decoding && (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-text-secondary">
          <svg
            className="animate-spin w-5 h-5 text-teal"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          {t("decoding")}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-3 px-4 py-2 rounded-full text-sm font-medium bg-white border border-red-200 text-red-700 hover:bg-red-100"
          >
            {t("tryAgain")}
          </button>
        </div>
      )}

      {/* 解码结果 */}
      {showResult && contentInfo && (
        <div className="mt-6 rounded-2xl border border-border bg-bg-article p-5 space-y-4">
          {/* 类型徽章 */}
          <div className="flex items-center justify-between">
            <span
              className={[
                "inline-block px-3 py-1 rounded-full text-xs font-semibold",
                badgeClass(contentInfo.type),
              ].join(" ")}
            >
              {badgeLabel(contentInfo.type)}
            </span>
          </div>

          {/* 内容显示 */}
          {contentInfo.type === "url" && (
            <a
              href={result ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="block break-all text-sm text-teal hover:underline"
            >
              {result}
            </a>
          )}

          {contentInfo.type === "wifi" && (
            <div className="space-y-2 text-sm">
              <div className="flex flex-col">
                <span className="text-xs text-text-secondary">
                  {t("wifiSsid")}
                </span>
                <span className="text-text break-all">
                  {contentInfo.meta.wifiSsid}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-text-secondary">
                  {t("wifiPassword")}
                </span>
                <span className="text-text break-all">
                  {contentInfo.meta.wifiPassword}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-text-secondary">
                  {t("wifiEnc")}
                </span>
                <span className="text-text break-all">
                  {contentInfo.meta.wifiEnc}
                </span>
              </div>
            </div>
          )}

          {contentInfo.type === "vcard" && (
            <div className="space-y-2 text-sm">
              <div className="flex flex-col">
                <span className="text-xs text-text-secondary">
                  {t("vcardName")}
                </span>
                <span className="text-text break-all">
                  {contentInfo.meta.vcardName}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-text-secondary">
                  {t("vcardPhone")}
                </span>
                <span className="text-text break-all">
                  {contentInfo.meta.vcardPhone}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-text-secondary">
                  {t("vcardEmail")}
                </span>
                <span className="text-text break-all">
                  {contentInfo.meta.vcardEmail}
                </span>
              </div>
            </div>
          )}

          {(contentInfo.type === "email" ||
            contentInfo.type === "phone" ||
            contentInfo.type === "text") && (
            <pre className="whitespace-pre-wrap break-all text-sm text-text">
              {result}
            </pre>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-3 pt-2">
            {contentInfo.type === "url" && (
              <>
                <button
                  type="button"
                  onClick={handleOpenLink}
                  className={primaryBtn}
                >
                  {t("openLink")}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={secondaryBtn}
                >
                  {copied ? t("copied") : t("copy")}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateQr}
                  className={secondaryBtn}
                >
                  {t("generateQr")}
                </button>
              </>
            )}

            {contentInfo.type === "wifi" && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(contentInfo.meta.wifiPassword ?? "")
                  }
                  className={primaryBtn}
                >
                  {t("copy")}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={secondaryBtn}
                >
                  {t("copyAll")}
                </button>
              </>
            )}

            {contentInfo.type === "vcard" && (
              <>
                <button
                  type="button"
                  onClick={handleAddToContacts}
                  className={primaryBtn}
                >
                  {t("addToContacts")}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={secondaryBtn}
                >
                  {copied ? t("copied") : t("copy")}
                </button>
              </>
            )}

            {contentInfo.type === "email" && (
              <>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  className={primaryBtn}
                >
                  {t("sendEmail")}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={secondaryBtn}
                >
                  {copied ? t("copied") : t("copy")}
                </button>
              </>
            )}

            {contentInfo.type === "phone" && (
              <>
                <button
                  type="button"
                  onClick={handleCallPhone}
                  className={primaryBtn}
                >
                  {t("callPhone")}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={secondaryBtn}
                >
                  {copied ? t("copied") : t("copy")}
                </button>
              </>
            )}

            {contentInfo.type === "text" && (
              <button
                type="button"
                onClick={handleCopy}
                className={primaryBtn}
              >
                {copied ? t("copied") : t("copy")}
              </button>
            )}
          </div>

          {/* 再来一张 */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-text-secondary hover:text-teal underline-offset-4 hover:underline"
            >
              {t("decodeAnother")}
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
