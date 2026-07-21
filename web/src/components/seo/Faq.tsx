import { getTranslations, getMessages } from "next-intl/server";

interface FaqProps {
  // 工具名 key，对应 faq namespace 下的前缀，如 "removeBackground"
  tool: string;
  locale: string;
}

// 工具页底部常见问题区块（server 组件）。
// 动态检测 1..N 条 Q&A（最多 6 条），缺失则停止；至少 1 条才渲染区块。
export default async function Faq({ tool, locale }: FaqProps) {
  const t = await getTranslations({ locale, namespace: "faq" });
  const messages = await getMessages();
  const faq = (messages as Record<string, Record<string, string> | undefined>)
    .faq;

  const questions: { q: string; a: string }[] = [];
  for (let n = 1; n <= 6; n++) {
    const qKey = `${tool}${n}`;
    const aKey = `${tool}${n}a`;
    if (faq?.[qKey] && faq?.[aKey]) {
      questions.push({ q: t(qKey), a: t(aKey) });
    } else {
      break;
    }
  }

  if (questions.length === 0) return null;

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section className="mt-16 border-t border-border pt-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
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
