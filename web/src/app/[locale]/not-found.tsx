import Link from "next/link";
import { getTranslations } from "next-intl/server";

// [locale] 段下的本地化 404 页面。
// 仅当 [locale] 段匹配时生效（如 /zh/不存在页面），
// 根级 app/not-found.tsx 仍作为无效 locale 的最终 fallback。
const popularTools = [
  { key: "pdfMerge", href: "/tools/pdf-merge" },
  { key: "pdfToWord", href: "/tools/pdf-to-word" },
  { key: "removeBackground", href: "/tools/remove-background" },
  { key: "imageCompress", href: "/tools/image-compress" },
  { key: "qrCode", href: "/tools/qr-code" },
] as const;

export default async function NotFound() {
  const t = await getTranslations("errors.notFound");
  const tTools = await getTranslations("tools");

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl text-center">
        <div
          aria-hidden="true"
          className="text-[8rem] sm:text-[10rem] leading-none font-extrabold text-teal/20 select-none mb-4"
        >
          404
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-text mb-3">
          {t("title")}
        </h1>
        <p className="text-text-secondary mb-8 max-w-md mx-auto">
          {t("description")}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal text-white font-semibold text-sm hover:bg-teal-dark transition-colors mb-12"
        >
          {t("cta")}
        </Link>

        <h2 className="text-lg font-semibold text-text mb-4">
          {t("popularTools")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {popularTools.map((tool) => (
            <Link
              key={tool.key}
              href={tool.href}
              className="block text-left p-4 rounded-xl border border-border bg-bg-warm hover:border-teal hover:bg-teal-bg transition-colors"
            >
              <div className="font-semibold text-text text-sm">
                {tTools(`${tool.key}.name`)}
              </div>
              <div className="text-text-secondary text-xs mt-1 line-clamp-2">
                {tTools(`${tool.key}.desc`)}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
