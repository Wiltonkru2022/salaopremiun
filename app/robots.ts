import type { MetadataRoute } from "next";
import {
  DOMINIO_BLOG,
  DOMINIO_CADASTRO,
  DOMINIO_RAIZ,
} from "@/lib/proxy/domain-config";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = `https://${DOMINIO_RAIZ}`;

  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/blog",
        "/salao",
        "/quem-somos",
        "/termos-de-uso",
        "/politica-de-privacidade",
        "/cadastro-salao",
      ],
      disallow: [
        "/app-cliente",
        "/app-profissional",
        "/admin-master",
        "/api",
        "/login",
        "/recuperar-senha",
        "/atualizar-senha",
        "/dashboard",
        "/agenda",
        "/caixa",
        "/comandas",
        "/clientes",
        "/profissionais",
        "/configuracoes",
        "/meu-plano",
        "/assinatura",
      ],
    },
    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `https://${DOMINIO_BLOG}/sitemap.xml`,
      `https://${DOMINIO_CADASTRO}/sitemap.xml`,
    ],
  };
}
