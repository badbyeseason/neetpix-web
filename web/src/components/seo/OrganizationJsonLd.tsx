// 全站 WebSite + Organization 结构化数据
// - WebSite schema 带 SearchAction potentialAction，激活 Google Sitelinks Search Box
// - Organization schema 提供 Knowledge Graph 卡片所需信息
// 与 JsonLd.tsx (WebApplication) / Breadcrumb.tsx (BreadcrumbList) 不冲突，可同时输出
const BASE_URL = "https://neetpix.com";
const LOGO_URL = `${BASE_URL}/icon.png`;

type Props = {
  locale: string;
};

export default function OrganizationJsonLd({ locale }: Props) {
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Neetpix",
    url: BASE_URL,
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Neetpix",
    url: BASE_URL,
    logo: LOGO_URL,
    contactType: "customer support",
    sameAs: [],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
    </>
  );
}
