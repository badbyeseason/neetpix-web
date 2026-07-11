interface JsonLdProps {
  name: string;
  description: string;
  url: string;
}

// WebApplication 结构化数据组件，用于 SEO 富结果
export default function JsonLd({ name, description, url }: JsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
