import { getTranslations } from "next-intl/server";

type Variant = "local" | "p2p";

/**
 * 隐私徽章 — 在工具页顶部展示，透明告知用户数据处理方式。
 * - `local`：100% 浏览器本地处理（teal 主色 + 圆点）
 * - `p2p`：端到端 P2P 直传（success 亮绿 + 盾牌图标，文案与 tooltip 不同）
 */
export default async function PrivacyBadge({
  locale,
  variant = "local",
}: {
  locale: string;
  variant?: Variant;
}) {
  const t = await getTranslations({ locale });
  const isP2p = variant === "p2p";

  const labelKey = isP2p ? "badge.p2pDirect" : "badge.localProcessing";
  const descKey = isP2p ? "badge.p2pDirectDesc" : "badge.localProcessingDesc";

  // 调色：local 用 teal（品牌主色），p2p 用 success（更亮绿）以区分
  const accentClass = isP2p
    ? "text-success bg-success/10"
    : "text-teal bg-teal/10";

  return (
    <div className="flex justify-center mb-6">
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium ${accentClass} px-3 py-1.5 rounded-full`}
        title={t(descKey)}
      >
        {isP2p ? (
          // 盾牌图标（与 local 的圆点区分）
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.618 5.884l-8-3.6a2 2 0 00-1.618 0l-8 3.6A2 2 0 002 7.692V12c0 5.523 3.832 9.832 8.5 11.286a2 2 0 001 0C16.168 21.832 20 17.523 20 12V7.692a2 2 0 00-1.382-1.808z"
            />
          </svg>
        ) : (
          <span
            className="w-1.5 h-1.5 rounded-full bg-teal"
            aria-hidden="true"
          />
        )}
        {t(labelKey)}
        {/* p2p 描述较长，仅在 tooltip 中展示；local 描述较短，inline 展示 */}
        {!isP2p && (
          <span className="text-text-secondary font-normal">
            · {t(descKey)}
          </span>
        )}
      </span>
    </div>
  );
}
