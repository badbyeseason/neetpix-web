import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import "../globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Feedback from "@/components/Feedback";
import CommandPalette from "@/components/layout/CommandPalette";
import { FavoritesProvider } from "@/hooks/useFavorites";

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
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <FavoritesProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <Feedback />
            <CommandPalette />
          </FavoritesProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
