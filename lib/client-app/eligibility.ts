import "server-only";
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
  app_cliente_pausado?: boolean | null;
  app_cliente_pausa_mensagem?: string | null;
  app_cliente_slug?: string | null;
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
  appClientePausado: boolean;
  appClientePausaMensagem: string | null;
  appClienteSlug: string | null;
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
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
    appClientePausado: Boolean(row.app_cliente_pausado),
    appClientePausaMensagem:
      String(row.app_cliente_pausa_mensagem || "").trim() || null,
    appClienteSlug: String(row.app_cliente_slug || "").trim() || null,
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
        "app_cliente_pausado",
        "app_cliente_pausa_mensagem",
        "app_cliente_slug",
        "status",
        "assinaturas!inner(plano,status)",
      ].join(",")
    )
    .eq("status", "ativo")
    .eq("app_cliente_publicado", true)
    .eq("assinaturas.status", "ativo")
    .in("assinaturas.plano", ["pro", "premium"]);
}

async function getEligibleSalonByIdLive(idSalaoOrSlug: string) {
  const normalized = String(idSalaoOrSlug || "").trim();
  const query = buildBaseSalonQuery();
  const { data, error } = await (isUuid(normalized)
    ? query.eq("id", normalized)
    : query.eq("app_cliente_slug", normalized)
  )
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapSalonRow(data as unknown as EligibleSalonRow);
}

export async function canSalonAppearInClientApp(idSalao: string) {
  const salao = await getEligibleSalonByIdLive(idSalao);

  return {
    allowed: Boolean(salao?.id),
    salao,
    reason: salao
      ? null
      : "Salao sem publicacao ativa no app cliente Pro ou Premium.",
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
