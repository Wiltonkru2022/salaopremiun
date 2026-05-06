import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  assertSalonCanAppearInClientApp,
  type ClientAppEligibleSalon,
} from "@/lib/client-app/eligibility";

export type ClientAppSalonListItem = ClientAppEligibleSalon & {
  notaMedia: number | null;
  totalAvaliacoes: number;
  precoMinimo: number | null;
  duracaoMinima: number | null;
  totalServicos: number;
  totalProfissionais: number;
  proximoHorarioLabel: string | null;
  categorias: string[];
};

export type ClientAppProfessionalListItem = {
  id: string;
  nome: string;
  especialidade: string | null;
  fotoUrl: string | null;
  bio: string | null;
};

export type ClientAppServiceListItem = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  duracaoMinutos: number | null;
  profissionaisPermitidos: string[];
};

export type ClientAppReviewListItem = {
  id: string;
  clienteNome: string;
  nota: number;
  comentario: string | null;
  createdAt: string;
};

export type ClientAppSalonDetail = ClientAppEligibleSalon & {
  profissionais: ClientAppProfessionalListItem[];
  servicos: ClientAppServiceListItem[];
  avaliacoes: ClientAppReviewListItem[];
  intervaloAgendaMinutos: number;
};

export type ClientAppAppointmentListItem = {
  id: string;
  idSalao: string;
  salaoNome: string;
  salaoWhatsapp: string | null;
  salaoTelefone: string | null;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: string;
  observacoes: string | null;
  servicoNome: string;
  profissionalNome: string;
  podeCancelar: boolean;
  podeAvaliar: boolean;
  avaliado: boolean;
};

export type ClientAppProfileData = {
  nome: string;
  email: string;
  telefone: string | null;
  preferenciasGerais: string | null;
};

function normalizeSearch(value?: string) {
  return String(value || "").trim().slice(0, 60);
}

function parsePrice(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseNullableNumber(value: unknown) {
  const numeric = Number(value ?? Number.NaN);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeCachePayload(value: unknown) {
  return (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
}

function mapCacheSalonRow(row: Record<string, unknown>): ClientAppSalonListItem {
  const payload = normalizeCachePayload(row.payload);
  return {
    id: String(row.id_salao || payload.id || ""),
    nome: String(payload.nome || "").trim() || "Salao Premium",
    cidade: String(payload.cidade || "").trim() || null,
    estado: String(payload.estado || "").trim() || null,
    bairro: String(payload.bairro || "").trim() || null,
    endereco: String(payload.endereco || "").trim() || null,
    numero: String(payload.numero || "").trim() || null,
    cep: String(payload.cep || "").trim() || null,
    enderecoCompleto: String(payload.enderecoCompleto || "").trim() || null,
    logoUrl: String(payload.logoUrl || "").trim() || null,
    fotoCapaUrl: String(payload.fotoCapaUrl || "").trim() || null,
    latitude: parseNullableNumber(payload.latitude),
    longitude: parseNullableNumber(payload.longitude),
    whatsapp: String(payload.whatsapp || "").trim() || null,
    telefone: String(payload.telefone || "").trim() || null,
    descricaoPublica: String(payload.descricaoPublica || "").trim() || null,
    estacionamento: Boolean(payload.estacionamento),
    formasPagamento: parseStringArray(payload.formasPagamento),
    notaMedia: parseNullableNumber(row.nota_media),
    totalAvaliacoes: Number(row.total_avaliacoes || 0) || 0,
    precoMinimo: parseNullableNumber(row.preco_minimo),
    duracaoMinima: parseNullableNumber(row.duracao_minima),
    totalServicos: Number(row.total_servicos || 0) || 0,
    totalProfissionais: Number(row.total_profissionais || 0) || 0,
    proximoHorarioLabel:
      String(row.proximo_horario_label || "").trim() ||
      (Number(row.total_servicos || 0) > 0 ? "Agenda online" : null),
    categorias: parseStringArray(row.categorias),
  };
}

function mapLiveSalonRow(row: Record<string, unknown>): ClientAppSalonListItem {
  return {
    id: String(row.id || ""),
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
    enderecoCompleto:
      [
        [String(row.endereco || "").trim(), String(row.numero || "").trim()]
          .filter(Boolean)
          .join(", "),
        String(row.bairro || "").trim(),
        [String(row.cidade || "").trim(), String(row.estado || "").trim()]
          .filter(Boolean)
          .join(" - "),
        String(row.cep || "").trim(),
      ]
        .filter(Boolean)
        .join(" | ") || null,
    logoUrl: String(row.logo_url || "").trim() || null,
    fotoCapaUrl: String(row.foto_capa_url || "").trim() || null,
    latitude: parseNullableNumber(row.latitude),
    longitude: parseNullableNumber(row.longitude),
    whatsapp: String(row.whatsapp || "").trim() || null,
    telefone: String(row.telefone || "").trim() || null,
    descricaoPublica: String(row.descricao_publica || "").trim() || null,
    estacionamento: Boolean(row.estacionamento),
    formasPagamento: Array.isArray(row.formas_pagamento_publico)
      ? row.formas_pagamento_publico
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      : [],
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

async function attachMarketplaceMetrics(
  supabaseAdmin: any,
  saloes: ClientAppSalonListItem[]
) {
  const ids = saloes.map((item) => item.id).filter(Boolean);
  if (!ids.length) return saloes;

  const [servicosResult, profissionaisResult, avaliacoesResult] =
    await Promise.allSettled([
      (supabaseAdmin as any)
        .from("servicos")
        .select("id_salao, nome, preco, duracao_minutos, duracao")
        .in("id_salao", ids)
        .eq("ativo", true)
        .eq("app_cliente_visivel", true)
        .limit(800),
      (supabaseAdmin as any)
        .from("profissionais")
        .select("id_salao, id")
        .in("id_salao", ids)
        .eq("ativo", true)
        .eq("app_cliente_visivel", true)
        .or("eh_assistente.is.null,eh_assistente.eq.false")
        .limit(400),
      (supabaseAdmin as any)
        .from("clientes_avaliacoes")
        .select("id_salao, nota")
        .in("id_salao", ids)
        .limit(1200),
    ]);

  const serviceMetrics = new Map<
    string,
    {
      count: number;
      minPrice: number | null;
      minDuration: number | null;
      categories: Set<string>;
    }
  >();

  if (servicosResult.status === "fulfilled") {
    for (const row of ((servicosResult.value.data || []) as Array<Record<string, unknown>>)) {
      const idSalao = String(row.id_salao || "").trim();
      if (!idSalao) continue;
      const current =
        serviceMetrics.get(idSalao) ||
        { count: 0, minPrice: null, minDuration: null, categories: new Set<string>() };
      const price = parseNullableNumber(row.preco);
      const duration = parseNullableNumber(row.duracao_minutos ?? row.duracao);
      const nome = String(row.nome || "").trim();

      current.count += 1;
      current.minPrice =
        price === null
          ? current.minPrice
          : current.minPrice === null
            ? price
            : Math.min(current.minPrice, price);
      current.minDuration =
        duration === null
          ? current.minDuration
          : current.minDuration === null
            ? duration
            : Math.min(current.minDuration, duration);
      if (nome) current.categories.add(nome.split(/\s+/)[0]);
      serviceMetrics.set(idSalao, current);
    }
  }

  const professionalCounts = new Map<string, number>();
  if (profissionaisResult.status === "fulfilled") {
    for (const row of ((profissionaisResult.value.data || []) as Array<Record<string, unknown>>)) {
      const idSalao = String(row.id_salao || "").trim();
      if (!idSalao) continue;
      professionalCounts.set(idSalao, (professionalCounts.get(idSalao) || 0) + 1);
    }
  }

  const reviewMetrics = new Map<string, { total: number; sum: number }>();
  if (avaliacoesResult.status === "fulfilled") {
    for (const row of ((avaliacoesResult.value.data || []) as Array<Record<string, unknown>>)) {
      const idSalao = String(row.id_salao || "").trim();
      const nota = Number(row.nota || 0);
      if (!idSalao || !Number.isFinite(nota) || nota <= 0) continue;
      const current = reviewMetrics.get(idSalao) || { total: 0, sum: 0 };
      current.total += 1;
      current.sum += nota;
      reviewMetrics.set(idSalao, current);
    }
  }

  return saloes.map((salao) => {
    const services = serviceMetrics.get(salao.id);
    const reviews = reviewMetrics.get(salao.id);
    const totalServicos = salao.totalServicos || services?.count || 0;

    return {
      ...salao,
      notaMedia:
        salao.notaMedia ??
        (reviews?.total ? Number((reviews.sum / reviews.total).toFixed(1)) : null),
      totalAvaliacoes: salao.totalAvaliacoes || reviews?.total || 0,
      precoMinimo: salao.precoMinimo ?? services?.minPrice ?? null,
      duracaoMinima: salao.duracaoMinima ?? services?.minDuration ?? null,
      totalServicos,
      totalProfissionais:
        salao.totalProfissionais || professionalCounts.get(salao.id) || 0,
      proximoHorarioLabel:
        salao.proximoHorarioLabel ||
        (totalServicos ? "Agenda online" : "Servicos em publicacao"),
      categorias:
        salao.categorias.length || !services
          ? salao.categorias
          : Array.from(services.categories).slice(0, 4),
    };
  });
}

const listVisibleClientAppSaloesCached = unstable_cache(
  async (search: string, limit: number) => {
    const term = normalizeSearch(search);
    const pageSize = Math.min(Math.max(limit, 1), 24);
    const supabaseAdmin = getSupabaseAdmin();

    try {
      let cacheQuery: any = (supabaseAdmin as any)
        .from("client_app_marketplace_cache")
        .select(
          "id_salao, payload, nota_media, total_avaliacoes, preco_minimo, duracao_minima, total_servicos, total_profissionais, proximo_horario_label, categorias"
        )
        .eq("publicado", true)
        .order("ranking_score", { ascending: false })
        .order("nome", { ascending: true })
        .limit(pageSize);

      if (term) {
        cacheQuery = cacheQuery.ilike("search_text", `%${term}%`);
      }

      const { data: cachedRows, error: cacheError } = await cacheQuery;
      if (!cacheError && cachedRows?.length) {
        return ((cachedRows as Array<Record<string, unknown>>) || []).map(
          mapCacheSalonRow
        );
      }
    } catch {
      // The cache table is optional during rollout; live queries remain the fallback.
    }

    let query: any = supabaseAdmin
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
          "status",
          "app_cliente_publicado",
          "assinaturas!inner(plano,status)",
        ].join(",")
      )
      .eq("status", "ativo")
      .eq("app_cliente_publicado", true)
      .eq("assinaturas.status", "ativo")
      .eq("assinaturas.plano", "premium")
      .order("nome", { ascending: true })
      .limit(pageSize);

    if (term) {
      query = query.or(
        `nome.ilike.%${term}%,nome_fantasia.ilike.%${term}%,cidade.ilike.%${term}%,bairro.ilike.%${term}%`
      );
    }

    const { data, error } = await query;

    if (error || !data) {
      return [] as ClientAppSalonListItem[];
    }

    const saloes = ((data as unknown as Array<Record<string, unknown>>) || []).map(
      mapLiveSalonRow
    );

    return attachMarketplaceMetrics(supabaseAdmin, saloes);
  },
  ["client-app-visible-saloes-v2"],
  {
    revalidate: 60,
    tags: ["client-app-saloes"],
  }
);

export async function listVisibleClientAppSaloes(params?: {
  search?: string;
  limit?: number;
}) {
  return listVisibleClientAppSaloesCached(
    normalizeSearch(params?.search),
    params?.limit ?? 12
  );
}

const getClientAppSalonDetailCached = unstable_cache(
  async (idSalao: string) => {
    const salao = await assertSalonCanAppearInClientApp(idSalao);
    const supabaseAdmin = getSupabaseAdmin();

    const [profissionaisResult, servicosResult, avaliacoesResult, vinculosResult, configResult] =
      await Promise.allSettled([
        (supabaseAdmin as any)
          .from("profissionais")
          .select("id, nome, nome_exibicao, especialidade_publica, bio_publica, foto_url")
          .eq("id_salao", idSalao)
          .eq("ativo", true)
          .eq("app_cliente_visivel", true)
          .or("eh_assistente.is.null,eh_assistente.eq.false")
          .order("ordem_agenda", { ascending: true })
          .order("nome", { ascending: true })
          .limit(16),
        (supabaseAdmin as any)
          .from("servicos")
          .select("id, nome, descricao_publica, descricao, preco, duracao, duracao_minutos")
          .eq("id_salao", idSalao)
          .eq("ativo", true)
          .eq("app_cliente_visivel", true)
          .order("nome", { ascending: true })
          .limit(40),
        (supabaseAdmin as any)
          .from("clientes_avaliacoes")
          .select("id, nota, comentario, created_at, clientes(nome)")
          .eq("id_salao", idSalao)
          .order("created_at", { ascending: false })
          .limit(12),
        supabaseAdmin
          .from("profissional_servicos")
          .select("id_profissional, id_servico, ativo")
          .eq("id_salao", idSalao)
          .eq("ativo", true),
        supabaseAdmin
          .from("configuracoes_salao")
          .select("intervalo_minutos")
          .eq("id_salao", idSalao)
          .limit(1)
          .maybeSingle(),
      ]);

    const vinculosPorServico = new Map<string, string[]>();

    if (vinculosResult.status === "fulfilled") {
      for (const item of (vinculosResult.value.data || []) as Array<{
        id_profissional?: string | null;
        id_servico?: string | null;
      }>) {
        const idServico = String(item.id_servico || "").trim();
        const idProfissional = String(item.id_profissional || "").trim();
        if (!idServico || !idProfissional) continue;

        const current = vinculosPorServico.get(idServico) || [];
        if (!current.includes(idProfissional)) {
          current.push(idProfissional);
          vinculosPorServico.set(idServico, current);
        }
      }
    }

    const profissionais =
      profissionaisResult.status === "fulfilled"
        ? (((profissionaisResult.value.data || []) as unknown as Array<Record<string, unknown>>) || []).map(
            (item) => ({
              id: String(item.id || ""),
              nome:
                String(item.nome_exibicao || "").trim() ||
                String(item.nome || "").trim() ||
                "Profissional",
              especialidade:
                String(item.especialidade_publica || "").trim() || null,
              fotoUrl: String(item.foto_url || "").trim() || null,
              bio: String(item.bio_publica || "").trim() || null,
            })
          )
        : [];

    const servicos =
      servicosResult.status === "fulfilled"
        ? (((servicosResult.value.data || []) as unknown as Array<Record<string, unknown>>) || []).map(
            (item) => ({
              id: String(item.id || ""),
              nome: String(item.nome || "").trim() || "Servico",
              descricao:
                String(item.descricao_publica || item.descricao || "").trim() ||
                null,
              preco: parsePrice(item.preco),
              duracaoMinutos:
                Number(item.duracao_minutos ?? item.duracao ?? 0) || null,
              profissionaisPermitidos:
                vinculosPorServico.get(String(item.id || "").trim()) || [],
            })
          )
        : [];

    const avaliacoes =
      avaliacoesResult.status === "fulfilled"
        ? (((avaliacoesResult.value.data || []) as unknown as Array<Record<string, unknown>>) || []).map(
            (item) => ({
              id: String(item.id || ""),
              clienteNome:
                String(
                  (item.clientes as { nome?: string } | null)?.nome || ""
                ).trim() || "Cliente",
              nota: Number(item.nota ?? 0) || 0,
              comentario: String(item.comentario || "").trim() || null,
              createdAt: String(item.created_at || ""),
            })
          )
        : [];

    return {
      ...salao,
      profissionais,
      servicos,
      avaliacoes,
      intervaloAgendaMinutos:
        configResult.status === "fulfilled"
          ? Number(configResult.value.data?.intervalo_minutos || 15) || 15
          : 15,
    } satisfies ClientAppSalonDetail;
  },
  ["client-app-salon-detail-v2"],
  {
    revalidate: 60,
    tags: ["client-app-saloes"],
  }
);

export async function getClientAppSalonDetail(idSalao: string) {
  return getClientAppSalonDetailCached(idSalao);
}

export async function listClienteAppAppointments(params: { idConta: string }) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: vinculos, error: vinculosError } = await supabaseAdmin
    .from("clientes_auth")
    .select("id_cliente, id_salao, saloes(nome, nome_fantasia, whatsapp, telefone)")
    .eq("app_conta_id", params.idConta)
    .eq("app_ativo", true)
    .limit(40);

  if (vinculosError || !vinculos?.length) {
    return [];
  }

  const clientesIds = Array.from(
    new Set(
      vinculos
        .map((item) => String(item.id_cliente || "").trim())
        .filter(Boolean)
    )
  );

  if (!clientesIds.length) {
    return [];
  }

  const salaoNomeByCliente = new Map<
    string,
    {
      nome: string;
      idSalao: string;
      whatsapp: string | null;
      telefone: string | null;
    }
  >();
  for (const item of vinculos) {
    const idCliente = String(item.id_cliente || "").trim();
    const idSalao = String(item.id_salao || "").trim();
    if (!idCliente || !idSalao) continue;
    const salaoRow = item.saloes as
      | { nome?: string | null; nome_fantasia?: string | null }
      | null;
    salaoNomeByCliente.set(idCliente, {
      idSalao,
      nome:
        String(salaoRow?.nome_fantasia || "").trim() ||
        String(salaoRow?.nome || "").trim() ||
        "Salao Premium",
      whatsapp: String((salaoRow as { whatsapp?: string | null } | null)?.whatsapp || "").trim() || null,
      telefone: String((salaoRow as { telefone?: string | null } | null)?.telefone || "").trim() || null,
    });
  }

  const { data, error } = await supabaseAdmin
    .from("agendamentos")
    .select(
      "id, cliente_id, id_salao, data, hora_inicio, hora_fim, status, observacoes, servicos(nome), profissionais(nome, nome_exibicao)"
    )
    .in("cliente_id", clientesIds)
    .order("data", { ascending: false })
    .order("hora_inicio", { ascending: false })
    .limit(40);

  if (error || !data) {
    return [];
  }

  const rows = data as Array<Record<string, unknown>>;
  const appointmentIds = rows
    .map((item) => String(item.id || "").trim())
    .filter(Boolean);

  const { data: reviewRows } = appointmentIds.length
    ? await (supabaseAdmin as any)
        .from("clientes_avaliacoes")
        .select("id_agendamento")
        .in("id_agendamento", appointmentIds)
    : { data: [] };

  const reviewedIds = new Set(
    ((reviewRows as Array<{ id_agendamento?: string | null }> | null) || [])
      .map((item) => String(item.id_agendamento || "").trim())
      .filter(Boolean)
  );

  return rows.map((item) => {
    const status = String(item.status || "").trim() || "pendente";
    const avaliado = reviewedIds.has(String(item.id || "").trim());
    const clienteId = String(item.cliente_id || "").trim();
    const salaoMeta = salaoNomeByCliente.get(clienteId);
    return {
      id: String(item.id || ""),
      idSalao: salaoMeta?.idSalao || String(item.id_salao || "").trim(),
      salaoNome: salaoMeta?.nome || "Salao Premium",
      salaoWhatsapp: salaoMeta?.whatsapp || null,
      salaoTelefone: salaoMeta?.telefone || null,
      data: String(item.data || ""),
      horaInicio: String(item.hora_inicio || ""),
      horaFim: String(item.hora_fim || ""),
      status,
      observacoes: String(item.observacoes || "").trim() || null,
      servicoNome:
        String((item.servicos as { nome?: string } | null)?.nome || "").trim() ||
        "Servico",
      profissionalNome:
        String(
          (
            item.profissionais as
              | { nome_exibicao?: string; nome?: string }
              | null
          )?.nome_exibicao ||
            (
              item.profissionais as
                | { nome_exibicao?: string; nome?: string }
                | null
            )?.nome ||
            ""
        ).trim() || "Profissional",
      podeCancelar: status === "pendente" || status === "confirmado",
      podeAvaliar:
        !avaliado &&
        (status === "atendido" || status === "aguardando_pagamento"),
      avaliado,
    } satisfies ClientAppAppointmentListItem;
  });
}

export async function getClienteAppProfileData(params: { idConta: string }) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: conta } = await (supabaseAdmin as any)
    .from("clientes_app_auth")
    .select("nome, email, telefone, preferencias_gerais")
    .eq("id", params.idConta)
    .limit(1)
    .maybeSingle();

  return {
    nome: String(conta?.nome || "").trim(),
    email: String(conta?.email || "").trim(),
    telefone: String(conta?.telefone || "").trim() || null,
    preferenciasGerais: String(conta?.preferencias_gerais || "").trim() || null,
  } satisfies ClientAppProfileData;
}
