import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getClienteAppPublicEmail } from "@/app/services/cliente-app/linking";
import {
  assertSalonCanAppearInClientApp,
  type ClientAppEligibleSalon,
} from "@/lib/client-app/eligibility";
import { captureSystemError } from "@/lib/monitoring/server";
import { canUsePlanFeature, isSalaoStatusOperational } from "@/lib/plans/access";

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
  categoriaId: string | null;
  categoriaNome: string;
  preco: number | null;
  duracaoMinutos: number | null;
  exigeAvaliacao: boolean;
  ehCombo: boolean;
  comboResumo: string | null;
  cobraSinalAgendamento: boolean;
  sinalPercentualPersonalizado: number | null;
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
  salaoCidade: string | null;
  salaoEstado: string | null;
  salaoEndereco: string | null;
  data: string;
  horaInicio: string;
  horaFim: string;
  criadoEm: string | null;
  status: string;
  sinalStatus: string | null;
  sinalValor: number | null;
  reservaExpiraEm: string | null;
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

async function filterClientAppPlanAllowed<T extends ClientAppEligibleSalon>(saloes: T[]) {
  if (!saloes.length) return saloes;
  const checks = await Promise.all(
    saloes.map(async (salao) => {
      try {
        await assertSalonCanAppearInClientApp(salao);
        return salao;
      } catch {
        return null;
      }
    })
  );
  return checks.filter((item): item is T => Boolean(item));
}

async function logClientAppQueryError(
  area: string,
  error: unknown,
  metadata?: Record<string, unknown>
) {
  try {
    await captureSystemError({
      area,
      error,
      metadata,
    });
  } catch {
    // A telemetria nunca deve derrubar a experiência do cliente.
  }
}

export async function listClienteAppSaloes(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const limit = Math.min(Math.max(params?.limit ?? 12, 1), 24);
    const page = Math.max(params?.page ?? 0, 0);
    const from = page * limit;
    const to = from + limit - 1;
    const search = normalizeSearch(params?.search);

    let query = (supabaseAdmin as any)
      .from("saloes")
      .select(CLIENT_APP_SALON_SELECT)
      .eq("app_cliente_publicado", true)
      .eq("app_cliente_pausado", false)
      .order("nome", { ascending: true })
      .range(from, to);

    if (search) {
      const escaped = search.replace(/[%_,()]/g, " ").trim();
      if (escaped) {
        query = query.or(
          `nome.ilike.%${escaped}%,nome_fantasia.ilike.%${escaped}%,cidade.ilike.%${escaped}%,bairro.ilike.%${escaped}%`
        );
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    const eligible = ((data || []) as Array<Record<string, unknown>>)
      .filter((row) => isSalaoStatusOperational(String(row.status || "")))
      .map(mapLiveSalonRow);
    const allowed = await filterClientAppPlanAllowed(eligible);
    return attachMarketplaceMetrics(supabaseAdmin, allowed);
  } catch (error) {
    await logClientAppQueryError("cliente_app_saloes", error, {
      search: params?.search || null,
    });
    return [] as ClientAppSalonListItem[];
  }
}

export async function listClienteAppSaloesNearby(params: {
  latitude: number;
  longitude: number;
  limit?: number;
}) {
  if (!isValidClientCoordinate(params.latitude, params.longitude)) {
    return [] as ClientAppNearbySalonListItem[];
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const limit = Math.min(Math.max(params.limit ?? 12, 1), 24);
    const { data, error } = await (supabaseAdmin as any).rpc(
      "cliente_app_saloes_proximos",
      {
        p_latitude: params.latitude,
        p_longitude: params.longitude,
        p_limit: limit,
      }
    );
    if (error) throw error;

    const rows = ((data || []) as Array<Record<string, unknown>>)
      .filter((row) => isSalaoStatusOperational(String(row.status || "")))
      .map((row) => ({
        ...mapLiveSalonRow(row),
        distanceKm: parseNullableNumber(row.distancia_km),
      }));
    const allowed = await filterClientAppPlanAllowed(rows);
    return attachMarketplaceMetrics(supabaseAdmin, allowed);
  } catch (error) {
    await logClientAppQueryError("cliente_app_saloes_proximos", error, {
      latitude: params.latitude,
      longitude: params.longitude,
    });
    return [] as ClientAppNearbySalonListItem[];
  }
}

export async function getClienteAppSalao(idSalaoOrSlug: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const rawIdentifier = String(idSalaoOrSlug || "").trim();
    if (!rawIdentifier) return null;

    const normalizedIdentifier = rawIdentifier.toLowerCase();
    const byId = /^[0-9a-f-]{36}$/i.test(rawIdentifier);
    const { data: salao, error: salaoError } = await (supabaseAdmin as any)
      .from("saloes")
      .select(CLIENT_APP_SALON_SELECT)
      [byId ? "eq" : "ilike"](byId ? "id" : "app_cliente_slug", byId ? rawIdentifier : normalizedIdentifier)
      .maybeSingle();
    if (salaoError || !salao) return null;

    if (!salao.app_cliente_publicado || salao.app_cliente_pausado || !isSalaoStatusOperational(String(salao.status || ""))) {
      return null;
    }

    const baseSalon = mapLiveSalonRow(salao);
    const [allowedSalon] = await filterClientAppPlanAllowed([baseSalon]);
    if (!allowedSalon) return null;

    const [servicesResult, professionalsResult, reviewsResult, portfolioResult, configResult] = await Promise.allSettled([
      (supabaseAdmin as any)
        .from("servicos")
        .select("id, nome, descricao, categoria_id, categoria, preco, preco_padrao, duracao, duracao_minutos, exige_avaliacao, eh_combo, cobra_sinal_agendamento, sinal_percentual_personalizado")
        .eq("id_salao", allowedSalon.id)
        .eq("ativo", true)
        .eq("app_cliente_visivel", true)
        .order("nome", { ascending: true })
        .limit(160),
      (supabaseAdmin as any)
        .from("profissionais")
        .select("id, nome, nome_exibicao, especialidade, foto_url, bio")
        .eq("id_salao", allowedSalon.id)
        .eq("ativo", true)
        .eq("app_cliente_visivel", true)
        .or("eh_assistente.is.null,eh_assistente.eq.false")
        .order("nome", { ascending: true })
        .limit(80),
      (supabaseAdmin as any)
        .from("clientes_avaliacoes")
        .select("id, nota, comentario, created_at, id_cliente")
        .eq("id_salao", allowedSalon.id)
        .order("created_at", { ascending: false })
        .limit(80),
      (supabaseAdmin as any)
        .from("salao_portfolio_fotos")
        .select("id, imagem_url, legenda, ordem")
        .eq("id_salao", allowedSalon.id)
        .eq("ativo", true)
        .order("ordem", { ascending: true })
        .limit(60),
      (supabaseAdmin as any)
        .from("configuracoes_salao")
        .select("hora_abertura, hora_fechamento, dias_funcionamento, intervalo_agenda_minutos")
        .eq("id_salao", allowedSalon.id)
        .maybeSingle(),
    ]);

    const services = servicesResult.status === "fulfilled" ? servicesResult.value.data || [] : [];
    const professionals = professionalsResult.status === "fulfilled" ? professionalsResult.value.data || [] : [];
    const reviews = reviewsResult.status === "fulfilled" ? reviewsResult.value.data || [] : [];
    const portfolio = portfolioResult.status === "fulfilled" ? portfolioResult.value.data || [] : [];
    const config = configResult.status === "fulfilled" ? configResult.value.data : null;

    const serviceIds = services.map((service: any) => String(service.id || "")).filter(Boolean);
    const professionalIds = professionals.map((professional: any) => String(professional.id || "")).filter(Boolean);

    const [professionalServiceResult, comboResult, categoriesResult, clientNamesResult] = await Promise.allSettled([
      serviceIds.length && professionalIds.length
        ? (supabaseAdmin as any)
            .from("profissional_servicos")
            .select("id_profissional, id_servico")
            .in("id_profissional", professionalIds)
            .in("id_servico", serviceIds)
        : Promise.resolve({ data: [] }),
      serviceIds.length
        ? (supabaseAdmin as any)
            .from("servicos_combo_itens")
            .select("id_servico_combo, quantidade, servicos!servicos_combo_itens_id_servico_item_fkey(nome)")
            .in("id_servico_combo", serviceIds)
        : Promise.resolve({ data: [] }),
      (supabaseAdmin as any)
        .from("servicos_categorias")
        .select("id, nome")
        .eq("id_salao", allowedSalon.id)
        .eq("ativo", true),
      reviews.length
        ? (supabaseAdmin as any)
            .from("clientes")
            .select("id, nome")
            .in("id", reviews.map((review: any) => review.id_cliente).filter(Boolean))
        : Promise.resolve({ data: [] }),
    ]);

    const professionalServiceRows = professionalServiceResult.status === "fulfilled" ? professionalServiceResult.value.data || [] : [];
    const comboRows = comboResult.status === "fulfilled" ? comboResult.value.data || [] : [];
    const categoryRows = categoriesResult.status === "fulfilled" ? categoriesResult.value.data || [] : [];
    const clientNameRows = clientNamesResult.status === "fulfilled" ? clientNamesResult.value.data || [] : [];

    const professionalsByService = new Map<string, string[]>();
    for (const row of professionalServiceRows as any[]) {
      const serviceId = String(row.id_servico || "");
      const professionalId = String(row.id_profissional || "");
      if (!serviceId || !professionalId) continue;
      const current = professionalsByService.get(serviceId) || [];
      current.push(professionalId);
      professionalsByService.set(serviceId, current);
    }

    const combosByService = new Map<string, string[]>();
    for (const row of comboRows as any[]) {
      const comboId = String(row.id_servico_combo || "");
      const service = row.servicos as { nome?: string | null } | null;
      const name = String(service?.nome || "").trim();
      if (!comboId || !name) continue;
      const quantity = Math.max(1, Number(row.quantidade || 1));
      const current = combosByService.get(comboId) || [];
      current.push(quantity > 1 ? `${quantity}x ${name}` : name);
      combosByService.set(comboId, current);
    }

    const categoryById = new Map<string, string>();
    for (const row of categoryRows as any[]) {
      const id = String(row.id || "");
      if (id) categoryById.set(id, String(row.nome || "").trim() || "Outros");
    }

    const clientNameById = new Map<string, string>();
    for (const row of clientNameRows as any[]) {
      const id = String(row.id || "");
      if (id) clientNameById.set(id, String(row.nome || "").trim() || "Cliente");
    }

    return {
      ...allowedSalon,
      profissionais: (professionals as any[]).map((professional) => ({
        id: String(professional.id || ""),
        nome: String(professional.nome_exibicao || professional.nome || "Profissional"),
        especialidade: String(professional.especialidade || "").trim() || null,
        fotoUrl: String(professional.foto_url || "").trim() || null,
        bio: String(professional.bio || "").trim() || null,
      })),
      servicos: (services as any[]).map((service) => {
        const id = String(service.id || "");
        const categoriaId = String(service.categoria_id || "").trim() || null;
        const fallbackCategory = String(service.categoria || "").trim();
        return {
          id,
          nome: String(service.nome || "Serviço"),
          descricao: String(service.descricao || "").trim() || null,
          categoriaId,
          categoriaNome: (categoriaId ? categoryById.get(categoriaId) : null) || fallbackCategory || "Outros",
          preco: parseNullableNumber(service.preco_padrao ?? service.preco),
          duracaoMinutos: parseNullableNumber(service.duracao_minutos ?? service.duracao),
          exigeAvaliacao: Boolean(service.exige_avaliacao),
          ehCombo: Boolean(service.eh_combo),
          comboResumo: (combosByService.get(id) || []).join(" + ") || null,
          cobraSinalAgendamento: Boolean(service.cobra_sinal_agendamento),
          sinalPercentualPersonalizado: parseNullableNumber(service.sinal_percentual_personalizado),
          profissionaisPermitidos: professionalsByService.get(id) || [],
        };
      }),
      avaliacoes: (reviews as any[]).map((review) => ({
        id: String(review.id || ""),
        clienteNome: clientNameById.get(String(review.id_cliente || "")) || "Cliente",
        nota: Number(review.nota || 0),
        comentario: String(review.comentario || "").trim() || null,
        createdAt: String(review.created_at || ""),
      })),
      portfolio: (portfolio as any[]).map((photo) => ({
        id: String(photo.id || ""),
        imagemUrl: String(photo.imagem_url || "").trim(),
        legenda: String(photo.legenda || "").trim() || null,
      })).filter((photo) => Boolean(photo.imagemUrl)),
      horarioFuncionamento: {
        horaAbertura: String(config?.hora_abertura || "09:00").slice(0, 5),
        horaFechamento: String(config?.hora_fechamento || "18:00").slice(0, 5),
        diasFuncionamento: Array.isArray(config?.dias_funcionamento) ? config.dias_funcionamento.map(String) : [],
      },
      intervaloAgendaMinutos: Math.max(5, Number(config?.intervalo_agenda_minutos || 30)),
    } satisfies ClientAppSalonDetail;
  } catch (error) {
    await logClientAppQueryError("cliente_app_salao", error, { idSalaoOrSlug });
    return null;
  }
}

export async function listClienteAppCouponsForSalon(params: {
  idConta?: string | null;
  idSalao: string;
}) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await (supabaseAdmin as any)
      .from("cupons_salao")
      .select("id,codigo,nome,descricao,tipo_desconto,valor_desconto,valido_de,valido_ate,dias_cliente_inativo,publico_tipo,requer_resgate,ativo,status_campanha,limite_uso_total,limite_uso_cliente")
      .eq("id_salao", params.idSalao)
      .eq("ativo", true)
      .in("status_campanha", ["ativa", "programada"])
      .lte("valido_de", today)
      .or(`valido_ate.is.null,valido_ate.gte.${today}`)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw error;

    const rows = ((data || []) as Array<Record<string, unknown>>);
    if (!rows.length) return [] as ClientAppAvailableCoupon[];

    const privateTypes = new Set(["link_privado", "manual"]);
    const publicRows = rows.filter((cupom) => !privateTypes.has(String(cupom.publico_tipo || "").toLowerCase()));
    if (!params.idConta) {
      return publicRows.map((cupom) => ({
        codigo: String(cupom.codigo || "").trim(),
        nome: String(cupom.nome || "").trim() || "Cupom especial",
        descricao: String(cupom.descricao || "").trim() || null,
        descontoLabel: formatCouponDiscountLabel(cupom),
        diasInativo: Number(cupom.dias_cliente_inativo || 0) || null,
        tipoDesconto: String(cupom.tipo_desconto || "percentual") === "valor_fixo" ? "valor_fixo" : "percentual",
        valorDesconto: Number(cupom.valor_desconto || 0),
        validoAte: String(cupom.valido_ate || "").slice(0, 10) || null,
      }));
    }

    const { data: linkRows } = await (supabaseAdmin as any)
      .from("clientes_auth")
      .select("id_cliente")
      .eq("app_conta_id", params.idConta)
      .eq("id_salao", params.idSalao)
      .eq("app_ativo", true);
    const clienteIds = (linkRows || []).map((item: any) => String(item.id_cliente || "")).filter(Boolean);
    if (!clienteIds.length) return publicRows.map((cupom) => ({
      codigo: String(cupom.codigo || "").trim(),
      nome: String(cupom.nome || "").trim() || "Cupom especial",
      descricao: String(cupom.descricao || "").trim() || null,
      descontoLabel: formatCouponDiscountLabel(cupom),
      diasInativo: Number(cupom.dias_cliente_inativo || 0) || null,
      tipoDesconto: String(cupom.tipo_desconto || "percentual") === "valor_fixo" ? "valor_fixo" : "percentual",
      valorDesconto: Number(cupom.valor_desconto || 0),
      validoAte: String(cupom.valido_ate || "").slice(0, 10) || null,
    }));

    const couponIds = rows.map((cupom) => String(cupom.id || "")).filter(Boolean);
    const [allowedRows, redemptionRows] = await Promise.all([
      (supabaseAdmin as any).from("cupom_salao_clientes").select("id_cupom,id_cliente").in("id_cupom", couponIds).in("id_cliente", clienteIds),
      (supabaseAdmin as any).from("cupom_salao_resgates").select("id_cupom,id_cliente,status").in("id_cupom", couponIds).in("id_cliente", clienteIds).eq("status", "resgatado"),
    ]);
    const allowedIds = new Set([...(allowedRows.data || []), ...(redemptionRows.data || [])].map((item: any) => String(item.id_cupom || "")));
    return rows.filter((cupom) => {
      const privateType = privateTypes.has(String(cupom.publico_tipo || "").toLowerCase());
      return !privateType || allowedIds.has(String(cupom.id || ""));
    }).map((cupom) => ({
      codigo: String(cupom.codigo || "").trim(),
      nome: String(cupom.nome || "").trim() || "Cupom especial",
      descricao: String(cupom.descricao || "").trim() || null,
      descontoLabel: formatCouponDiscountLabel(cupom),
      diasInativo: Number(cupom.dias_cliente_inativo || 0) || null,
      tipoDesconto: String(cupom.tipo_desconto || "percentual") === "valor_fixo" ? "valor_fixo" : "percentual",
      valorDesconto: Number(cupom.valor_desconto || 0),
      validoAte: String(cupom.valido_ate || "").slice(0, 10) || null,
    }));
  } catch (error) {
    await logClientAppQueryError("cliente_app_cupons_salao", error, { idSalao: params.idSalao });
    return [] as ClientAppAvailableCoupon[];
  }
}

export async function listClienteAppCouponWallet({ idConta }: { idConta: string }) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: links, error: linkError } = await (supabaseAdmin as any)
      .from("clientes_auth")
      .select("id_cliente,id_salao")
      .eq("app_conta_id", idConta)
      .eq("app_ativo", true)
      .limit(80);
    if (linkError) throw linkError;
    const idClientes = Array.from(new Set((links || []).map((item: any) => String(item.id_cliente || "")).filter(Boolean)));
    const idSaloes = Array.from(new Set((links || []).map((item: any) => String(item.id_salao || "")).filter(Boolean)));
    if (!idClientes.length || !idSaloes.length) return [];

    const [{ data: saloes }, { data: cupons, error: couponError }] = await Promise.all([
      (supabaseAdmin as any).from("saloes").select("id,nome,nome_fantasia").in("id", idSaloes),
      (supabaseAdmin as any)
        .from("cupons_salao")
        .select("id,id_salao,codigo,nome,descricao,tipo_desconto,valor_desconto,valido_ate,dias_cliente_inativo")
        .in("id_salao", idSaloes)
        .eq("ativo", true)
        .limit(100),
    ]);
    if (couponError) throw couponError;
    const salaoById = new Map((saloes || []).map((salao: any) => [String(salao.id), String(salao.nome_fantasia || salao.nome || "Salão")]));
    const cupomIds = (cupons || []).map((cupom: any) => String(cupom.id || "")).filter(Boolean);
    if (!cupomIds.length) return [];

    const [usosResult, resgatesResult, permitidosResult] = await Promise.all([
      (supabaseAdmin as any)
        .from("cupom_salao_usos")
        .select("id_cupom, created_at")
        .in("id_cupom", cupomIds)
        .in("id_cliente", idClientes),
      (supabaseAdmin as any)
        .from("cupom_salao_resgates")
        .select("id_cupom")
        .eq("cliente_app_conta_id", idConta)
        .eq("status", "resgatado")
        .in("id_cupom", cupomIds),
      (supabaseAdmin as any)
        .from("cupom_salao_clientes")
        .select("id_cupom, id_cliente")
        .in("id_cupom", cupomIds)
        .in("id_cliente", idClientes),
    ]);

    const usedByCoupon = new Map<string, Record<string, unknown>>();
    for (const uso of ((usosResult.data || []) as Array<Record<string, unknown>>)) {
      usedByCoupon.set(String(uso.id_cupom || ""), uso);
    }
    const redeemedIds = new Set(
      ((resgatesResult.data || []) as Array<Record<string, unknown>>).map((resgate) => String(resgate.id_cupom || ""))
    );
    const allowedIds = new Set(
      ((permitidosResult.data || []) as Array<Record<string, unknown>>).map((permitido) => String(permitido.id_cupom || ""))
    );
    const today = new Date().toISOString().slice(0, 10);

    return ((cupons || []) as Array<Record<string, unknown>>)
      .filter((cupom) => {
        const idCupom = String(cupom.id || "");
        return redeemedIds.has(idCupom) || allowedIds.has(idCupom) || usedByCoupon.has(idCupom);
      })
      .map((cupom) => {
        const idCupom = String(cupom.id || "");
        const validoAte = String(cupom.valido_ate || "").slice(0, 10) || null;
        const usado = usedByCoupon.get(idCupom);
        const expirado = Boolean(validoAte && validoAte < today);
        const status: ClientAppCouponWalletItem["status"] = usado ? "usado" : expirado ? "expirado" : "disponivel";

        return {
          id: idCupom,
          salaoId: String(cupom.id_salao || ""),
          salaoNome: salaoById.get(String(cupom.id_salao || "")) || "Salão",
          codigo: String(cupom.codigo || "").trim(),
          nome: String(cupom.nome || "").trim() || "Cupom especial",
          descricao: String(cupom.descricao || "").trim() || null,
          descontoLabel: formatCouponDiscountLabel(cupom),
          diasInativo: Number(cupom.dias_cliente_inativo || 0) || null,
          tipoDesconto: String(cupom.tipo_desconto || "percentual") === "valor_fixo" ? "valor_fixo" : "percentual",
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
      .select("id_cliente, id_salao, saloes(nome, nome_fantasia, whatsapp, telefone, cidade, estado, endereco, numero)")
      .eq("app_conta_id", params.idConta)
      .eq("app_ativo", true)
      .limit(40);

    if (vinculosError || !vinculos?.length) {
      return [];
    }

    const clientesIds = Array.from(new Set(vinculos.map((item) => String(item.id_cliente || "").trim()).filter(Boolean)));
    if (!clientesIds.length) return [];

    const salaoNomeByCliente = new Map<string, { nome: string; idSalao: string; whatsapp: string | null; telefone: string | null; cidade: string | null; estado: string | null; endereco: string | null }>();
    for (const item of vinculos) {
      const idCliente = String(item.id_cliente || "").trim();
      const idSalao = String(item.id_salao || "").trim();
      if (!idCliente || !idSalao) continue;
      const salaoRow = item.saloes as { nome?: string | null; nome_fantasia?: string | null; whatsapp?: string | null; telefone?: string | null; cidade?: string | null; estado?: string | null; endereco?: string | null; numero?: string | null } | null;
      salaoNomeByCliente.set(idCliente, {
        idSalao,
        nome: String(salaoRow?.nome_fantasia || "").trim() || String(salaoRow?.nome || "").trim() || "Salão Premium",
        whatsapp: String(salaoRow?.whatsapp || "").trim() || null,
        telefone: String(salaoRow?.telefone || "").trim() || null,
        cidade: String(salaoRow?.cidade || "").trim() || null,
        estado: String(salaoRow?.estado || "").trim() || null,
        endereco: [String(salaoRow?.endereco || "").trim(), String(salaoRow?.numero || "").trim()].filter(Boolean).join(", ") || null,
      });
    }

    const { data, error } = await (supabaseAdmin as any)
      .from("agendamentos")
      .select("id, cliente_id, id_salao, servico_id, profissional_id, data, hora_inicio, hora_fim, status, sinal_status, sinal_valor, reserva_expira_em, cliente_confirmacao_status, cliente_confirmou_em, observacoes, created_at, servicos(nome), profissionais(nome, nome_exibicao)")
      .in("cliente_id", clientesIds)
      .order("data", { ascending: false })
      .order("hora_inicio", { ascending: false })
      .range(from, to);

    if (error || !data) return [];

    const rows = data as Array<Record<string, unknown>>;
    const appointmentIds = rows.map((item) => String(item.id || "").trim()).filter(Boolean);
    const { data: reviewRows } = appointmentIds.length
      ? await (supabaseAdmin as any).from("clientes_avaliacoes").select("id_agendamento").in("id_agendamento", appointmentIds)
      : { data: [] };
    const reviewedIds = new Set(((reviewRows as Array<{ id_agendamento?: string | null }> | null) || []).map((item) => String(item.id_agendamento || "").trim()).filter(Boolean));

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
        salaoCidade: salaoMeta?.cidade || null,
        salaoEstado: salaoMeta?.estado || null,
        salaoEndereco: salaoMeta?.endereco || null,
        data: String(item.data || ""),
        horaInicio: String(item.hora_inicio || ""),
        horaFim: String(item.hora_fim || ""),
        criadoEm: String(item.created_at || "").trim() || null,
        status,
        sinalStatus: String(item.sinal_status || "").trim() || null,
        sinalValor: item.sinal_valor === null || item.sinal_valor === undefined ? null : Number(item.sinal_valor),
        reservaExpiraEm: String(item.reserva_expira_em || "").trim() || null,
        confirmacaoClienteStatus: String(item.cliente_confirmacao_status || "").trim() || "aguardando",
        clienteConfirmouEm: String(item.cliente_confirmou_em || "").trim() || null,
        observacoes: String(item.observacoes || "").trim() || null,
        servicoNome: String((item.servicos as { nome?: string } | null)?.nome || "").trim() || "Serviço",
        profissionalNome: String(((item.profissionais as { nome_exibicao?: string; nome?: string } | null)?.nome_exibicao || (item.profissionais as { nome_exibicao?: string; nome?: string } | null)?.nome || "")).trim() || "Profissional",
        podeCancelar: status === "pendente" || status === "confirmado" || status === "reservado_aguardando_pagamento",
        podeAvaliar: !avaliado && (status === "atendido" || status === "aguardando_pagamento"),
        avaliado,
      } satisfies ClientAppAppointmentListItem;
    });
  } catch (error) {
    await logClientAppQueryError("cliente_app_appointments", error, { idConta: params.idConta });
    return [];
  }
}

export async function getClienteAppAppointmentForReview(params: { idConta: string; idAgendamento: string }) {
  const appointments = await listClienteAppAppointments({ idConta: params.idConta });
  const item = appointments.find((appointment) => appointment.id === params.idAgendamento);
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
      const salao = item.saloes as { nome?: string | null; nome_fantasia?: string | null } | null;
      if (idCliente) salaoByCliente.set(idCliente, String(salao?.nome_fantasia || "").trim() || String(salao?.nome || "").trim() || "Salão Premium");
      return idCliente;
    })
    .filter(Boolean);

  return { clientesIds: Array.from(new Set(clientesIds)), salaoByCliente };
}

export async function isClienteAppSalonFavorite(params: { idConta: string; idSalao: string }) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await (supabaseAdmin as any).from("clientes_app_favoritos").select("id").eq("cliente_app_conta_id", params.idConta).eq("id_salao", params.idSalao).limit(1).maybeSingle();
    if (error) throw error;
    return Boolean(data?.id);
  } catch (error) {
    await logClientAppQueryError("cliente_app_favorite_lookup", error, { idSalao: params.idSalao });
    return false;
  }
}

export async function listClienteAppFavoriteSaloes(params: { idConta: string; page?: number; limit?: number }) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 24);
    const page = Math.max(params.page ?? 0, 0);
    const from = page * limit;
    const to = from + limit - 1;
    const { data, error } = await (supabaseAdmin as any)
      .from("clientes_app_favoritos")
      .select(["id_salao", "saloes(id, nome, nome_fantasia, cidade, estado, bairro, endereco, numero, cep, logo_url, telefone, whatsapp, descricao_publica, foto_capa_url, latitude, longitude, estacionamento, formas_pagamento_publico, status, app_cliente_publicado, app_cliente_pausado, app_cliente_pausa_mensagem, app_cliente_slug)"].join(","))
      .eq("cliente_app_conta_id", params.idConta)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const rows = ((data || []) as Array<Record<string, unknown>>)
      .map((item) => item.saloes as Record<string, unknown> | null)
      .filter((item): item is Record<string, unknown> => Boolean(item?.id && item?.app_cliente_publicado && !item?.app_cliente_pausado && isSalaoStatusOperational(String(item.status || ""))))
      .map(mapLiveSalonRow);

    const allowed = await filterClientAppPlanAllowed(rows);
    return attachMarketplaceMetrics(supabaseAdmin, allowed);
  } catch (error) {
    await logClientAppQueryError("cliente_app_favorite_saloes", error);
    return [] as ClientAppSalonListItem[];
  }
}

export async function listClienteAppReceipts(params: { idConta: string; page?: number; limit?: number }) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { clientesIds, salaoByCliente } = await listClienteAppLinkedClientIds(params.idConta);
    if (!clientesIds.length) return { items: [] as ClientAppReceiptListItem[], total: 0, hasMore: false };
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 20);
    const page = Math.max(params.page ?? 0, 0);
    const from = page * limit;
    const to = from + limit - 1;
    const { data, error, count } = await (supabaseAdmin as any).from("vw_vendas_busca").select("id, id_salao, numero, status, total, fechada_em, cancelada_em, formas_pagamento, itens_descricoes, id_cliente", { count: "exact" }).in("id_cliente", clientesIds).in("status", ["fechada", "cancelada"]).order("fechada_em", { ascending: false, nullsFirst: false }).range(from, to);
    if (error) throw error;
    const items = ((data || []) as Array<Record<string, unknown>>).map((item) => {
      const idCliente = String(item.id_cliente || "");
      return { id: String(item.id || ""), numero: Number(item.numero || 0) || null, salaoNome: salaoByCliente.get(idCliente) || "Salão Premium", total: Number(item.total || 0), data: String(item.fechada_em || "").trim() || String(item.cancelada_em || "").trim() || null, status: String(item.status || ""), formasPagamento: String(item.formas_pagamento || "").trim() || null, itens: String(item.itens_descricoes || "").trim() || null } satisfies ClientAppReceiptListItem;
    });
    return { items, total: count || 0, hasMore: (count || 0) > to + 1 };
  } catch (error) {
    await logClientAppQueryError("cliente_app_receipts", error);
    return { items: [] as ClientAppReceiptListItem[], total: 0, hasMore: false };
  }
}

export async function listClienteAppWrittenReviews(params: { idConta: string; page?: number; limit?: number }) {
  try {
    const { clientesIds, salaoByCliente } = await listClienteAppLinkedClientIds(params.idConta);
    if (!clientesIds.length) return { items: [] as ClientAppWrittenReviewListItem[], total: 0, hasMore: false };
    const supabaseAdmin = getSupabaseAdmin();
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 20);
    const page = Math.max(params.page ?? 0, 0);
    const from = page * limit;
    const to = from + limit - 1;
    const { data, error, count } = await (supabaseAdmin as any).from("clientes_avaliacoes").select("id, id_cliente, id_salao, id_agendamento, nota, comentario, created_at", { count: "exact" }).in("id_cliente", clientesIds).order("created_at", { ascending: false }).range(from, to);
    if (error) throw error;
    const rows = ((data || []) as Array<Record<string, unknown>>) || [];
    const salaoIds = Array.from(new Set(rows.map((item) => String(item.id_salao || "")).filter(Boolean)));
    const agendamentoIds = Array.from(new Set(rows.map((item) => String(item.id_agendamento || "")).filter(Boolean)));
    const [saloesResult, agendamentosResult] = await Promise.allSettled([
      salaoIds.length ? (supabaseAdmin as any).from("saloes").select("id, nome, nome_fantasia").in("id", salaoIds) : Promise.resolve({ data: [] }),
      agendamentoIds.length ? (supabaseAdmin as any).from("agendamentos").select("id, servicos(nome), profissionais(nome, nome_exibicao)").in("id", agendamentoIds) : Promise.resolve({ data: [] }),
    ]);
    const salaoById = new Map<string, string>();
    if (saloesResult.status === "fulfilled") for (const salao of ((saloesResult.value.data || []) as Array<Record<string, unknown>>)) { const id = String(salao.id || ""); if (id) salaoById.set(id, String(salao.nome_fantasia || "").trim() || String(salao.nome || "").trim() || "SalãoPremium"); }
    const atendimentoById = new Map<string, { servicoNome: string; profissionalNome: string }>();
    if (agendamentosResult.status === "fulfilled") for (const agendamento of ((agendamentosResult.value.data || []) as Array<Record<string, unknown>>)) { const id = String(agendamento.id || ""); if (!id) continue; const servico = agendamento.servicos as { nome?: string | null } | null; const profissional = agendamento.profissionais as { nome?: string | null; nome_exibicao?: string | null } | null; atendimentoById.set(id, { servicoNome: String(servico?.nome || "").trim() || "Atendimento", profissionalNome: String(profissional?.nome_exibicao || "").trim() || String(profissional?.nome || "").trim() || "Profissional" }); }
    const items = rows.map((item) => { const idCliente = String(item.id_cliente || ""); const idSalao = String(item.id_salao || ""); const atendimento = atendimentoById.get(String(item.id_agendamento || "")); return { id: String(item.id || ""), salaoNome: salaoById.get(idSalao) || salaoByCliente.get(idCliente) || "Salão Premium", servicoNome: atendimento?.servicoNome || "Atendimento", profissionalNome: atendimento?.profissionalNome || "Profissional", nota: Number(item.nota || 0), comentario: String(item.comentario || "").trim() || null, createdAt: String(item.created_at || "") } satisfies ClientAppWrittenReviewListItem; });
    return { items, total: count || 0, hasMore: (count || 0) > to + 1 };
  } catch (error) {
    await logClientAppQueryError("cliente_app_written_reviews", error);
    return { items: [] as ClientAppWrittenReviewListItem[], total: 0, hasMore: false };
  }
}
