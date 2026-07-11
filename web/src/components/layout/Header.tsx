'use client';

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import LocaleSwitcher from "./LocaleSwitcher";
import Logo from "../ui/Logo";

export default function Header() {
  const t = useTranslations("nav");
  const tTools = useTranslations("tools");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // 工具导航列表：name 使用字面量 key 访问，保证类型安全
  const tools = [
    { name: tTools("removeBackground.name"), href: "/tools/remove-background" },
    { name: tTools("imageToPdf.name"), href: "/tools/image-to-pdf" },
    { name: tTools("pdfToWord.name"), href: "/tools/pdf-to-word" },
    { name: tTools("screenshotTranslate.name"), href: "/tools/screenshot-translate" },
    { name: tTools("imageCompress.name"), href: "/tools/image-compress" },
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
            className="hidden sm:block relative"
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
              <div className="absolute top-full left-0 w-56 py-2 bg-white border border-border rounded-lg shadow-lg">
                {tools.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="block px-4 py-2 text-sm text-text-secondary hover:bg-bg-warm hover:text-text transition-colors"
                  >
                    {tool.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          {/* 移动端汉堡按钮 */}
          <button
            className="sm:hidden text-text"
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
        <div className="sm:hidden border-t border-border bg-white">
          <div className="px-4 py-2">
            {tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="block py-3 text-sm text-text-secondary hover:text-text border-b border-border last:border-0"
                onClick={() => setMobileOpen(false)}
              >
                {tool.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
