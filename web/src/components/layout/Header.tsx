'use client';

import { useTranslations } from "next-intl";
import Link from "next/link";
import LocaleSwitcher from "./LocaleSwitcher";
import Logo from "../ui/Logo";

export default function Header() {
  const t = useTranslations("nav");

  return (
    <header className="border-b border-border bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Logo className="w-7 h-7" />
          <span className="font-semibold text-lg tracking-tight text-text">Neetpix</span>
        </Link>
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
        </div>
      </nav>
    </header>
  );
}
