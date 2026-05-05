import type { MetadataRoute } from "next";
import { DOMINIO_RAIZ } from "@/lib/proxy/domain-config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function getBaseUrl() {
  const configured = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (configured) {
    return new URL(configured);
  }

  return new URL(`https://${DOMINIO_RAIZ}`);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const now = new Date();
  const staticRoutes = [
    "",
    "/quem-somos",
    "/termos-de-uso",
    "/politica-de-privacidade",
    "/cadastro-salao",
    "/login",
    "/recuperar-senha",
    "/app-cliente",
    "/app-cliente/inicio",
    "/app-cliente/login",
    "/app-cliente/cadastro",
  ];

  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from("saloes")
    .select("id, assinaturas!inner(plano,status)")
    .eq("status", "ativo")
    .eq("app_cliente_publicado", true)
    .eq("assinaturas.status", "ativo")
    .eq("assinaturas.plano", "premium")
    .limit(500);

  const dynamicSalonRoutes = ((data as Array<{ id?: string }> | null) || [])
    .map((item) => String(item.id || "").trim())
    .filter(Boolean)
    .map((idSalao) => ({
      url: new URL(`/app-cliente/salao/${idSalao}`, baseUrl).toString(),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

  return [
    ...staticRoutes.map((path, index) => ({
      url: new URL(path || "/", baseUrl).toString(),
      lastModified: now,
      changeFrequency: path.startsWith("/app-cliente") ? ("daily" as const) : ("weekly" as const),
      priority: index === 0 ? 1 : path.startsWith("/app-cliente") ? 0.8 : 0.6,
    })),
    ...dynamicSalonRoutes,
  ];
}
