import Link from "next/link";

export type BreadcrumbItem = {
  name: string;
  // href 可选：未提供时该层级不可点击（如分类 hub 页尚未建立时的分类节点）。
  // 最后一个 item 始终视为当前页（不可点击，带 aria-current="page"）。
  href?: string;
};

type Props = {
  items: BreadcrumbItem[];
};

// 面包屑 UI + BreadcrumbList JSON-LD（server component）
// 与 JsonLd.tsx（WebApplication/SoftwareApplication）互不重叠，专责 BreadcrumbList schema
const BASE_URL = "https://neetpix.com";

function absoluteUrl(href: string): string {
  return href === "/" ? BASE_URL : `${BASE_URL}${href}`;
}

export default function Breadcrumb({ items }: Props) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => {
      const listItem: Record<string, unknown> = {
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
      };
      if (item.href) {
        listItem.item = absoluteUrl(item.href);
      }
      return listItem;
    }),
  };

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ol className="flex flex-wrap items-center gap-1 text-sm text-text-secondary">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const clickable = !isLast && Boolean(item.href);
          return (
            <li key={`${item.name}-${i}`} className="flex items-center gap-1">
              {clickable && item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-text transition-colors"
                >
                  {item.name}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "text-text font-medium" : undefined}
                >
                  {item.name}
                </span>
              )}
              {!isLast && (
                <svg
                  aria-hidden="true"
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="mx-1 text-text-secondary"
                >
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
