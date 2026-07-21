"use client";

import { trackEvent } from "@/lib/analytics";

type Props = {
  href: string;
  label: string;
  slug: string;
  targetTool: string;
};

// Landing page CTA 按钮：点击跳转到关联工具页，并触发 GA4 事件埋点
// 即使 analytics 模块缺失或埋点失败，CTA 仍正常跳转
export default function LandingCta({ href, label, slug, targetTool }: Props) {
  const handleClick = () => {
    try {
      trackEvent("landing-cta-clicked", { slug, targetTool });
    } catch {
      // 埋点失败不影响跳转
    }
  };
  return (
    <a
      href={href}
      onClick={handleClick}
      className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-teal text-white font-semibold text-base sm:text-lg hover:bg-teal-dark transition-colors shadow-md"
    >
      {label}
    </a>
  );
}
