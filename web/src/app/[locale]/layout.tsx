import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import { routing } from "@/i18n/routing";
import "../globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Feedback from "@/components/Feedback";
import CommandPalette from "@/components/layout/CommandPalette";
import BookmarkHint from "@/components/BookmarkHint";
import ShareToast from "@/components/ShareToast";
import ShareLandedListener from "@/components/ShareLandedListener";
import OrganizationJsonLd from "@/components/seo/OrganizationJsonLd";
import { FavoritesProvider } from "@/hooks/useFavorites";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html
      lang={locale}
      className={`h-full antialiased ${geist.variable}`}
    >
      <body className="min-h-full flex flex-col">
        <OrganizationJsonLd locale={locale} />
        <NextIntlClientProvider>
          <FavoritesProvider>
            <Suspense fallback={null}>
              <ShareLandedListener />
            </Suspense>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <Feedback />
            <CommandPalette />
            <BookmarkHint />
            <ShareToast />
          </FavoritesProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
