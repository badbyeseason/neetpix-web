'use client';

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import LocaleSwitcher from "./LocaleSwitcher";
import Logo from "../ui/Logo";
import StarButton from "../ui/StarButton";

export default function Header() {
  const t = useTranslations("nav");
  const tTools = useTranslations("tools");
  const tBadges = useTranslations("badges");
  const tPalette = useTranslations("commandPalette");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // 工具按二级分类组织：name 使用字面量 key 访问，保证类型安全
  const toolCategories: { category: string; tools: { key: string; name: string; desc: string; href: string; badge?: "new" | "hot" }[] }[] = [
    {
      category: t("categoryPdf"),
      tools: [
        { key: "pdfToWord", name: tTools("pdfToWord.name"), desc: tTools("pdfToWord.desc"), href: "/tools/pdf-to-word", badge: "hot" },
        { key: "wordToPdf", name: tTools("wordToPdf.name"), desc: tTools("wordToPdf.desc"), href: "/tools/word-to-pdf", badge: "hot" },
        { key: "imageToPdf", name: tTools("imageToPdf.name"), desc: tTools("imageToPdf.desc"), href: "/tools/image-to-pdf" },
        { key: "pdfMerge", name: tTools("pdfMerge.name"), desc: tTools("pdfMerge.desc"), href: "/tools/pdf-merge" },
        { key: "pdfSplit", name: tTools("pdfSplit.name"), desc: tTools("pdfSplit.desc"), href: "/tools/pdf-split" },
        { key: "pdfCompress", name: tTools("pdfCompress.name"), desc: tTools("pdfCompress.desc"), href: "/tools/pdf-compress" },
        { key: "pdfWatermark", name: tTools("pdfWatermark.name"), desc: tTools("pdfWatermark.desc"), href: "/tools/pdf-watermark" },
        { key: "pdfPageNumbers", name: tTools("pdfPageNumbers.name"), desc: tTools("pdfPageNumbers.desc"), href: "/tools/pdf-page-numbers" },
        { key: "pdfEncrypt", name: tTools("pdfEncrypt.name"), desc: tTools("pdfEncrypt.desc"), href: "/tools/pdf-encrypt" },
        { key: "pdfDecrypt", name: tTools("pdfDecrypt.name"), desc: tTools("pdfDecrypt.desc"), href: "/tools/pdf-decrypt" },
        { key: "pdfCrop", name: tTools("pdfCrop.name"), desc: tTools("pdfCrop.desc"), href: "/tools/pdf-crop", badge: "new" },
        { key: "pdfRotate", name: tTools("pdfRotate.name"), desc: tTools("pdfRotate.desc"), href: "/tools/pdf-rotate", badge: "new" },
      ],
    },
    {
      category: t("categoryImage"),
      tools: [
        { key: "removeBackground", name: tTools("removeBackground.name"), desc: tTools("removeBackground.desc"), href: "/tools/remove-background", badge: "hot" },
        { key: "imageCompress", name: tTools("imageCompress.name"), desc: tTools("imageCompress.desc"), href: "/tools/image-compress" },
        { key: "imageWatermark", name: tTools("imageWatermark.name"), desc: tTools("imageWatermark.desc"), href: "/tools/image-watermark" },
        { key: "imageConvert", name: tTools("imageConvert.name"), desc: tTools("imageConvert.desc"), href: "/tools/image-convert", badge: "new" },
        { key: "imageExif", name: tTools("imageExif.name"), desc: tTools("imageExif.desc"), href: "/tools/image-exif", badge: "new" },
        { key: "imageResize", name: tTools("imageResize.name"), desc: tTools("imageResize.desc"), href: "/tools/image-resize", badge: "new" },
        { key: "imageIdPhoto", name: tTools("imageIdPhoto.name"), desc: tTools("imageIdPhoto.desc"), href: "/tools/image-id-photo", badge: "new" },
        { key: "imageOcr", name: tTools("imageOcr.name"), desc: tTools("imageOcr.desc"), href: "/tools/image-ocr", badge: "new" },
        { key: "imageBlur", name: tTools("imageBlur.name"), desc: tTools("imageBlur.desc"), href: "/tools/image-blur", badge: "new" },
        { key: "imageGridSplit", name: tTools("imageGridSplit.name"), desc: tTools("imageGridSplit.desc"), href: "/tools/image-grid-split", badge: "new" },
      ],
    },
    {
      category: t("categoryTranslate"),
      tools: [
        { key: "screenshotTranslate", name: tTools("screenshotTranslate.name"), desc: tTools("screenshotTranslate.desc"), href: "/tools/screenshot-translate" },
      ],
    },
    {
      category: t("categoryGenerator"),
      tools: [
        { key: "qrCode", name: tTools("qrCode.name"), desc: tTools("qrCode.desc"), href: "/tools/qr-code", badge: "new" },
        { key: "chartGenerator", name: tTools("chartGenerator.name"), desc: tTools("chartGenerator.desc"), href: "/tools/chart-generator", badge: "new" },
      ],
    },
  ];

  const openPalette = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  return (
    <header className="border-b border-border bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo className="w-7 h-7" />
            <span className="font-semibold text-lg tracking-tight text-text">Neetpix</span>
          </Link>
          {/* 桌面端工具下拉菜单（hover 展开） */}
          <div
            className="hidden md:block relative"
            onMouseEnter={() => setToolsOpen(true)}
            onMouseLeave={() => setToolsOpen(false)}
          >
            <button className="flex items-center gap-1 text-sm text-text-secondary hover:text-text transition-colors py-2">
              {t("tools")}
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className={"transition-transform " + (toolsOpen ? "rotate-180" : "")}
              >
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {toolsOpen && (
              <div className="absolute top-full left-0 w-[min(880px,calc(100vw-2rem))] py-2 bg-white border border-border rounded-lg shadow-lg max-h-[calc(100vh-5rem)] overflow-y-auto">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 px-2">
                  {toolCategories.map((group) => (
                    <div key={group.category} className="px-1">
                      <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                        {group.category}
                      </p>
                      {group.tools.map((tool) => (
                        <Link
                          key={tool.href}
                          href={tool.href}
                          className="group flex items-start gap-1 px-3 py-2 rounded-md hover:bg-bg-warm transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-text">
                              {tool.name}
                              {tool.badge && (
                                <span
                                  className={
                                    "ml-1.5 inline-block text-[10px] font-medium px-1 py-0.5 rounded-full align-middle " +
                                    (tool.badge === "new"
                                      ? "bg-teal/10 text-teal"
                                      : "bg-coral/10 text-coral")
                                  }
                                >
                                  {tBadges(tool.badge)}
                                </span>
                              )}
                            </span>
                            <span className="block text-xs text-text-secondary mt-0.5">{tool.desc}</span>
                          </div>
                          <StarButton toolKey={tool.key} className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100" />
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* 搜索按钮：所有屏幕尺寸可见 */}
          <button
            type="button"
            onClick={openPalette}
            aria-label={tPalette("openHint")}
            title={tPalette("openHint")}
            className="inline-flex items-center gap-2 h-9 pl-2.5 pr-2 sm:pr-3 rounded-full border border-border bg-bg-warm hover:bg-bg-article transition-colors text-text-secondary hover:text-text"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
            </svg>
            <kbd className="hidden sm:inline-flex items-center text-[11px] font-medium text-text-secondary">
              ⌘K
            </kbd>
          </button>
          <LocaleSwitcher />
          {/* 移动端汉堡按钮 */}
          <button
            className="md:hidden text-text"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </nav>
      {/* 移动端展开菜单 */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-white">
          <div className="px-4 py-2">
            {toolCategories.map((group) => (
              <div key={group.category} className="py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-1">
                  {group.category}
                </p>
                {group.tools.map((tool) => (
                  <div
                    key={tool.href}
                    className="flex items-center justify-between gap-2 py-2 text-sm text-text-secondary hover:text-text border-b border-border last:border-0"
                  >
                    <Link
                      href={tool.href}
                      className="flex-1"
                      onClick={() => setMobileOpen(false)}
                    >
                      {tool.name}
                    </Link>
                    <StarButton toolKey={tool.key} className="w-4 h-4 shrink-0" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
