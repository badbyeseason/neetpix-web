interface JsonLdProps {
  name: string;
  description: string;
  url: string;
  locale?: string;
  type?: string; // schema.org 类型，默认 "WebApplication"
}

// WebApplication 结构化数据组件，用于 SEO 富结果
// file-transfer 等需用 "SoftwareApplication" 类型时传 type="SoftwareApplication"
export default function JsonLd({
  name,
  description,
  url,
  locale,
  type = "WebApplication",
}: JsonLdProps) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": type,
    name,
    description,
    url,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    brand: {
      "@type": "Brand",
      name: "Neetpix",
    },
  };
  if (locale) {
    jsonLd.inLanguage = locale;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
