"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Logo from "@/components/ui/Logo";
import {
  generateQrPng,
  generateQrSvg,
  type QrErrorLevel,
} from "@/lib/qr-generator";

type TabKey = "text" | "url" | "email" | "wifi" | "vcard";
type WifiEnc = "WPA" | "WEP" | "nopass";

const SIZE_OPTIONS = [128, 256, 512, 1024];
const ERROR_LEVELS: QrErrorLevel[] = ["L", "M", "Q", "H"];

// 转义 WiFi 字段中的特殊字符（按 WIFI: 协议要求转义 \ ; , " :）
function escapeWifi(value: string): string {
  return value.replace(/([\\;,":])/g, "\\$1");
}

// 转义 vCard 字段中的特殊字符（按 RFC 6350 要求转义 \ ; , 和换行符）
function escapeVcard(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

interface FormValues {
  text: string;
  url: string;
  email: string;
  wifiSsid: string;
  wifiPassword: string;
  wifiEnc: WifiEnc;
  vcardName: string;
  vcardPhone: string;
  vcardEmail: string;
}

// 根据 tab + 表单值生成二维码内容；空输入返回空串
function buildContent(tab: TabKey, f: FormValues): string {
  switch (tab) {
    case "text":
      return f.text;
    case "url":
      return f.url;
    case "email":
      return f.email ? `mailto:${f.email}` : "";
    case "wifi": {
      if (!f.wifiSsid) return "";
      const ssid = escapeWifi(f.wifiSsid);
      const pwd = escapeWifi(f.wifiPassword);
      return `WIFI:T:${f.wifiEnc};S:${ssid};P:${pwd};;`;
    }
    case "vcard": {
      if (!f.vcardName && !f.vcardPhone && !f.vcardEmail) return "";
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${escapeVcard(f.vcardName)}`,
        `TEL:${escapeVcard(f.vcardPhone)}`,
        `EMAIL:${escapeVcard(f.vcardEmail)}`,
        "END:VCARD",
      ].join("\n");
    }
  }
}

export default function QrCodeClient() {
  const t = useTranslations("qrCode");

  const [tab, setTab] = useState<TabKey>("text");

  // 表单值
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wifiEnc, setWifiEnc] = useState<WifiEnc>("WPA");
  const [vcardName, setVcardName] = useState("");
  const [vcardPhone, setVcardPhone] = useState("");
  const [vcardEmail, setVcardEmail] = useState("");

  // 样式选项
  const [size, setSize] = useState(256);
  const [color, setColor] = useState("#000000");
  const [background, setBackground] = useState("#FFFFFF");
  const [errorLevel, setErrorLevel] = useState<QrErrorLevel>("M");

  // 预览
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [previewError, setPreviewError] = useState("");

  // refs：SVG blob URL 生命周期 + 防抖定时器
  const urlsRef = useRef<string[]>([]);

  // 组件卸载时统一释放所有 object URL
  useEffect(() => {
    return () => {
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      urlsRef.current = [];
    };
  }, []);

  // 根据当前 tab + 表单值生成二维码内容
  const content = buildContent(tab, {
    text,
    url,
    email,
    wifiSsid,
    wifiPassword,
    wifiEnc,
    vcardName,
    vcardPhone,
    vcardEmail,
  });

  // 防抖 200ms：内容或样式变化时重新生成 PNG dataURL
  useEffect(() => {
    if (!content) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQrDataUrl("");
      setPreviewError("");
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const dataUrl = await generateQrPng(content, {
          size,
          color,
          background,
          errorCorrectionLevel: errorLevel,
        });
        setQrDataUrl(dataUrl);
        setPreviewError("");
      } catch (err) {
        console.error("QR generation error:", err);
        setPreviewError(t("errorGenerate"));
        setQrDataUrl("");
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [content, size, color, background, errorLevel, t]);

  // 下载 PNG：复用已生成的 dataURL
  const handleDownloadPng = useCallback(() => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = "neetpix-qr.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [qrDataUrl]);

  // 下载 SVG：生成 SVG 字符串 → Blob → objectURL → 下载
  const handleDownloadSvg = useCallback(async () => {
    if (!content) return;
    try {
      const svg = await generateQrSvg(content, {
        size,
        color,
        background,
        errorCorrectionLevel: errorLevel,
      });
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const objUrl = URL.createObjectURL(blob);
      urlsRef.current.push(objUrl);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = "neetpix-qr.svg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // 延迟释放，确保下载已开始
      setTimeout(() => {
        URL.revokeObjectURL(objUrl);
        urlsRef.current = urlsRef.current.filter((u) => u !== objUrl);
      }, 1000);
    } catch (err) {
      console.error("QR SVG generation error:", err);
      setPreviewError(t("errorGenerate"));
    }
  }, [content, size, color, background, errorLevel, t]);

  // 选项按钮通用样式
  const optionBtn = (active: boolean) =>
    [
      "px-4 py-2 rounded-full text-sm font-medium transition-colors border",
      active
        ? "bg-teal text-white border-teal"
        : "bg-bg-warm text-text-secondary border-border hover:border-teal-light hover:text-text",
    ].join(" ");

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-border bg-bg-article text-text text-sm focus:outline-none focus:border-teal";

  const tabs: { key: TabKey; label: string }[] = [
    { key: "text", label: t("tabText") },
    { key: "url", label: t("tabUrl") },
    { key: "email", label: t("tabEmail") },
    { key: "wifi", label: t("tabWifi") },
    { key: "vcard", label: t("tabVcard") },
  ];

  // 容错等级本地化说明（用于 title 与 sr-only）
  const errorLevelLabel: Record<QrErrorLevel, string> = {
    L: t("errorLevelL"),
    M: t("errorLevelM"),
    Q: t("errorLevelQ"),
    H: t("errorLevelH"),
  };

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

      {/* tab 切换 */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex flex-wrap justify-center rounded-full border border-border bg-bg-warm p-1">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              type="button"
              onClick={() => setTab(tb.key)}
              className={[
                "px-5 py-2 rounded-full text-sm font-semibold transition-colors",
                tab === tb.key
                  ? "bg-teal text-white"
                  : "text-text-secondary hover:text-text",
              ].join(" ")}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 左栏：表单 + 样式控制 */}
        <div className="space-y-6">
          {/* 表单 */}
          <div className="rounded-2xl border border-border bg-bg-article p-5 space-y-4">
            {tab === "text" && (
              <div>
                <label className="block mb-2 text-sm font-medium text-text">
                  {t("textContent")}
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  placeholder={t("textContentPlaceholder")}
                  maxLength={1000}
                  autoComplete="off"
                  className={inputClass + " resize-y"}
                />
              </div>
            )}

            {tab === "url" && (
              <div>
                <label className="block mb-2 text-sm font-medium text-text">
                  {t("urlContent")}
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t("urlPlaceholder")}
                  maxLength={2048}
                  autoComplete="url"
                  className={inputClass}
                />
              </div>
            )}

            {tab === "email" && (
              <div>
                <label className="block mb-2 text-sm font-medium text-text">
                  {t("emailAddress")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  maxLength={254}
                  autoComplete="email"
                  className={inputClass}
                />
                <p className="mt-2 text-xs text-text-secondary">
                  {t("hintEmail")}
                </p>
              </div>
            )}

            {tab === "wifi" && (
              <div className="space-y-3">
                <div>
                  <label className="block mb-2 text-sm font-medium text-text">
                    {t("wifiSsid")}
                  </label>
                  <input
                    type="text"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    placeholder={t("placeholderWifiSsid")}
                    maxLength={32}
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-text">
                    {t("wifiPassword")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      placeholder={t("placeholderWifiPassword")}
                      maxLength={63}
                      autoComplete="new-password"
                      className={inputClass + " pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? t("hidePassword") : t("showPassword")
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text focus:outline-none focus:text-teal"
                    >
                      {showPassword ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-text">
                    {t("wifiEncryption")}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(["WPA", "WEP", "nopass"] as WifiEnc[]).map((enc) => (
                      <button
                        key={enc}
                        type="button"
                        onClick={() => setWifiEnc(enc)}
                        className={optionBtn(wifiEnc === enc)}
                      >
                        {enc === "nopass" ? t("wifiNone") : enc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "vcard" && (
              <div className="space-y-3">
                <div>
                  <label className="block mb-2 text-sm font-medium text-text">
                    {t("vcardName")}
                  </label>
                  <input
                    type="text"
                    value={vcardName}
                    onChange={(e) => setVcardName(e.target.value)}
                    placeholder={t("placeholderVcardName")}
                    maxLength={100}
                    autoComplete="name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-text">
                    {t("vcardPhone")}
                  </label>
                  <input
                    type="tel"
                    value={vcardPhone}
                    onChange={(e) => setVcardPhone(e.target.value)}
                    placeholder={t("placeholderVcardPhone")}
                    maxLength={50}
                    autoComplete="tel"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-text">
                    {t("vcardEmail")}
                  </label>
                  <input
                    type="email"
                    value={vcardEmail}
                    onChange={(e) => setVcardEmail(e.target.value)}
                    placeholder={t("placeholderVcardEmail")}
                    maxLength={254}
                    autoComplete="email"
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 样式控制 */}
          <div className="rounded-2xl border border-border bg-bg-article p-5 space-y-4">
            {/* 尺寸 */}
            <div>
              <p className="mb-2 text-sm font-medium text-text">
                {t("size")}
              </p>
              <div className="flex flex-wrap gap-2">
                {SIZE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={optionBtn(size === s)}
                  >
                    {s}px
                  </button>
                ))}
              </div>
            </div>

            {/* 容错等级 */}
            <div>
              <p className="mb-2 text-sm font-medium text-text">
                {t("errorCorrection")}
              </p>
              <div className="flex flex-wrap gap-2">
                {ERROR_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setErrorLevel(lvl)}
                    title={errorLevelLabel[lvl]}
                    className={optionBtn(errorLevel === lvl)}
                  >
                    {lvl}
                    <span className="sr-only"> {errorLevelLabel[lvl]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 前景色 / 背景色 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-2 text-sm font-medium text-text">
                  {t("foregroundColor")}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 shrink-0 rounded-lg border border-border cursor-pointer bg-bg-warm p-1"
                    aria-label={t("foregroundColor")}
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-bg-article text-text text-sm focus:outline-none focus:border-teal"
                  />
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-text">
                  {t("backgroundColor")}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    className="w-10 h-10 shrink-0 rounded-lg border border-border cursor-pointer bg-bg-warm p-1"
                    aria-label={t("backgroundColor")}
                  />
                  <input
                    type="text"
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-bg-article text-text text-sm focus:outline-none focus:border-teal"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右栏：预览 + 下载 */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-bg-article p-5">
            <p className="mb-3 text-sm font-medium text-text">{t("preview")}</p>
            <div className="flex items-center justify-center rounded-xl bg-white p-6 min-h-[280px]">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={t("previewAlt")}
                  className="max-w-full h-auto"
                  style={{ maxWidth: size }}
                />
              ) : (
                <p className="text-center text-sm text-text-secondary">
                  {previewError || t("emptyHint")}
                </p>
              )}
            </div>
          </div>

          {/* 下载按钮 */}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={!qrDataUrl}
              className={[
                "inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                !qrDataUrl
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
              {t("downloadPng")}
            </button>
            <button
              type="button"
              onClick={handleDownloadSvg}
              disabled={!content}
              className={[
                "inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors border disabled:opacity-50 disabled:cursor-not-allowed",
                !content
                  ? "bg-bg-article text-text-secondary border-border cursor-not-allowed"
                  : "bg-bg-warm text-text border-border hover:border-teal-light",
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
              {t("downloadSvg")}
            </button>
          </div>

          {previewError && (
            <p className="text-center text-sm text-coral">{previewError}</p>
          )}
        </div>
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
