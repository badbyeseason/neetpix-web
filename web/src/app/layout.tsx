import type { Metadata, Viewport } from "next";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Analytics from "@/components/Analytics";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://neetpix.com"),
  title: {
    default: "Neetpix - Unpay the tools",
    template: "%s - Neetpix",
  },
  description:
    "Free premium office & media tools. No subscriptions. No paywalls.",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Neetpix",
  },
  openGraph: {
    type: "website",
    siteName: "Neetpix",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION,
    other: {
      "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION || "",
      "baidu-site-verification": process.env.NEXT_PUBLIC_BAIDU_VERIFICATION || "",
    },
  },
};

// theme-color 通过 viewport 导出（Next.js 16 规范）
export const viewport: Viewport = {
  themeColor: "#00897B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <VercelAnalytics />
      <SpeedInsights />
      <Analytics />
    </>
  );
}
