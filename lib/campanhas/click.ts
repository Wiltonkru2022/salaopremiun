import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { asSupabaseQueryClient } from "@/lib/supabase/query-client";

type CampaignClickPayload = {
  idCampanha: string;
  idSalao: string;
  origem?: unknown;
  slug?: unknown;
  token?: unknown;
  href?: unknown;
  referrer?: unknown;
  userAgent?: unknown;
};

type CampanhaRow = {
  id?: string | null;
};

function nullableText(value: unknown, maxLength: number) {
  return value ? String(value).slice(0, maxLength) : null;
}

export async function registrarCliqueCampanha(payload: CampaignClickPayload) {
  const supabase = asSupabaseQueryClient(getSupabaseAdmin());
  const { data: campanha } = await supabase
    .from<CampanhaRow>("cupons_salao")
    .select("id, id_salao, ativo")
    .eq("id", payload.idCampanha)
    .eq("id_salao", payload.idSalao)
    .limit(1)
    .maybeSingle();

  if (!campanha?.id) {
    return { ok: false as const, status: 404 };
  }

  await supabase.from("campanha_eventos").insert({
    id_salao: payload.idSalao,
    id_cupom: payload.idCampanha,
    tipo: "clique",
    metadata: {
      origem: String(payload.origem || "link_publico").slice(0, 80),
      slug: nullableText(payload.slug, 120),
      token: nullableText(payload.token, 120),
      href: nullableText(payload.href, 500),
      referrer: nullableText(payload.referrer, 500),
      user_agent: nullableText(payload.userAgent, 500),
    },
  });

  return { ok: true as const, status: 200 };
}
