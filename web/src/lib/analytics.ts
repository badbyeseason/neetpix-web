/**
 * GA4 事件追踪工具
 * 在未配置 GA4 时不执行任何操作
 */

type GtagCommand = (...args: unknown[]) => void;

interface GtagWindow extends Window {
  gtag?: GtagCommand;
}

function getGtag(): GtagCommand | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as GtagWindow).gtag;
}

export function trackPageView(url: string) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId) return;
  // GA4 自动追踪 page_view，此函数用于手动追踪 SPA 路由变化
  const gtag = getGtag();
  if (typeof gtag === "function") {
    gtag("config", gaId, { page_path: url });
  }
}

export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number,
) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId) return;
  const gtag = getGtag();
  if (typeof gtag === "function") {
    gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}
