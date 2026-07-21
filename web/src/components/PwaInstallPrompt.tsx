"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, X } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

// `beforeinstallprompt` 不在标准 lib.dom.d.ts 中，按 MDN 接口形状本地声明。
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = "neetpix:pwa-install-dismissed";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari 不支持 display-mode 媒体查询，走 navigator.standalone
  if ((window.navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
  return false;
}

function isDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function markDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
}

export default function PwaInstallPrompt() {
  const t = useTranslations("pwaInstall");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // 已安装或近期已关闭提示的用户不再监听
    if (isStandalone() || isDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      trackEvent("pwa-installed");
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred) return null;

  const handleInstall = async () => {
    if (!deferred) return;
    trackEvent("pwa-install-clicked");
    try {
      // prompt() 只能调用一次，调用后事件失效
      await deferred.prompt();
      const choice = await deferred.userChoice;
      trackEvent("pwa-install-result", { outcome: choice.outcome });
    } catch {}
    setDeferred(null);
  };

  const handleDismiss = () => {
    markDismissed();
    trackEvent("pwa-install-dismissed");
    setDeferred(null);
  };

  return (
    <>
      {/* 桌面端：Header 内嵌按钮 */}
      <button
        type="button"
        onClick={handleInstall}
        title={t("tooltip")}
        className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-teal text-white hover:bg-teal-dark transition-colors text-sm font-medium"
      >
        <Download className="w-4 h-4" aria-hidden="true" />
        <span>{t("button")}</span>
      </button>

      {/* 移动端：底部浮动 banner */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-border shadow-lg">
        <div className="flex items-center gap-3 px-4 py-3">
          <p className="flex-1 min-w-0 text-sm text-text truncate">{t("banner")}</p>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t("dismiss")}
            className="shrink-0 p-1.5 rounded-full text-text-secondary hover:text-text hover:bg-bg-warm transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleInstall}
            className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-teal text-white hover:bg-teal-dark transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>{t("button")}</span>
          </button>
        </div>
      </div>
    </>
  );
}
