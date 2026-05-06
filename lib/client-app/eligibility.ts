import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type EligibleSalonRow = {
  id: string;
  nome: string | null;
  nome_fantasia: string | null;
  cidade: string | null;
  estado: string | null;
  bairro: string | null;
  endereco: string | null;
  numero: string | null;
  cep: string | null;
  logo_url: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  descricao_publica?: string | null;
  foto_capa_url?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
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
  estado: string | null;
  bairro: string | null;
  endereco: string | null;
  numero: string | null;
  cep: string | null;
  enderecoCompleto: string | null;
  logoUrl: string | null;
  fotoCapaUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  whatsapp: string | null;
  telefone: string | null;
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

function parseNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildEnderecoCompleto(row: EligibleSalonRow) {
  const street = [row.endereco, row.numero]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(", ");
  const district = String(row.bairro || "").trim();
  const city = String(row.cidade || "").trim();
  const state = String(row.estado || "").trim();
  const zip = String(row.cep || "").trim();

  return (
    [street, district, [city, state].filter(Boolean).join(" - "), zip]
      .filter(Boolean)
      .join(" | ") || null
  );
}

function mapSalonRow(row: EligibleSalonRow): ClientAppEligibleSalon {
  return {
    id: row.id,
    nome:
      String(row.nome_fantasia || "").trim() ||
      String(row.nome || "").trim() ||
      "Salao Premium",
    cidade: String(row.cidade || "").trim() || null,
    estado: String(row.estado || "").trim() || null,
    bairro: String(row.bairro || "").trim() || null,
    endereco: String(row.endereco || "").trim() || null,
    numero: String(row.numero || "").trim() || null,
    cep: String(row.cep || "").trim() || null,
    enderecoCompleto: buildEnderecoCompleto(row),
    logoUrl: String(row.logo_url || "").trim() || null,
    fotoCapaUrl: String(row.foto_capa_url || "").trim() || null,
    latitude: parseNumber(row.latitude),
    longitude: parseNumber(row.longitude),
    whatsapp: String(row.whatsapp || "").trim() || null,
    telefone: String(row.telefone || "").trim() || null,
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
        "estado",
        "bairro",
        "endereco",
        "numero",
        "cep",
        "logo_url",
        "telefone",
        "whatsapp",
        "descricao_publica",
        "foto_capa_url",
        "latitude",
        "longitude",
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
