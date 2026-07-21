import { getTranslations, getMessages } from "next-intl/server";

interface UseCasesProps {
  // 工具 key，对应 useCases namespace 下的子对象，如 "pdfMerge"
  toolKey: string;
  locale: string;
}

// 工具页"使用场景"区块（server 组件，无 "use client"）。
// 取 useCases.{toolKey}.title / scenario1Title / scenario1Desc / ... / scenario3Desc。
// 若对应 toolKey 的 useCases 文案不存在则不渲染。
export default async function UseCases({ toolKey, locale }: UseCasesProps) {
  const t = await getTranslations({ locale, namespace: "useCases" });
  const messages = await getMessages();
  const useCases = (
    messages as Record<string, Record<string, unknown> | undefined>
  ).useCases as Record<string, unknown> | undefined;

  // 文案缺失时静默跳过，避免 next-intl 抛错
  if (!useCases || !useCases[toolKey]) return null;

  const scenarios = [1, 2, 3].map((n) => ({
    title: t(`${toolKey}.scenario${n}Title`),
    desc: t(`${toolKey}.scenario${n}Desc`),
  }));

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-text mb-4">
        {t(`${toolKey}.title`)}
      </h2>
      <div className="space-y-4">
        {scenarios.map((s, i) => (
          <div key={i}>
            <h3 className="text-base font-medium text-text mb-1">{s.title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
