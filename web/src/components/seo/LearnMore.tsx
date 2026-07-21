import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { LANDING_PAGE_MAP } from "@/lib/landing-pages";

type Props = {
  slug: string; // landing page slug，如 "compress-pdf-to-100kb"
  toolKey: string; // 关联工具 key（备用 topic，如 landing 文案缺失时使用）
  locale: string;
};

// 工具页内链区块：引导用户从工具页跳转到对应的 SEO landing page
// 渲染 "Want to learn more about {topic}? Read our detailed guide" 链接
// topic 优先取 landing.h1（更具 SEO 价值的长尾关键词），否则回退到 tool 名
export default async function LearnMore({ slug, toolKey, locale }: Props) {
  const t = await getTranslations({ locale, namespace: "learnMore" });
  const tTools = await getTranslations({ locale, namespace: "tools" });

  const landing = LANDING_PAGE_MAP[slug];
  let topic = tTools(`${toolKey}.name`);
  if (landing) {
    try {
      const tLanding = await getTranslations({
        locale,
        namespace: `landing.${landing.i18nKey}`,
      });
      topic = tLanding("h1");
    } catch {
      // landing 文案缺失时回退到 tool 名
    }
  }

  const href =
    locale === "en" ? `/landing/${slug}` : `/zh/landing/${slug}`;
  return (
    <section className="mt-12 border-t border-border pt-8 text-center">
      <p className="text-text-secondary mb-3 text-sm">
        {t("title", { topic })}
      </p>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full border border-teal text-teal font-medium text-sm hover:bg-teal hover:text-white transition-colors"
      >
        {t("cta")}
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
