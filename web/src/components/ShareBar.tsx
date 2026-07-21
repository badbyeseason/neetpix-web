"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { generateQrPng } from "@/lib/qr-generator";

export default function ShareBar() {
  const t = useTranslations("share");
  const [copied, setCopied] = useState(false);
  const [showWechat, setShowWechat] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [canShare, setCanShare] = useState(false);
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(window.location.href);
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  // 生成微信二维码
  useEffect(() => {
    if (!showWechat || !pageUrl) return;
    let cancelled = false;
    generateQrPng(pageUrl, { size: 240, color: "#000000", background: "#FFFFFF", errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [showWechat, pageUrl]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [pageUrl]);

  const handleSystemShare = useCallback(async () => {
    try {
      await navigator.share({ title: document.title, url: pageUrl });
    } catch {}
  }, [pageUrl]);

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(document.title)}&url=${encodeURIComponent(pageUrl)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(t("emailSubject"))}&body=${encodeURIComponent(t("emailBody") + "\n\n" + pageUrl)}`;

  // 按钮样式
  const btnClass = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-border bg-bg-warm text-text-secondary hover:text-text hover:border-teal-light transition-colors";

  return (
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="text-lg font-bold text-text mb-4 text-center">{t("title")}</h2>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={handleCopy} className={btnClass}>
          {/* 复制图标 */}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          {copied ? t("copied") : t("copyLink")}
        </button>
        {canShare && (
          <button type="button" onClick={handleSystemShare} className={btnClass}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-5.464 0M15 8a3 3 0 10-6 0" /></svg>
            {t("systemShare")}
          </button>
        )}
        <button type="button" onClick={() => setShowWechat(true)} className={btnClass}>
          <span className="text-base">💬</span>
          {t("wechat")}
        </button>
        <a href={tweetUrl} target="_blank" rel="noopener" className={btnClass}>
          <span className="text-base">🐦</span>
          {t("twitter")}
        </a>
        <a href={emailUrl} className={btnClass}>
          <span className="text-base">✉️</span>
          {t("email")}
        </a>
      </div>

      {/* 微信 QR 模态 */}
      {showWechat && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wechat-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowWechat(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-xs w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="wechat-modal-title" className="text-lg font-bold text-text mb-2">{t("wechatTitle")}</h3>
            <p className="text-sm text-text-secondary mb-4">{t("wechatHint")}</p>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="mx-auto w-48 h-48" />
            ) : (
              <div className="mx-auto w-48 h-48 flex items-center justify-center text-text-secondary text-sm">Loading...</div>
            )}
            <button
              type="button"
              onClick={() => setShowWechat(false)}
              className="mt-4 px-4 py-2 rounded-full bg-bg-warm text-text text-sm hover:bg-bg-article"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
