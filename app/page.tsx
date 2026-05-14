import HomeLanding from "@/components/site/HomeLanding";

export default function HomePage() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SalaoPremium",
    url: "https://salaopremiun.com.br",
    logo: "https://salaopremiun.com.br/logo.png",
    sameAs: ["https://salaopremiun.com.br"],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SalaoPremium",
    url: "https://salaopremiun.com.br",
    inLanguage: "pt-BR",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
      <HomeLanding />
    </>
  );
}
