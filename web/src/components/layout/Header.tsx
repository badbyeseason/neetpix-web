'use client';

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import LocaleSwitcher from "./LocaleSwitcher";
import Logo from "../ui/Logo";

export default function Header() {
  const t = useTranslations("nav");
  const tTools = useTranslations("tools");
  const tBadges = useTranslations("badges");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // 工具按二级分类组织：name 使用字面量 key 访问，保证类型安全
  const toolCategories: { category: string; tools: { name: string; desc: string; href: string; badge?: "new" | "hot" }[] }[] = [
    {
      category: t("categoryPdf"),
      tools: [
        { name: tTools("pdfToWord.name"), desc: tTools("pdfToWord.desc"), href: "/tools/pdf-to-word", badge: "hot" },
        { name: tTools("wordToPdf.name"), desc: tTools("wordToPdf.desc"), href: "/tools/word-to-pdf", badge: "hot" },
        { name: tTools("imageToPdf.name"), desc: tTools("imageToPdf.desc"), href: "/tools/image-to-pdf" },
        { name: tTools("pdfMerge.name"), desc: tTools("pdfMerge.desc"), href: "/tools/pdf-merge" },
        { name: tTools("pdfSplit.name"), desc: tTools("pdfSplit.desc"), href: "/tools/pdf-split" },
        { name: tTools("pdfCompress.name"), desc: tTools("pdfCompress.desc"), href: "/tools/pdf-compress" },
        { name: tTools("pdfWatermark.name"), desc: tTools("pdfWatermark.desc"), href: "/tools/pdf-watermark" },
        { name: tTools("pdfPageNumbers.name"), desc: tTools("pdfPageNumbers.desc"), href: "/tools/pdf-page-numbers" },
        { name: tTools("pdfEncrypt.name"), desc: tTools("pdfEncrypt.desc"), href: "/tools/pdf-encrypt" },
        { name: tTools("pdfDecrypt.name"), desc: tTools("pdfDecrypt.desc"), href: "/tools/pdf-decrypt" },
        { name: tTools("pdfCrop.name"), desc: tTools("pdfCrop.desc"), href: "/tools/pdf-crop", badge: "new" },
        { name: tTools("pdfRotate.name"), desc: tTools("pdfRotate.desc"), href: "/tools/pdf-rotate", badge: "new" },
      ],
    },
    {
      category: t("categoryImage"),
      tools: [
        { name: tTools("removeBackground.name"), desc: tTools("removeBackground.desc"), href: "/tools/remove-background", badge: "hot" },
        { name: tTools("imageCompress.name"), desc: tTools("imageCompress.desc"), href: "/tools/image-compress" },
        { name: tTools("imageWatermark.name"), desc: tTools("imageWatermark.desc"), href: "/tools/image-watermark" },
        { name: tTools("imageConvert.name"), desc: tTools("imageConvert.desc"), href: "/tools/image-convert", badge: "new" },
        { name: tTools("imageExif.name"), desc: tTools("imageExif.desc"), href: "/tools/image-exif", badge: "new" },
        { name: tTools("imageResize.name"), desc: tTools("imageResize.desc"), href: "/tools/image-resize", badge: "new" },
      ],
    },
    {
      category: t("categoryTranslate"),
      tools: [
        { name: tTools("screenshotTranslate.name"), desc: tTools("screenshotTranslate.desc"), href: "/tools/screenshot-translate" },
      ],
    },
  ];

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
              <div className="absolute top-full left-0 w-[min(680px,calc(100vw-2rem))] py-2 bg-white border border-border rounded-lg shadow-lg max-h-[calc(100vh-5rem)] overflow-y-auto">
                <div className="grid grid-cols-3 gap-1 px-2">
                  {toolCategories.map((group) => (
                    <div key={group.category} className="px-1">
                      <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                        {group.category}
                      </p>
                      {group.tools.map((tool) => (
                        <Link
                          key={tool.href}
                          href={tool.href}
                          className="block px-3 py-2 rounded-md hover:bg-bg-warm transition-colors"
                        >
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
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
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
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="block py-2 text-sm text-text-secondary hover:text-text border-b border-border last:border-0"
                    onClick={() => setMobileOpen(false)}
                  >
                    {tool.name}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
