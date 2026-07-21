/**
 * 自定义事件埋点（兼容 GA4 gtag + 百度统计 _hmt）
 * SSR 安全：在服务端调用时静默返回
 */

type GtagCommand = (...args: unknown[]) => void;

interface AnalyticsWindow extends Window {
  gtag?: GtagCommand;
  _hmt?: unknown[];
}

export function trackEvent(eventName: string, payload?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const w = window as AnalyticsWindow;

  // GA4
  if (typeof w.gtag === "function") {
    try {
      w.gtag("event", eventName, payload || {});
    } catch {}
  }

  // 百度统计（_hmt.push(['_trackEvent', category, action, opt_label, opt_value])）
  if (Array.isArray(w._hmt)) {
    try {
      w._hmt.push(["_trackEvent", "user_action", eventName, payload ? JSON.stringify(payload) : ""]);
    } catch {}
  }

  // 调试输出（仅开发环境）
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", eventName, payload);
  }
}
