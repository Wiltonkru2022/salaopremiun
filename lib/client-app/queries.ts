import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  assertSalonCanAppearInClientApp,
  type ClientAppEligibleSalon,
} from "@/lib/client-app/eligibility";
import { captureSystemError } from "@/lib/monitoring/server";
import { canUsePlanFeature, isSalaoStatusOperational } from "@/lib/plans/access";
import { ensureRecoveryCoupons } from "@/lib/client-app/inactive-recovery";

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

export type ClientAppNearbySalonListItem = ClientAppSalonListItem & {
  distanceKm: number | null;
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
  preco: number | null;
  duracaoMinutos: number | null;
  exigeAvaliacao: boolean;
  ehCombo: boolean;
  comboResumo: string | null;
  profissionaisPermitidos: string[];
};

export type ClientAppReviewListItem = {
  id: string;
  clienteNome: string;
  nota: number;
  comentario: string | null;
  createdAt: string;
};

export type ClientAppPortfolioPhoto = {
  id: string;
  imagemUrl: string;
  legenda: string | null;
};

export type ClientAppSalonHours = {
  horaAbertura: string;
  horaFechamento: string;
  diasFuncionamento: string[];
};

export type ClientAppSalonDetail = ClientAppEligibleSalon & {
  profissionais: ClientAppProfessionalListItem[];
  servicos: ClientAppServiceListItem[];
  avaliacoes: ClientAppReviewListItem[];
  portfolio: ClientAppPortfolioPhoto[];
  horarioFuncionamento: ClientAppSalonHours;
  intervaloAgendaMinutos: number;
};

export type ClientAppAvailableCoupon = {
  codigo: string;
  nome: string;
  descricao: string | null;
  descontoLabel: string;
  diasInativo: number | null;
  tipoDesconto: "percentual" | "valor_fixo";
  valorDesconto: number;
  validoAte: string | null;
};

export type ClientAppCouponWalletItem = ClientAppAvailableCoupon & {
  id: string;
  salaoId: string;
  salaoNome: string;
  status: "disponivel" | "usado" | "expirado";
  usadoEm: string | null;
};

export type ClientAppAppointmentListItem = {
  id: string;
  idSalao: string;
  idServico: string;
  idProfissional: string;
  salaoNome: string;
  salaoWhatsapp: string | null;
  salaoTelefone: string | null;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: string;
  confirmacaoClienteStatus: string;
  clienteConfirmouEm: string | null;
  observacoes: string | null;
  servicoNome: string;
  profissionalNome: string;
  podeCancelar: boolean;
  podeAvaliar: boolean;
  avaliado: boolean;
};

export type ClientAppAppointmentReviewDetail = ClientAppAppointmentListItem & {
  clienteNome: string | null;
};

export type ClientAppProfileData = {
  nome: string;
  email: string;
  telefone: string | null;
  preferenciasGerais: string | null;
  creditos: Array<{
    idSalao: string;
    salaoNome: string;
    credito: number;
  }>;
};

export type ClientAppReceiptListItem = {
  id: string;
  numero: number | null;
  salaoNome: string;
  total: number;
  data: string | null;
  status: string;
  formasPagamento: string | null;
  itens: string | null;
};

export type ClientAppWrittenReviewListItem = {
  id: string;
  salaoNome: string;
  servicoNome: string;
  profissionalNome: string;
  nota: number;
  comentario: string | null;
  createdAt: string;
};

export type ClientAppNotificationListItem = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  status: string;
  url: string | null;
  enviarEm: string | null;
  createdAt: string | null;
  lidaEm: string | null;
};

function normalizeSearch(value?: string) {
  return String(value || "").trim().slice(0, 60);
}

function parseNullableNumber(value: unknown) {
  const numeric = Number(value ?? Number.NaN);
  return Number.isFinite(numeric) ? numeric : null;
}

function diffDaysFromDate(dateString: string) {
  const date = new Date(`${String(dateString || "").slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return 0;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function formatCouponDiscountLabel(cupom: Record<string, unknown>) {
  const tipo = String(cupom.tipo_desconto || "percentual");
  const valor = Number(cupom.valor_desconto || 0);

  if (tipo === "valor_fixo") {
    return `${new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor)} de desconto`;
  }

  return `${valor.toLocaleString("pt-BR", {
    maximumFractionDigits: 0,
  })}% de desconto`;
}

function hasValidCoordinatePair(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) return false;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;
  return !(latitude === 0 && longitude === 0);
}

function isValidClientCoordinate(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;
  return !(latitude === 0 && longitude === 0);
}

const CLIENT_APP_SALON_SELECT = [
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
  "app_cliente_pausado",
  "app_cliente_pausa_mensagem",
  "app_cliente_slug",
].join(",");

function mapLiveSalonRow(row: Record<string, unknown>): ClientAppSalonListItem {
  const latitude = parseNullableNumber(row.latitude);
  const longitude = parseNullableNumber(row.longitude);
  const hasCoordinates = hasValidCoordinatePair(latitude, longitude);

  return {
    id: String(row.id || ""),
    nome:
      String(row.nome_fantasia || "").trim() ||
      String(row.nome || "").trim() ||
      "Salão Premium",
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
    latitude: hasCoordinates ? latitude : null,
    longitude: hasCoordinates ? longitude : null,
    whatsapp: String(row.whatsapp || "").trim() || null,
    telefone: String(row.telefone || "").trim() || null,
    descricaoPublica: String(row.descricao_publica || "").trim() || null,
    estacionamento: Boolean(row.estacionamento),
    formasPagamento: Array.isArray(row.formas_pagamento_publico)
      ? row.formas_pagamento_publico
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      : [],
    appClientePausado: Boolean(row.app_cliente_pausado),
    appClientePausaMensagem:
      String(row.app_cliente_pausa_mensagem || "").trim() || null,
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
        .select("id_salao, nome, categoria, preco, preco_padrao, duracao_minutos, duracao")
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
      const price = parseNullableNumber(row.preco_padrao ?? row.preco);
      const duration = parseNullableNumber(row.duracao_minutos ?? row.duracao);
      const categoria = String(row.categoria || "").trim();
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
      if (categoria) current.categories.add(categoria);
      else if (nome) current.categories.add(nome.split(/\s+/)[0]);
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
        (totalServicos ? "Agenda online" : "Serviços em publicação"),
      categorias:
        salao.categorias.length || !services
          ? salao.categorias
          : Array.from(services.categories).slice(0, 4),
    };
  });
}

async function filterClientAppPlanAllowed<T extends { id: string }>(items: T[]) {
  const allowed: T[] = [];

  for (const item of items) {
    const access = await canUsePlanFeature(item.id, "app_cliente").catch(() => ({
      allowed: false,
    }));
    if (access.allowed) allowed.push(item);
  }

  return allowed;
}

async function listVisibleClientAppSaloesLive(search: string, limit: number) {
    const term = normalizeSearch(search);
    const pageSize = Math.min(Math.max(limit, 1), 24);
    const supabaseAdmin = getSupabaseAdmin();

    let query: any = supabaseAdmin
      .from("saloes")
      .select(CLIENT_APP_SALON_SELECT)
      .eq("app_cliente_publicado", true)
      .eq("app_cliente_pausado", false)
      .order("nome", { ascending: true })
      .limit(pageSize);

    if (term) {
      query = query.or(
        `nome.ilike.%${term}%,nome_fantasia.ilike.%${term}%,cidade.ilike.%${term}%,bairro.ilike.%${term}%`
      );
    }

    const { data, error } = await query;

    if (error || !data) {
      if (error) {
        await logClientAppQueryError("cliente_app_discovery_live", error, {
          search: term,
        });
      }
      return [] as ClientAppSalonListItem[];
    }

    const saloes = ((data as unknown as Array<Record<string, unknown>>) || [])
      .filter((row) => isSalaoStatusOperational(String(row.status || "")))
      .map(mapLiveSalonRow);

    const allowed = await filterClientAppPlanAllowed(saloes);

    return attachMarketplaceMetrics(supabaseAdmin, allowed);
}

async function logClientAppQueryError(
  action: string,
  error: unknown,
  details?: Record<string, unknown>
) {
  await captureSystemError({
    module: "client_app",
    action,
    surface: "public",
    origin: "server",
    severity: "warning",
    error,
    fallbackMessage: `Falha silenciosa no App Cliente: ${action}`,
    details,
  });
}

export async function listVisibleClientAppSaloes(params?: {
  search?: string;
  limit?: number;
}) {
  return listVisibleClientAppSaloesLive(
    normalizeSearch(params?.search),
    params?.limit ?? 12
  );
}

export async function listNearbyClientAppSaloes(params: {
  latitude: number;
  longitude: number;
  search?: string;
  radiusKm?: number;
  limit?: number;
}) {
  const latitude = Number(params.latitude);
  const longitude = Number(params.longitude);

  if (!isValidClientCoordinate(latitude, longitude)) {
    return [] as ClientAppNearbySalonListItem[];
  }

  const supabaseAdmin = getSupabaseAdmin();
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 50);
  const radiusKm = Math.min(Math.max(params.radiusKm ?? 20, 1), 100);
  const search = normalizeSearch(params.search);

  try {
    const { data: nearbyRows, error: nearbyError } = await (supabaseAdmin as any)
      .rpc("buscar_saloes_proximos", {
        lat_cliente: latitude,
        lon_cliente: longitude,
        raio_km: radiusKm,
        limite: limit,
        busca: search || null,
      });

    if (nearbyError) throw nearbyError;

    const distances = new Map<string, number | null>();
    const ids = ((nearbyRows || []) as Array<Record<string, unknown>>)
      .map((row) => {
        const id = String(row.id || "").trim();
        if (id) {
          const distance = parseNullableNumber(row.distancia_km);
          distances.set(id, distance);
        }
        return id;
      })
      .filter(Boolean);

    if (!ids.length) return [] as ClientAppNearbySalonListItem[];

    const { data, error } = await (supabaseAdmin as any)
      .from("saloes")
      .select(CLIENT_APP_SALON_SELECT)
      .in("id", ids)
      .eq("app_cliente_publicado", true)
      .eq("app_cliente_pausado", false)
      .limit(limit);

    if (error || !data) throw error;

    const order = new Map(ids.map((id, index) => [id, index]));
    const saloes = ((data as unknown as Array<Record<string, unknown>>) || [])
      .filter((row) => isSalaoStatusOperational(String(row.status || "")))
      .map(mapLiveSalonRow)
      .sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));

    const allowed = await filterClientAppPlanAllowed(saloes);
    const enriched = await attachMarketplaceMetrics(supabaseAdmin, allowed);

    return enriched.map((salao) => ({
      ...salao,
      distanceKm: distances.get(salao.id) ?? null,
    })) satisfies ClientAppNearbySalonListItem[];
  } catch (error) {
    await logClientAppQueryError("cliente_app_nearby_saloes", error, {
      search,
      radiusKm,
    });
    return [] as ClientAppNearbySalonListItem[];
  }
}

async function getClientAppSalonDetailLive(idSalao: string) {
    const salao = await assertSalonCanAppearInClientApp(idSalao);
    const resolvedSalaoId = salao.id;
    const supabaseAdmin = getSupabaseAdmin();

    const [
      profissionaisResult,
      servicosResult,
      avaliacoesResult,
      portfolioResult,
      vinculosResult,
      configResult,
    ] =
      await Promise.allSettled([
        (supabaseAdmin as any)
          .from("profissionais")
          .select("id, nome, nome_exibicao, especialidade_publica, bio_publica, foto_url")
          .eq("id_salao", resolvedSalaoId)
          .eq("ativo", true)
          .eq("app_cliente_visivel", true)
          .or("eh_assistente.is.null,eh_assistente.eq.false")
          .order("ordem_agenda", { ascending: true })
          .order("nome", { ascending: true })
          .limit(16),
        (supabaseAdmin as any)
          .from("servicos")
          .select("id, nome, descricao_publica, descricao, preco, preco_padrao, duracao, duracao_minutos, exige_avaliacao, eh_combo, combo_resumo")
          .eq("id_salao", resolvedSalaoId)
          .eq("ativo", true)
          .eq("app_cliente_visivel", true)
          .order("nome", { ascending: true })
          .limit(40),
        (supabaseAdmin as any)
          .from("clientes_avaliacoes")
          .select("id, nota, comentario, created_at, clientes(nome)")
          .eq("id_salao", resolvedSalaoId)
          .order("created_at", { ascending: false })
          .limit(12),
        (supabaseAdmin as any)
          .from("salao_portfolio_fotos")
          .select("id, imagem_url, legenda")
          .eq("id_salao", resolvedSalaoId)
          .eq("ativo", true)
          .order("ordem", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(12),
        supabaseAdmin
          .from("profissional_servicos")
          .select("id_profissional, id_servico, ativo")
          .eq("id_salao", resolvedSalaoId)
          .eq("ativo", true),
        supabaseAdmin
          .from("configuracoes_salao")
          .select("intervalo_minutos, hora_abertura, hora_fechamento, dias_funcionamento")
          .eq("id_salao", resolvedSalaoId)
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
              nome: String(item.nome || "").trim() || "Serviço",
              descricao:
                String(item.descricao_publica || item.descricao || "").trim() ||
                null,
              preco: parseNullableNumber(item.preco_padrao ?? item.preco),
              duracaoMinutos:
                Number(item.duracao_minutos ?? item.duracao ?? 0) || null,
              exigeAvaliacao: Boolean(item.exige_avaliacao),
              ehCombo: Boolean(item.eh_combo),
              comboResumo: String(item.combo_resumo || "").trim() || null,
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

    const portfolio =
      portfolioResult.status === "fulfilled"
        ? (((portfolioResult.value.data || []) as unknown as Array<Record<string, unknown>>) || []).map(
            (item) => ({
              id: String(item.id || ""),
              imagemUrl: String(item.imagem_url || "").trim(),
              legenda: String(item.legenda || "").trim() || null,
            })
          )
        : [];

    return {
      ...salao,
      profissionais,
      servicos,
      avaliacoes,
      portfolio,
      horarioFuncionamento:
        configResult.status === "fulfilled"
          ? {
              horaAbertura: String(configResult.value.data?.hora_abertura || "08:00").slice(0, 5),
              horaFechamento: String(configResult.value.data?.hora_fechamento || "19:00").slice(0, 5),
              diasFuncionamento: Array.isArray(configResult.value.data?.dias_funcionamento)
                ? configResult.value.data.dias_funcionamento.map((dia: unknown) => String(dia || "")).filter(Boolean)
                : ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"],
            }
          : {
              horaAbertura: "08:00",
              horaFechamento: "19:00",
              diasFuncionamento: ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"],
            },
      intervaloAgendaMinutos:
        configResult.status === "fulfilled"
          ? Number(configResult.value.data?.intervalo_minutos || 15) || 15
          : 15,
    } satisfies ClientAppSalonDetail;
  }

export async function getClientAppSalonDetail(idSalao: string) {
  return getClientAppSalonDetailLive(idSalao);
}

export async function listClienteAppAvailableCoupons(params: {
  idConta: string;
  idSalao: string;
}): Promise<ClientAppAvailableCoupon[]> {
  const idConta = String(params.idConta || "").trim();
  const idSalao = String(params.idSalao || "").trim();
  if (!idConta || !idSalao) return [];

  try {
    const supabaseAdmin = getSupabaseAdmin();
    await ensureRecoveryCoupons(idSalao);

    const { data: vinculo } = await (supabaseAdmin as any)
      .from("clientes_auth")
      .select("id_cliente, clientes(created_at)")
      .eq("id_salao", idSalao)
      .eq("app_conta_id", idConta)
      .eq("app_ativo", true)
      .limit(1)
      .maybeSingle();

    const idCliente = String(vinculo?.id_cliente || "").trim();
    if (!idCliente) return [];

    const { data: ultimoAgendamento } = await (supabaseAdmin as any)
      .from("agendamentos")
      .select("data")
      .eq("id_salao", idSalao)
      .eq("cliente_id", idCliente)
      .in("status", ["atendido", "aguardando_pagamento"])
      .order("data", { ascending: false })
      .limit(1)
      .maybeSingle();

    const clienteCreatedAt = String(
      (vinculo.clientes as { created_at?: string | null } | null)?.created_at ||
        ""
    ).slice(0, 10);
    const { data: conta } = await (supabaseAdmin as any)
      .from("clientes_app_auth")
      .select("created_at")
      .eq("id", idConta)
      .limit(1)
      .maybeSingle();
    const contaCreatedAt = String(
      (conta as { created_at?: string | null } | null)?.created_at || ""
    ).slice(0, 10);
    const referenceDate =
      String(ultimoAgendamento?.data || "").slice(0, 10) ||
      clienteCreatedAt ||
      contaCreatedAt;
    const inactiveDays = Math.max(0, diffDaysFromDate(referenceDate));

    const { data: cupons } = await (supabaseAdmin as any)
      .from("cupons_salao")
      .select(
        "id, codigo, nome, descricao, dias_cliente_inativo, tipo_desconto, valor_desconto, requer_resgate, valido_de, valido_ate"
      )
      .eq("id_salao", idSalao)
      .eq("ativo", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!cupons?.length) return [];

    const cupomIds = cupons
      .map((cupom: Record<string, unknown>) => String(cupom.id || "").trim())
      .filter(Boolean);
    const { data: usos } = cupomIds.length
      ? await (supabaseAdmin as any)
          .from("cupom_salao_usos")
          .select("id_cupom")
          .eq("id_salao", idSalao)
          .eq("id_cliente", idCliente)
          .in("id_cupom", cupomIds)
          .neq("status", "cancelado")
      : { data: [] };
    const usedCouponIds = new Set(
      ((usos || []) as Array<Record<string, unknown>>).map((uso) =>
        String(uso.id_cupom || "").trim()
      )
    );
    const { data: resgates } = cupomIds.length
      ? await (supabaseAdmin as any)
          .from("cupom_salao_resgates")
          .select("id_cupom")
          .eq("id_salao", idSalao)
          .eq("cliente_app_conta_id", idConta)
          .eq("status", "resgatado")
          .in("id_cupom", cupomIds)
      : { data: [] };
    const redeemedCouponIds = new Set(
      ((resgates || []) as Array<Record<string, unknown>>).map((resgate) =>
        String(resgate.id_cupom || "").trim()
      )
    );

    return ((cupons || []) as Array<Record<string, unknown>>)
      .filter((cupom) => {
        const idCupom = String(cupom.id || "").trim();
        const hoje = new Date().toISOString().slice(0, 10);
        const validoDe = String(cupom.valido_de || "").slice(0, 10);
        const validoAte = String(cupom.valido_ate || "").slice(0, 10);
        const diasInativo = Number(cupom.dias_cliente_inativo || 0);
        if (usedCouponIds.has(idCupom)) return false;
        if (validoDe && validoDe > hoje) return false;
        if (validoAte && validoAte < hoje) return false;
        if (cupom.requer_resgate !== false && !redeemedCouponIds.has(idCupom)) {
          return false;
        }
        if (cupom.requer_resgate === false && diasInativo > 0 && diasInativo > inactiveDays) {
          return false;
        }
        return true;
      })
      .slice(0, 3)
      .map((cupom) => ({
        codigo: String(cupom.codigo || "").trim(),
        nome: String(cupom.nome || "").trim() || "Cupom Saudades",
        descricao: String(cupom.descricao || "").trim() || null,
        descontoLabel: formatCouponDiscountLabel(cupom),
        diasInativo: Number(cupom.dias_cliente_inativo || 0) || null,
        tipoDesconto: (String(cupom.tipo_desconto || "percentual") === "valor_fixo"
          ? "valor_fixo"
          : "percentual") as "percentual" | "valor_fixo",
        valorDesconto: Number(cupom.valor_desconto || 0),
        validoAte: String(cupom.valido_ate || "").slice(0, 10) || null,
      }))
      .filter((cupom) => cupom.codigo);
  } catch (error) {
    await logClientAppQueryError("cliente_app_available_coupons", error, {
      idConta,
      idSalao,
    });
    return [];
  }
}

export async function listClienteAppCouponWallet(params: {
  idConta: string;
}): Promise<ClientAppCouponWalletItem[]> {
  const idConta = String(params.idConta || "").trim();
  if (!idConta) return [];

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: vinculos } = await (supabaseAdmin as any)
      .from("clientes_auth")
      .select("id_cliente, id_salao, app_ativo, saloes(id, nome, nome_fantasia)")
      .eq("app_conta_id", idConta)
      .eq("app_ativo", true)
      .limit(80);

    const vinculosValidos = ((vinculos || []) as Array<Record<string, any>>)
      .map((vinculo) => ({
        idCliente: String(vinculo.id_cliente || "").trim(),
        idSalao: String(vinculo.id_salao || "").trim(),
        salao: Array.isArray(vinculo.saloes) ? vinculo.saloes[0] : vinculo.saloes,
      }))
      .filter((vinculo) => vinculo.idCliente && vinculo.idSalao);

    if (!vinculosValidos.length) return [];

    const idSaloes = Array.from(new Set(vinculosValidos.map((item) => item.idSalao)));
    const idClientes = Array.from(new Set(vinculosValidos.map((item) => item.idCliente)));
    const salaoById = new Map(
      vinculosValidos.map((item) => [
        item.idSalao,
        String(item.salao?.nome_fantasia || item.salao?.nome || "Salão"),
      ])
    );

    const { data: cupons } = await (supabaseAdmin as any)
      .from("cupons_salao")
      .select(
        "id, id_salao, codigo, nome, descricao, tipo_desconto, valor_desconto, dias_cliente_inativo, valido_de, valido_ate, requer_resgate, ativo, status_campanha"
      )
      .in("id_salao", idSaloes)
      .eq("ativo", true)
      .order("created_at", { ascending: false })
      .limit(120);

    const cupomIds = ((cupons || []) as Array<Record<string, unknown>>)
      .map((cupom) => String(cupom.id || "").trim())
      .filter(Boolean);
    if (!cupomIds.length) return [];

    const [usosResult, resgatesResult] = await Promise.all([
      (supabaseAdmin as any)
        .from("cupom_salao_usos")
        .select("id_cupom, id_cliente, status, created_at")
        .in("id_cupom", cupomIds)
        .in("id_cliente", idClientes)
        .neq("status", "cancelado"),
      (supabaseAdmin as any)
        .from("cupom_salao_resgates")
        .select("id_cupom, status, created_at")
        .eq("cliente_app_conta_id", idConta)
        .eq("status", "resgatado")
        .in("id_cupom", cupomIds),
    ]);

    const usedByCoupon = new Map<string, Record<string, unknown>>();
    for (const uso of ((usosResult.data || []) as Array<Record<string, unknown>>)) {
      usedByCoupon.set(String(uso.id_cupom || ""), uso);
    }
    const redeemedIds = new Set(
      ((resgatesResult.data || []) as Array<Record<string, unknown>>).map((resgate) =>
        String(resgate.id_cupom || "")
      )
    );
    const today = new Date().toISOString().slice(0, 10);

    return ((cupons || []) as Array<Record<string, unknown>>)
      .filter((cupom) => {
        const requerResgate = cupom.requer_resgate !== false;
        const idCupom = String(cupom.id || "");
        if (requerResgate && !redeemedIds.has(idCupom) && !usedByCoupon.has(idCupom)) return false;
        return true;
      })
      .map((cupom) => {
        const idCupom = String(cupom.id || "");
        const validoAte = String(cupom.valido_ate || "").slice(0, 10) || null;
        const usado = usedByCoupon.get(idCupom);
        const expirado = Boolean(validoAte && validoAte < today);
        const status: ClientAppCouponWalletItem["status"] = usado
          ? "usado"
          : expirado
            ? "expirado"
            : "disponivel";

        return {
          id: idCupom,
          salaoId: String(cupom.id_salao || ""),
          salaoNome: salaoById.get(String(cupom.id_salao || "")) || "Salão",
          codigo: String(cupom.codigo || "").trim(),
          nome: String(cupom.nome || "").trim() || "Cupom especial",
          descricao: String(cupom.descricao || "").trim() || null,
          descontoLabel: formatCouponDiscountLabel(cupom),
          diasInativo: Number(cupom.dias_cliente_inativo || 0) || null,
          tipoDesconto: String(cupom.tipo_desconto || "percentual") === "valor_fixo"
            ? "valor_fixo"
            : "percentual",
          valorDesconto: Number(cupom.valor_desconto || 0),
          validoAte,
          status,
          usadoEm: String(usado?.created_at || "").slice(0, 10) || null,
        };
      });
  } catch (error) {
    await logClientAppQueryError("cliente_app_coupon_wallet", error, { idConta });
    return [];
  }
}

export async function listClienteAppAppointments(params: {
  idConta: string;
  page?: number;
  limit?: number;
}) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const limit = params.limit ?? 10;
    const page = Math.max(0, params.page ?? 0);
    const from = page * limit;
    const to = from + limit - 1;
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
          "Salão Premium",
        whatsapp: String((salaoRow as { whatsapp?: string | null } | null)?.whatsapp || "").trim() || null,
        telefone: String((salaoRow as { telefone?: string | null } | null)?.telefone || "").trim() || null,
      });
    }

    const { data, error } = await (supabaseAdmin as any)
      .from("agendamentos")
      .select(
        "id, cliente_id, id_salao, servico_id, profissional_id, data, hora_inicio, hora_fim, status, cliente_confirmacao_status, cliente_confirmou_em, observacoes, servicos(nome), profissionais(nome, nome_exibicao)"
      )
      .in("cliente_id", clientesIds)
      .order("data", { ascending: false })
      .order("hora_inicio", { ascending: false })
      .range(from, to);

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
        idServico: String(item.servico_id || "").trim(),
        idProfissional: String(item.profissional_id || "").trim(),
        salaoNome: salaoMeta?.nome || "Salão Premium",
        salaoWhatsapp: salaoMeta?.whatsapp || null,
        salaoTelefone: salaoMeta?.telefone || null,
        data: String(item.data || ""),
        horaInicio: String(item.hora_inicio || ""),
        horaFim: String(item.hora_fim || ""),
        status,
        confirmacaoClienteStatus:
          String(item.cliente_confirmacao_status || "").trim() || "aguardando",
        clienteConfirmouEm:
          String(item.cliente_confirmou_em || "").trim() || null,
        observacoes: String(item.observacoes || "").trim() || null,
        servicoNome:
          String((item.servicos as { nome?: string } | null)?.nome || "").trim() ||
          "Serviço",
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
  } catch (error) {
    await logClientAppQueryError("cliente_app_appointments", error, {
      idConta: params.idConta,
    });
    return [];
  }
}

export async function getClienteAppAppointmentForReview(params: {
  idConta: string;
  idAgendamento: string;
}) {
  const appointments = await listClienteAppAppointments({
    idConta: params.idConta,
  });
  const item = appointments.find(
    (appointment) => appointment.id === params.idAgendamento
  );

  return item ? ({ ...item, clienteNome: null } satisfies ClientAppAppointmentReviewDetail) : null;
}

async function listClienteAppLinkedClientIds(idConta: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("clientes_auth")
    .select("id_cliente, id_salao, saloes(nome, nome_fantasia)")
    .eq("app_conta_id", idConta)
    .eq("app_ativo", true)
    .limit(80);

  if (error) throw error;

  const salaoByCliente = new Map<string, string>();
  const clientesIds = ((data || []) as Array<Record<string, unknown>>)
    .map((item) => {
      const idCliente = String(item.id_cliente || "").trim();
      const salao = item.saloes as
        | { nome?: string | null; nome_fantasia?: string | null }
        | null;
      if (idCliente) {
        salaoByCliente.set(
          idCliente,
          String(salao?.nome_fantasia || "").trim() ||
            String(salao?.nome || "").trim() ||
            "Salão Premium"
        );
      }
      return idCliente;
    })
    .filter(Boolean);

  return {
    clientesIds: Array.from(new Set(clientesIds)),
    salaoByCliente,
  };
}

export async function isClienteAppSalonFavorite(params: {
  idConta: string;
  idSalao: string;
}) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await (supabaseAdmin as any)
      .from("clientes_app_favoritos")
      .select("id")
      .eq("cliente_app_conta_id", params.idConta)
      .eq("id_salao", params.idSalao)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data?.id);
  } catch (error) {
    await logClientAppQueryError("cliente_app_favorite_lookup", error, {
      idSalao: params.idSalao,
    });
    return false;
  }
}

export async function listClienteAppFavoriteSaloes(params: {
  idConta: string;
  page?: number;
  limit?: number;
}) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 24);
    const page = Math.max(params.page ?? 0, 0);
    const from = page * limit;
    const to = from + limit - 1;
    const { data, error } = await (supabaseAdmin as any)
      .from("clientes_app_favoritos")
      .select(
        [
          "id_salao",
          "saloes(id, nome, nome_fantasia, cidade, estado, bairro, endereco, numero, cep, logo_url, telefone, whatsapp, descricao_publica, foto_capa_url, latitude, longitude, estacionamento, formas_pagamento_publico, status, app_cliente_publicado, app_cliente_pausado, app_cliente_pausa_mensagem, app_cliente_slug)",
        ].join(",")
      )
      .eq("cliente_app_conta_id", params.idConta)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const rows = ((data || []) as Array<Record<string, unknown>>)
      .map((item) => item.saloes as Record<string, unknown> | null)
      .filter((item): item is Record<string, unknown> =>
        Boolean(
          item?.id &&
            item?.app_cliente_publicado &&
            !item?.app_cliente_pausado &&
            isSalaoStatusOperational(String(item.status || ""))
        )
      )
      .map(mapLiveSalonRow);

    const allowed = await filterClientAppPlanAllowed(rows);

    return attachMarketplaceMetrics(supabaseAdmin, allowed);
  } catch (error) {
    await logClientAppQueryError("cliente_app_favorite_saloes", error);
    return [] as ClientAppSalonListItem[];
  }
}

export async function listClienteAppReceipts(params: {
  idConta: string;
  page?: number;
  limit?: number;
}) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { clientesIds, salaoByCliente } = await listClienteAppLinkedClientIds(
      params.idConta
    );

    if (!clientesIds.length) {
      return {
        items: [] as ClientAppReceiptListItem[],
        total: 0,
        hasMore: false,
      };
    }

    const limit = Math.min(Math.max(params.limit ?? 10, 1), 20);
    const page = Math.max(params.page ?? 0, 0);
    const from = page * limit;
    const to = from + limit - 1;
    const { data, error, count } = await (supabaseAdmin as any)
      .from("vw_vendas_busca")
      .select(
        "id, id_salao, numero, status, total, fechada_em, cancelada_em, formas_pagamento, itens_descricoes, id_cliente",
        { count: "exact" }
      )
      .in("id_cliente", clientesIds)
      .in("status", ["fechada", "cancelada"])
      .order("fechada_em", { ascending: false, nullsFirst: false })
      .range(from, to);

    if (error) throw error;

    const items = ((data || []) as Array<Record<string, unknown>>).map((item) => {
      const idCliente = String(item.id_cliente || "");
      return {
        id: String(item.id || ""),
        numero: Number(item.numero || 0) || null,
        salaoNome:
          salaoByCliente.get(idCliente) || "Salão Premium",
        total: Number(item.total || 0),
        data:
          String(item.fechada_em || "").trim() ||
          String(item.cancelada_em || "").trim() ||
          null,
        status: String(item.status || ""),
        formasPagamento: String(item.formas_pagamento || "").trim() || null,
        itens: String(item.itens_descricoes || "").trim() || null,
      } satisfies ClientAppReceiptListItem;
    });

    return {
      items,
      total: count || 0,
      hasMore: (count || 0) > to + 1,
    };
  } catch (error) {
    await logClientAppQueryError("cliente_app_receipts", error);
    return {
      items: [] as ClientAppReceiptListItem[],
      total: 0,
      hasMore: false,
    };
  }
}

export async function listClienteAppWrittenReviews(params: {
  idConta: string;
  page?: number;
  limit?: number;
}) {
  try {
    const { clientesIds, salaoByCliente } = await listClienteAppLinkedClientIds(
      params.idConta
    );
    if (!clientesIds.length) {
      return {
        items: [] as ClientAppWrittenReviewListItem[],
        total: 0,
        hasMore: false,
      };
    }

    const supabaseAdmin = getSupabaseAdmin();
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 20);
    const page = Math.max(params.page ?? 0, 0);
    const from = page * limit;
    const to = from + limit - 1;
    const { data, error, count } = await (supabaseAdmin as any)
      .from("clientes_avaliacoes")
      .select(
        "id, id_cliente, id_salao, id_agendamento, nota, comentario, created_at",
        { count: "exact" }
      )
      .in("id_cliente", clientesIds)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const rows = ((data || []) as Array<Record<string, unknown>>) || [];
    const salaoIds = Array.from(
      new Set(rows.map((item) => String(item.id_salao || "")).filter(Boolean))
    );
    const agendamentoIds = Array.from(
      new Set(
        rows.map((item) => String(item.id_agendamento || "")).filter(Boolean)
      )
    );

    const [saloesResult, agendamentosResult] = await Promise.allSettled([
      salaoIds.length
        ? (supabaseAdmin as any)
            .from("saloes")
            .select("id, nome, nome_fantasia")
            .in("id", salaoIds)
        : Promise.resolve({ data: [] }),
      agendamentoIds.length
        ? (supabaseAdmin as any)
            .from("agendamentos")
            .select("id, servicos(nome), profissionais(nome, nome_exibicao)")
            .in("id", agendamentoIds)
        : Promise.resolve({ data: [] }),
    ]);

    const salaoById = new Map<string, string>();
    if (saloesResult.status === "fulfilled") {
      for (const salao of ((saloesResult.value.data || []) as Array<
        Record<string, unknown>
      >)) {
        const id = String(salao.id || "");
        if (!id) continue;
        salaoById.set(
          id,
          String(salao.nome_fantasia || "").trim() ||
            String(salao.nome || "").trim() ||
            "SalãoPremium"
        );
      }
    }

    const atendimentoById = new Map<
      string,
      { servicoNome: string; profissionalNome: string }
    >();
    if (agendamentosResult.status === "fulfilled") {
      for (const agendamento of ((agendamentosResult.value.data || []) as Array<
        Record<string, unknown>
      >)) {
        const id = String(agendamento.id || "");
        if (!id) continue;
        const servico = agendamento.servicos as { nome?: string | null } | null;
        const profissional = agendamento.profissionais as
          | { nome?: string | null; nome_exibicao?: string | null }
          | null;
        atendimentoById.set(id, {
          servicoNome: String(servico?.nome || "").trim() || "Atendimento",
          profissionalNome:
            String(profissional?.nome_exibicao || "").trim() ||
            String(profissional?.nome || "").trim() ||
            "Profissional",
        });
      }
    }

    const items = rows.map((item) => {
      const idCliente = String(item.id_cliente || "");
      const idSalao = String(item.id_salao || "");
      const atendimento = atendimentoById.get(
        String(item.id_agendamento || "")
      );
      const salao = item.saloes as
        | { nome?: string | null; nome_fantasia?: string | null }
        | null;
      const servico = item.servicos as { nome?: string | null } | null;
      const profissional = item.profissionais as
        | { nome?: string | null; nome_exibicao?: string | null }
        | null;

      return {
        id: String(item.id || ""),
        salaoNome:
          salaoById.get(idSalao) ||
          String(salao?.nome_fantasia || "").trim() ||
          String(salao?.nome || "").trim() ||
          salaoByCliente.get(idCliente) ||
          "Salão Premium",
        servicoNome:
          atendimento?.servicoNome ||
          String(servico?.nome || "").trim() ||
          "Atendimento",
        profissionalNome:
          atendimento?.profissionalNome ||
          String(profissional?.nome_exibicao || "").trim() ||
          String(profissional?.nome || "").trim() ||
          "Profissional",
        nota: Number(item.nota || 0),
        comentario: String(item.comentario || "").trim() || null,
        createdAt: String(item.created_at || ""),
      } satisfies ClientAppWrittenReviewListItem;
    });

    return {
      items,
      total: count || 0,
      hasMore: (count || 0) > to + 1,
    };
  } catch (error) {
    await logClientAppQueryError("cliente_app_written_reviews", error);
    return {
      items: [] as ClientAppWrittenReviewListItem[],
      total: 0,
      hasMore: false,
    };
  }
}

export async function listClienteAppSalonReviews(params: {
  idSalao: string;
  page?: number;
  limit?: number;
}) {
  const idSalao = String(params.idSalao || "").trim();
  if (!idSalao) {
    return {
      items: [] as ClientAppReviewListItem[],
      total: 0,
      hasMore: false,
    };
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 20);
    const page = Math.max(params.page ?? 0, 0);
    const from = page * limit;
    const to = from + limit - 1;

    const { data, error, count } = await (supabaseAdmin as any)
      .from("clientes_avaliacoes")
      .select("id, nota, comentario, created_at, clientes(nome)", {
        count: "exact",
      })
      .eq("id_salao", idSalao)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const items = ((data || []) as Array<Record<string, unknown>>).map(
      (item) => ({
        id: String(item.id || ""),
        clienteNome:
          String((item.clientes as { nome?: string } | null)?.nome || "").trim() ||
          "Cliente",
        nota: Number(item.nota ?? 0) || 0,
        comentario: String(item.comentario || "").trim() || null,
        createdAt: String(item.created_at || ""),
      })
    ) satisfies ClientAppReviewListItem[];

    return {
      items,
      total: count || 0,
      hasMore: (count || 0) > to + 1,
    };
  } catch (error) {
    await logClientAppQueryError("cliente_app_salon_reviews", error);
    return {
      items: [] as ClientAppReviewListItem[],
      total: 0,
      hasMore: false,
    };
  }
}

export async function listClienteAppNotifications(params: {
  idConta: string;
  read?: boolean;
  page?: number;
  limit?: number;
}) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 20);
    const page = Math.max(params.page ?? 0, 0);
    const from = page * limit;
    const to = from + limit - 1;
    const shouldRead = params.read === true;
    let query = (supabaseAdmin as any)
      .from("notification_jobs")
      .select("id, tipo, titulo, mensagem, status, url, enviar_em, created_at, metadata", {
        count: "exact",
      })
      .eq("cliente_app_conta_id", params.idConta)
      .eq("canal", "cliente_app")
      .order("created_at", { ascending: false });

    query = shouldRead
      ? query.not("metadata->>cliente_lida_em", "is", null)
      : query.is("metadata->>cliente_lida_em", null);

    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    const items = ((data || []) as Array<Record<string, unknown>>).map((item) => {
      const metadata = (item.metadata || {}) as Record<string, unknown>;
      return {
        id: String(item.id || ""),
        titulo: String(item.titulo || "").trim() || "Notificacao",
        mensagem: String(item.mensagem || "").trim() || "",
        tipo: String(item.tipo || "").trim(),
        status: String(item.status || "").trim(),
        url: String(item.url || "").trim() || null,
        enviarEm: String(item.enviar_em || "").trim() || null,
        createdAt: String(item.created_at || "").trim() || null,
        lidaEm: String(metadata.cliente_lida_em || "").trim() || null,
      };
    }) satisfies ClientAppNotificationListItem[];

    return {
      items,
      hasMore: (count || 0) > to + 1,
      total: count || 0,
    };
  } catch (error) {
    await logClientAppQueryError("cliente_app_notifications", error);
    return {
      items: [] as ClientAppNotificationListItem[],
      hasMore: false,
      total: 0,
    };
  }
}

export async function getClienteAppProfileData(params: { idConta: string }) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const [{ data: conta }, { data: vinculos }] = await Promise.all([
      (supabaseAdmin as any)
        .from("clientes_app_auth")
        .select("nome, email, telefone, preferencias_gerais")
        .eq("id", params.idConta)
        .limit(1)
        .maybeSingle(),
      (supabaseAdmin as any)
        .from("clientes_auth")
        .select("id_salao, id_cliente, saloes(nome, nome_fantasia), clientes(cashback)")
        .eq("app_conta_id", params.idConta)
        .eq("app_ativo", true)
        .limit(50),
    ]);

    const creditos = ((vinculos || []) as Array<Record<string, unknown>>)
      .map((item) => {
        const salao = item.saloes as
          | { nome?: string | null; nome_fantasia?: string | null }
          | null
          | undefined;
        const cliente = item.clientes as { cashback?: number | null } | null | undefined;
        return {
          idSalao: String(item.id_salao || ""),
          salaoNome:
            String(salao?.nome_fantasia || "").trim() ||
            String(salao?.nome || "").trim() ||
            "Salão",
          credito: Number(cliente?.cashback || 0),
        };
      })
      .filter((item) => item.idSalao && item.credito > 0)
      .sort((a, b) => b.credito - a.credito);

    return {
      nome: String(conta?.nome || "").trim(),
      email: String(conta?.email || "").trim(),
      telefone: String(conta?.telefone || "").trim() || null,
      preferenciasGerais: String(conta?.preferencias_gerais || "").trim() || null,
      creditos,
    } satisfies ClientAppProfileData;
  } catch (error) {
    await logClientAppQueryError("cliente_app_profile_data", error, {
      idConta: params.idConta,
    });
    return {
      nome: "",
      email: "",
      telefone: null,
      preferenciasGerais: null,
      creditos: [],
    } satisfies ClientAppProfileData;
  }
}
