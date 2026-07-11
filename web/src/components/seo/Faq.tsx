import { getTranslations } from "next-intl/server";

interface FaqProps {
  // 工具名 key，对应 faq namespace 下的前缀，如 "removeBackground"
  tool: string;
  locale: string;
}

// 工具页底部常见问题区块（server 组件），每个工具渲染 3 条问答
export default async function Faq({ tool, locale }: FaqProps) {
  const t = await getTranslations({ locale, namespace: "faq" });

  // 每个工具 3 条 Q/A，key 形如 removeBackground1 / removeBackground1a
  const questions = [1, 2, 3].map((n) => ({
    q: t(`${tool}${n}`),
    a: t(`${tool}${n}a`),
  }));

  return (
    <section className="mt-16 border-t border-border pt-12">
      <h2 className="text-2xl font-bold text-text mb-6">{t("title")}</h2>
      <div className="space-y-6">
        {questions.map((item, i) => (
          <div key={i}>
            <h3 className="font-semibold text-text mb-1">{item.q}</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              {item.a}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
