import type { MetadataRoute } from "next";
import {
  DOMINIO_BLOG,
  DOMINIO_CADASTRO,
  DOMINIO_RAIZ,
} from "@/lib/proxy/domain-config";

function getBaseUrl() {
  const configured = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (configured) {
    return new URL(configured);
  }

  return new URL(`https://${DOMINIO_RAIZ}`);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const blogBaseUrl = new URL(`https://${DOMINIO_BLOG}`);
  const now = new Date();
  const staticRoutes = [
    "",
    "/quem-somos",
    "/termos-de-uso",
    "/politica-de-privacidade",
  ];

  return [
    {
      url: `https://${DOMINIO_CADASTRO}/cadastro-salao`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.65,
    },
    ...staticRoutes.map((path, index) => ({
      url: new URL(path || "/", baseUrl).toString(),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: index === 0 ? 1 : 0.6,
    })),
    {
      url: new URL("/", blogBaseUrl).toString(),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
  ];
}
