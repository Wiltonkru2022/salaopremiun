import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type EligibleSalonRow = {
  id: string;
  nome: string | null;
  nome_fantasia: string | null;
  cidade: string | null;
  bairro: string | null;
  logo_url: string | null;
  descricao_publica?: string | null;
  foto_capa_url?: string | null;
  estacionamento?: boolean | null;
  formas_pagamento_publico?: unknown;
  app_cliente_publicado?: boolean | null;
  status: string | null;
  assinaturas:
    | Array<{
        plano: string | null;
        status: string | null;
      }>
    | null;
};

export type ClientAppEligibleSalon = {
  id: string;
  nome: string;
  cidade: string | null;
  bairro: string | null;
  logoUrl: string | null;
  fotoCapaUrl: string | null;
  descricaoPublica: string | null;
  estacionamento: boolean;
  formasPagamento: string[];
};

function normalizePlanCode(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-\s]+/g, "_");
}

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function mapSalonRow(row: EligibleSalonRow): ClientAppEligibleSalon {
  return {
    id: row.id,
    nome:
      String(row.nome_fantasia || "").trim() ||
      String(row.nome || "").trim() ||
      "Salao Premium",
    cidade: String(row.cidade || "").trim() || null,
    bairro: String(row.bairro || "").trim() || null,
    logoUrl: String(row.logo_url || "").trim() || null,
    fotoCapaUrl: String(row.foto_capa_url || "").trim() || null,
    descricaoPublica: String(row.descricao_publica || "").trim() || null,
    estacionamento: Boolean(row.estacionamento),
    formasPagamento: parseStringArray(row.formas_pagamento_publico),
  };
}

function buildBaseSalonQuery() {
  const supabaseAdmin = getSupabaseAdmin();
  return supabaseAdmin
    .from("saloes")
    .select(
      [
        "id",
        "nome",
        "nome_fantasia",
        "cidade",
        "bairro",
        "logo_url",
        "descricao_publica",
        "foto_capa_url",
        "estacionamento",
        "formas_pagamento_publico",
        "app_cliente_publicado",
        "status",
        "assinaturas!inner(plano,status)",
      ].join(",")
    )
    .eq("status", "ativo")
    .eq("app_cliente_publicado", true)
    .eq("assinaturas.status", "ativo")
    .eq("assinaturas.plano", "premium");
}

const getEligibleSalonByIdCached = unstable_cache(
  async (idSalao: string) => {
    const { data, error } = await buildBaseSalonQuery()
      .eq("id", idSalao)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapSalonRow(data as unknown as EligibleSalonRow);
  },
  ["client-app-eligible-salon-by-id-v2"],
  {
    revalidate: 60,
    tags: ["client-app-saloes"],
  }
);

export async function canSalonAppearInClientApp(idSalao: string) {
  const salao = await getEligibleSalonByIdCached(idSalao);

  return {
    allowed: Boolean(salao?.id),
    salao,
    reason: salao
      ? null
      : "Salao sem publicacao ativa no app cliente premium.",
  };
}

export async function assertSalonCanAppearInClientApp(idSalao: string) {
  const result = await canSalonAppearInClientApp(idSalao);

  if (!result.allowed || !result.salao) {
    throw new Error(result.reason || "Salao indisponivel no app cliente.");
  }

  return result.salao;
}

export async function listEligibleSalonIdsByEmail(email: string) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return [];

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("clientes_auth")
    .select("id_salao, email, app_ativo")
    .eq("app_ativo", true)
    .eq("email", normalized)
    .limit(6);

  if (error || !data?.length) {
    return [];
  }

  const ids = Array.from(
    new Set(
      data
        .map((item) => String(item.id_salao || "").trim())
        .filter(Boolean)
    )
  );

  const eligible: string[] = [];
  for (const idSalao of ids) {
    const result = await canSalonAppearInClientApp(idSalao);
    if (result.allowed) {
      eligible.push(idSalao);
    }
  }

  return eligible;
}

export function isPremiumPlanCode(value?: string | null) {
  return normalizePlanCode(value) === "premium";
}
