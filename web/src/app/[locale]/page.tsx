import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Logo from "@/components/ui/Logo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });
  return {
    title: "Neetpix - Unpay the tools",
    description: t("subtitle"),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const tools = [
    { key: "removeBackground", href: "/tools/remove-background", gradient: "from-teal/10 to-teal-bg" },
    { key: "screenshotTranslate", href: "#", gradient: "from-coral/10 to-teal-bg", comingSoon: true },
    { key: "pdfToWord", href: "#", gradient: "from-teal/10 to-bg-article", comingSoon: true },
    { key: "imageCompress", href: "#", gradient: "from-teal-bg to-bg-article", comingSoon: true },
  ];

  return (
    <div className="flex flex-col">
      <section className="py-20 sm:py-28 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center mb-6">
            <Logo className="w-16 h-16" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-text leading-[1.1]">
            {t("hero.title")}
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-text-secondary max-w-xl mx-auto leading-relaxed">
            {t("hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/tools/remove-background"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal text-white font-semibold text-sm hover:bg-teal-dark transition-colors"
            >
              {t("hero.cta")}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-bg-warm">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-text mb-12">
            {t("tools.title")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {tools.map((tool) => (
              <Link
                key={tool.key}
                href={tool.href}
                className={"group relative rounded-2xl p-6 sm:p-8 bg-gradient-to-br " + tool.gradient + " border border-border hover:border-teal-light transition-all hover:shadow-md"}
              >
                <h3 className="text-lg font-semibold text-text">
                  {t("tools." + tool.key + ".name")}
                  {tool.comingSoon && (
                    <span className="ml-2 text-xs font-medium text-text-secondary bg-bg-article px-2 py-0.5 rounded-full">
                      Soon
                    </span>
                  )}
                </h3>
                <p className="mt-1 text-sm text-text-secondary leading-relaxed">
                  {t("tools." + tool.key + ".desc")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-text">Your Privacy Matters</h2>
          <p className="mt-2 text-text-secondary max-w-lg mx-auto">
            All image processing happens directly in your browser. Your files never touch our servers.
          </p>
        </div>
      </section>
    </div>
  );
}