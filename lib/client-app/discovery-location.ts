import "server-only";

import { getDatabaseAdmin } from "@/lib/db/admin";
import { canUsePlanFeature, isSalaoStatusOperational } from "@/lib/plans/access";
import type { ClientAppSalonListItem } from "@/lib/client-app/queries";

const SALON_SELECT = [
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
  "app_cliente_pausado",
  "app_cliente_pausa_mensagem",
  "app_cliente_slug",
  "status",
].join(",");

const STATE_NAMES: Record<string, string> = {
  AC: "acre",
  AL: "alagoas",
  AP: "amapa",
  AM: "amazonas",
  BA: "bahia",
  CE: "ceara",
  DF: "distrito federal",
  ES: "espirito santo",
  GO: "goias",
  MA: "maranhao",
  MT: "mato grosso",
  MS: "mato grosso do sul",
  MG: "minas gerais",
  PA: "para",
  PB: "paraiba",
  PR: "parana",
  PE: "pernambuco",
  PI: "piaui",
  RJ: "rio de janeiro",
  RN: "rio grande do norte",
  RS: "rio grande do sul",
  RO: "rondonia",
  RR: "roraima",
  SC: "santa catarina",
  SP: "sao paulo",
  SE: "sergipe",
  TO: "tocantins",
};

function normalize(value: unknown) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeUf(value: unknown) {
  const raw = String(value || "").trim().toUpperCase();
  if (STATE_NAMES[raw]) return raw;
  const normalized = normalize(raw);
  return Object.entries(STATE_NAMES).find(([, name]) => name === normalized)?.[0] || raw.slice(0, 2);
}

function sameState(rowState: unknown, selectedState: string) {
  const selectedUf = normalizeUf(selectedState);
  const rowUf = normalizeUf(rowState);
  return Boolean(selectedUf) && rowUf === selectedUf;
}

function parseNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function validCoordinates(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) return false;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;
  return !(latitude === 0 && longitude === 0);
}

function mapSalon(row: Record<string, unknown>): ClientAppSalonListItem {
  const latitude = parseNumber(row.latitude);
  const longitude = parseNumber(row.longitude);
  const hasCoordinates = validCoordinates(latitude, longitude);
  const cidade = String(row.cidade || "").trim() || null;
  const estado = String(row.estado || "").trim() || null;
  const bairro = String(row.bairro || "").trim() || null;
  const endereco = String(row.endereco || "").trim() || null;
  const numero = String(row.numero || "").trim() || null;
  const cep = String(row.cep || "").trim() || null;

  return {
    id: String(row.id || ""),
    nome: String(row.nome_fantasia || "").trim() || String(row.nome || "").trim() || "Salão Premium",
    cidade,
    estado,
    bairro,
    endereco,
    numero,
    cep,
    enderecoCompleto:
      [
        [endereco, numero].filter(Boolean).join(", "),
        bairro,
        [cidade, estado].filter(Boolean).join(" - "),
        cep,
      ]
        .filter(Boolean)
        .join(" | ") || null,
    logoUrl: String(row.logo_url || "").trim() || null,
    fotoCapaUrl: String(row.foto_capa_url || "").trim() || null,
    latitude: hasCoordinates ? latitude : null,
    longitude: hasCoordinates ? longitude : null,
    whatsapp: String(row.whatsapp || "").trim() || null,
    telefone: String(row.telefone || "").trim() || null,
    descricaoPublica: String(row.descricao_publica || "").trim() || null,
    estacionamento: Boolean(row.estacionamento),
    formasPagamento: Array.isArray(row.formas_pagamento_publico)
      ? row.formas_pagamento_publico.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 8)
      : [],
    appClientePausado: Boolean(row.app_cliente_pausado),
    appClientePausaMensagem: String(row.app_cliente_pausa_mensagem || "").trim() || null,
    appClienteSlug: String(row.app_cliente_slug || "").trim() || null,
    notaMedia: null,
    totalAvaliacoes: 0,
    precoMinimo: null,
    duracaoMinima: null,
    totalServicos: 0,
    totalProfissionais: 0,
    proximoHorarioLabel: null,
    categorias: [],
  };
}

async function enrich(saloes: ClientAppSalonListItem[]) {
  if (!saloes.length) return saloes;
  const supabase = getDatabaseAdmin();
  const ids = saloes.map((item) => item.id);
  const supabaseUntyped = supabase as any;

  const [servicesResult, professionalsResult, reviewsResult] = await Promise.allSettled([
    supabaseUntyped
      .from("servicos")
      .select("id_salao,nome,categoria,preco,preco_padrao,duracao_minutos,duracao")
      .in("id_salao", ids)
      .eq("ativo", true)
      .eq("app_cliente_visivel", true)
      .limit(1200),
    supabaseUntyped
      .from("profissionais")
      .select("id_salao,id")
      .in("id_salao", ids)
      .eq("ativo", true)
      .eq("app_cliente_visivel", true)
      .or("eh_assistente.is.null,eh_assistente.eq.false")
      .limit(600),
    supabaseUntyped
      .from("clientes_avaliacoes")
      .select("id_salao,nota")
      .in("id_salao", ids)
      .limit(1800),
  ]);

  const serviceMetrics = new Map<string, { count: number; minPrice: number | null; minDuration: number | null; categories: Set<string> }>();
  const professionalCounts = new Map<string, number>();
  const reviewMetrics = new Map<string, { total: number; sum: number }>();

  if (servicesResult.status === "fulfilled") {
    for (const row of (servicesResult.value.data || []) as Array<Record<string, unknown>>) {
      const id = String(row.id_salao || "");
      const current = serviceMetrics.get(id) || { count: 0, minPrice: null, minDuration: null, categories: new Set<string>() };
      const price = parseNumber(row.preco_padrao ?? row.preco);
      const duration = parseNumber(row.duracao_minutos ?? row.duracao);
      const category = String(row.categoria || "").trim() || String(row.nome || "").trim().split(/\s+/)[0] || "";
      current.count += 1;
      if (price !== null) current.minPrice = current.minPrice === null ? price : Math.min(current.minPrice, price);
      if (duration !== null) current.minDuration = current.minDuration === null ? duration : Math.min(current.minDuration, duration);
      if (category) current.categories.add(category);
      serviceMetrics.set(id, current);
    }
  }

  if (professionalsResult.status === "fulfilled") {
    for (const row of (professionalsResult.value.data || []) as Array<Record<string, unknown>>) {
      const id = String(row.id_salao || "");
      professionalCounts.set(id, (professionalCounts.get(id) || 0) + 1);
    }
  }

  if (reviewsResult.status === "fulfilled") {
    for (const row of (reviewsResult.value.data || []) as Array<Record<string, unknown>>) {
      const id = String(row.id_salao || "");
      const nota = Number(row.nota || 0);
      if (!id || !Number.isFinite(nota) || nota <= 0) continue;
      const current = reviewMetrics.get(id) || { total: 0, sum: 0 };
      current.total += 1;
      current.sum += nota;
      reviewMetrics.set(id, current);
    }
  }

  return saloes.map((salao) => {
    const services = serviceMetrics.get(salao.id);
    const reviews = reviewMetrics.get(salao.id);
    return {
      ...salao,
      totalServicos: services?.count || 0,
      totalProfissionais: professionalCounts.get(salao.id) || 0,
      precoMinimo: services?.minPrice ?? null,
      duracaoMinima: services?.minDuration ?? null,
      categorias: services ? Array.from(services.categories).slice(0, 4) : [],
      totalAvaliacoes: reviews?.total || 0,
      notaMedia: reviews?.total ? Number((reviews.sum / reviews.total).toFixed(1)) : null,
      proximoHorarioLabel: services?.count ? "Agenda online" : "Serviços em publicação",
    };
  });
}

export async function listClientAppSaloesByLocation(params: {
  cidade: string;
  estado: string;
  limit?: number;
}) {
  const cidade = String(params.cidade || "").trim().slice(0, 80);
  const estado = String(params.estado || "").trim().slice(0, 40);
  if (!cidade || !estado) return [] as ClientAppSalonListItem[];

  const supabase = getDatabaseAdmin();
  const { data, error } = await supabase
    .from("saloes")
    .select(SALON_SELECT)
    .eq("app_cliente_publicado", true)
    .eq("app_cliente_pausado", false)
    .ilike("cidade", cidade)
    .order("nome", { ascending: true })
    .limit(Math.min(Math.max(params.limit ?? 50, 1), 80));

  if (error || !data) return [] as ClientAppSalonListItem[];

  const candidates = ((data || []) as unknown as Array<Record<string, unknown>>)
    .filter((row) => isSalaoStatusOperational(String(row.status || "")))
    .filter((row) => sameState(row.estado, estado));

  const allowed: ClientAppSalonListItem[] = [];
  for (const row of candidates) {
    const id = String(row.id || "");
    if (!id) continue;
    const access = await canUsePlanFeature(id, "app_cliente").catch(() => ({ allowed: false }));
    if (access.allowed) allowed.push(mapSalon(row));
  }

  return enrich(allowed);
}

export async function listClientAppLocations() {
  const supabase = getDatabaseAdmin();
  const { data, error } = await supabase
    .from("saloes")
    .select("id,cidade,estado,status,app_cliente_pausado")
    .eq("app_cliente_publicado", true)
    .eq("app_cliente_pausado", false)
    .limit(500);

  if (error || !data) return [] as Array<{ estado: string; cidade: string }>;

  const unique = new Map<string, { estado: string; cidade: string }>();
  for (const row of data as unknown as Array<Record<string, unknown>>) {
    if (!isSalaoStatusOperational(String(row.status || ""))) continue;
    const cidade = String(row.cidade || "").trim();
    const estadoRaw = String(row.estado || "").trim();
    const estado = normalizeUf(estadoRaw);
    if (!cidade || !estado || !STATE_NAMES[estado]) continue;
    unique.set(`${estado}|${normalize(cidade)}`, { estado, cidade });
  }

  return Array.from(unique.values()).sort((a, b) => a.estado.localeCompare(b.estado) || a.cidade.localeCompare(b.cidade, "pt-BR"));
}
