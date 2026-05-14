import type { MetadataRoute } from "next";
import { DOMINIO_BLOG, DOMINIO_RAIZ } from "@/lib/proxy/domain-config";
import { isSalaoStatusOperational } from "@/lib/plans/access";
import { buildSalaoPublicPath } from "@/lib/saloes/public-link";
import { isSeoBlockedSalonSlug } from "@/lib/seo/public-routes";

function getBaseUrl() {
  const configured = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (configured) {
    return new URL(configured);
  }

  return new URL(`https://${DOMINIO_RAIZ}`);
}

function canUseSupabaseAdminInBuild() {
  return Boolean(
    String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim() &&
      String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()
  );
}

async function listDynamicSalonRoutes(baseUrl: URL, now: Date) {
  if (!canUseSupabaseAdminInBuild()) {
    return [];
  }

  const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from("saloes")
    .select("id, app_cliente_slug, status, assinaturas!inner(plano,status)")
    .eq("app_cliente_publicado", true)
    .in("assinaturas.plano", ["teste_gratis", "pro", "premium"])
    .limit(500);

  return (
    (data as Array<{
      id?: string | null;
      app_cliente_slug?: string | null;
      status?: string | null;
      assinaturas?: { status?: string | null } | Array<{ status?: string | null }> | null;
    }> | null) || []
  )
    .filter((item) => {
      const assinatura = Array.isArray(item.assinaturas)
        ? item.assinaturas[0]
        : item.assinaturas;

      return (
        isSalaoStatusOperational(item.status) &&
        isSalaoStatusOperational(assinatura?.status)
      );
    })
    .map((item) => String(item.app_cliente_slug || item.id || "").trim())
    .filter(Boolean)
    .filter((slugOrId) => !isSeoBlockedSalonSlug(slugOrId))
    .map((slugOrId) => ({
      url: new URL(buildSalaoPublicPath(slugOrId), baseUrl).toString(),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));
}

async function listBlogRoutes(now: Date) {
  const { getPublishedBlogPosts } = await import("@/lib/blog/service");
  const posts = await getPublishedBlogPosts();
  const blogBaseUrl = new URL(`https://${DOMINIO_BLOG}`);

  return [
    {
      url: new URL("/", blogBaseUrl).toString(),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    },
    ...posts.map((post) => ({
      url: new URL(`/${post.slug}`, blogBaseUrl).toString(),
      lastModified: new Date(post.publishedAt || now),
      changeFrequency: "monthly" as const,
      priority: post.featured ? 0.82 : 0.75,
    })),
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const now = new Date();
  const staticRoutes = [
    "",
    "/quem-somos",
    "/termos-de-uso",
    "/politica-de-privacidade",
  ];

  const [dynamicSalonRoutes, blogRoutes] = await Promise.all([
    listDynamicSalonRoutes(baseUrl, now),
    listBlogRoutes(now),
  ]);

  return [
    ...staticRoutes.map((path, index) => ({
      url: new URL(path || "/", baseUrl).toString(),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: index === 0 ? 1 : 0.6,
    })),
    ...dynamicSalonRoutes,
    ...blogRoutes,
  ];
}
