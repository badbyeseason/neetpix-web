"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

/**
 * 监听 URL 中的 utm_source=neetpix-share 参数，
 * 触发 share_landed 事件以监测分享回流，
 * 触发后清除 URL 中的 utm 参数（保留其他参数）。
 *
 * 必须在 client component 中使用，已在 [locale]/layout.tsx 中接入。
 */
export default function ShareLandedListener() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // 防止 StrictMode 双触发或重复触发
  const firedRef = useRef(false);

  useEffect(() => {
    const utmSource = searchParams.get("utm_source");
    if (utmSource !== "neetpix-share") return;
    if (firedRef.current) return;
    firedRef.current = true;

    const utmMedium = searchParams.get("utm_medium");
    trackEvent("share_landed", {
      source: "neetpix-share",
      medium: utmMedium,
    });

    // 清除 URL 中的 utm 参数（保留其他参数）
    const params = new URLSearchParams(searchParams.toString());
    params.delete("utm_source");
    params.delete("utm_medium");
    params.delete("utm_campaign");
    params.delete("utm_term");
    params.delete("utm_content");
    const remaining = params.toString();
    const cleanUrl = remaining ? `${pathname}?${remaining}` : pathname;
    router.replace(cleanUrl);
  }, [searchParams, pathname, router]);

  return null;
}
