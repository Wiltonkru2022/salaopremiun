import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";

export type TicketCategoria =
  | "assinatura"
  | "cobranca"
  | "agenda"
  | "comanda"
  | "caixa"
  | "comissao"
  | "estoque"
  | "whatsapp"
  | "acesso"
  | "bug"
  | "melhoria"
  | "suporte";

export type TicketPrioridade = "baixa" | "media" | "alta" | "critica";

export type TicketStatus =
  | "aberto"
  | "em_atendimento"
  | "aguardando_cliente"
  | "aguardando_tecnico"
  | "resolvido"
  | "fechado";

type PainelTicketContext = {
  origem: "painel_salao";
  idSalao: string;
  idUsuario: string;
  nome: string;
  email: string | null;
  nivel: string;
};

type ProfissionalTicketContext = {
  origem: "app_profissional";
  idSalao: string;
  idProfissional: string;
  nome: string;
  email: string | null;
};

export type AdminTicketContext = {
  origem: "admin_master";
  idAdmin: string;
  nome: string;
};

export type SalaoTicketContext = PainelTicketContext | ProfissionalTicketContext;

type TicketListRow = {
  id: string;
  id_salao?: string | null;
  numero: number | string | null;
  assunto: string | null;
  categoria: string | null;
  prioridade: string | null;
  status: string | null;
  origem: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
  ultima_interacao_em: string | null;
  solicitante_nome: string | null;
  sla_limite_em?: string | null;
};

type TicketMessageRow = {
  id?: string | null;
  id_ticket: string;
  mensagem: string | null;
  criada_em: string | null;
  autor_tipo: string | null;
  autor_nome: string | null;
  interna?: boolean | null;
  id_usuario_salao?: string | null;
  id_profissional?: string | null;
  id_admin_usuario?: string | null;
};

type TicketEventRow = {
  id?: string | null;
  evento: string | null;
  descricao: string | null;
  payload_json?: Record<string, unknown> | null;
  criado_em: string | null;
};

type TicketHeaderRow = TicketListRow & {
  solicitante_email?: string | null;
  origem_contexto?: Record<string, unknown> | null;
  id_responsavel_admin?: string | null;
};

export type TicketSummary = {
  id: string;
  numero: number;
  assunto: string;
  categoria: TicketCategoria | string;
  prioridade: TicketPrioridade | string;
  status: TicketStatus | string;
  origem: string;
  criadoEm: string | null;
  atualizadoEm: string | null;
  ultimaInteracaoEm: string | null;
  ultimaInteracaoLabel: string;
  solicitanteNome: string;
  ultimaMensagem: string;
  ultimaMensagemAutor: string | null;
  salaoId?: string | null;
  salaoNome?: string | null;
  slaLimiteEm?: string | null;
};

export type TicketMetrics = {
  total: number;
  abertos: number;
  aguardandoCliente: number;
  aguardandoTecnico: number;
  criticos: number;
};

export type TicketHeader = {
  id: string;
  numero: number;
  assunto: string;
  categoria: TicketCategoria | string;
  prioridade: TicketPrioridade | string;
  status: TicketStatus | string;
  origem: string;
  criadoEm: string | null;
  atualizadoEm: string | null;
  ultimaInteracaoEm: string | null;
  ultimaInteracaoLabel: string;
  solicitanteNome: string;
  solicitanteEmail: string | null;
  origemContexto: Record<string, unknown>;
  slaLimiteEm: string | null;
  salaoId?: string | null;
  responsavelAdminId?: string | null;
};

export type TicketDetailMessage = {
  id: string;
  autorTipo: string;
  autorNome: string;
  mensagem: string;
  interna: boolean;
  criadaEm: string | null;
  idUsuarioSalao?: string | null;
  idProfissional?: string | null;
  idAdminUsuario?: string | null;
};

export type TicketDetailEvent = {
  id: string;
  evento: string;
  descricao: string;
  payload: Record<string, unknown>;
  criadoEm: string | null;
};

export type SalaoTicketDetail = {
  ticket: TicketHeader;
  mensagens: TicketDetailMessage[];
  eventos: TicketDetailEvent[];
};

export type AdminTicketDetail = SalaoTicketDetail & {
  salao: {
    id: string;
    nome: string;
    responsavel: string;
    email: string;
  } | null;
  responsavelAdmin: {
    id: string;
    nome: string;
    email: string;
  } | null;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeCategoria(value: unknown): TicketCategoria {
  const categoria = normalizeText(value).toLowerCase();

  if (
    categoria === "assinatura" ||
    categoria === "cobranca" ||
    categoria === "agenda" ||
    categoria === "comanda" ||
    categoria === "caixa" ||
    categoria === "comissao" ||
    categoria === "estoque" ||
    categoria === "whatsapp" ||
    categoria === "acesso" ||
    categoria === "bug" ||
    categoria === "melhoria" ||
    categoria === "suporte"
  ) {
    return categoria;
  }

  return "suporte";
}

function normalizePrioridade(value: unknown): TicketPrioridade {
  const prioridade = normalizeText(value).toLowerCase();

  if (
    prioridade === "baixa" ||
    prioridade === "media" ||
    prioridade === "alta" ||
    prioridade === "critica"
  ) {
    return prioridade;
  }

  return "media";
}

function normalizeStatus(value: unknown): TicketStatus {
  const status = normalizeText(value).toLowerCase();

  if (
    status === "aberto" ||
    status === "em_atendimento" ||
    status === "aguardando_cliente" ||
    status === "aguardando_tecnico" ||
    status === "resolvido" ||
    status === "fechado"
  ) {
    return status;
  }

  return "aberto";
}

function buildSla(prioridade: TicketPrioridade) {
  const now = Date.now();

  if (prioridade === "critica") {
    return new Date(now + 4 * 60 * 60 * 1000).toISOString();
  }

  if (prioridade === "alta") {
    return new Date(now + 12 * 60 * 60 * 1000).toISOString();
  }

  if (prioridade === "baixa") {
    return new Date(now + 48 * 60 * 60 * 1000).toISOString();
  }

  return new Date(now + 24 * 60 * 60 * 1000).toISOString();
}

function dateTimeValue(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function buildLatestMessageMap(rows: TicketMessageRow[]) {
  const latestMap = new Map<string, TicketMessageRow>();

  rows.forEach((row) => {
    if (!row.id_ticket || latestMap.has(row.id_ticket)) return;
    latestMap.set(row.id_ticket, row);
  });

  return latestMap;
}

function buildTicketMetrics(items: TicketSummary[]): TicketMetrics {
  return {
    total: items.length,
    abertos: items.filter((item) =>
      ["aberto", "em_atendimento", "aguardando_cliente", "aguardando_tecnico"].includes(
        item.status
      )
    ).length,
    aguardandoCliente: items.filter(
      (item) => item.status === "aguardando_cliente"
    ).length,
    aguardandoTecnico: items.filter(
      (item) => item.status === "aguardando_tecnico"
    ).length,
    criticos: items.filter((item) => item.prioridade === "critica").length,
  };
}

function mapTicketSummary(
  row: TicketListRow,
  latestMessage?: TicketMessageRow | null,
  salaoNome?: string | null
): TicketSummary {
  return {
    id: row.id,
    numero: Number(row.numero || 0),
    assunto: row.assunto || "Sem assunto",
    categoria: normalizeCategoria(row.categoria),
    prioridade: normalizePrioridade(row.prioridade),
    status: normalizeStatus(row.status),
    origem: normalizeText(row.origem) || "painel_salao",
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    ultimaInteracaoEm: row.ultima_interacao_em || row.atualizado_em,
    ultimaInteracaoLabel: dateTimeValue(
      row.ultima_interacao_em || row.atualizado_em || row.criado_em
    ),
    solicitanteNome: row.solicitante_nome || "Salao",
    ultimaMensagem: normalizeText(latestMessage?.mensagem),
    ultimaMensagemAutor:
      normalizeText(latestMessage?.autor_nome) ||
      normalizeText(latestMessage?.autor_tipo) ||
      null,
    salaoId: row.id_salao || null,
    salaoNome: normalizeText(salaoNome) || null,
    slaLimiteEm: row.sla_limite_em || null,
  };
}

function mapTicketHeader(row: TicketHeaderRow): TicketHeader {
  return {
    id: row.id,
    numero: Number(row.numero || 0),
    assunto: row.assunto || "Sem assunto",
    categoria: normalizeCategoria(row.categoria),
    prioridade: normalizePrioridade(row.prioridade),
    status: normalizeStatus(row.status),
    origem: normalizeText(row.origem) || "painel_salao",
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
    ultimaInteracaoEm: row.ultima_interacao_em || row.atualizado_em,
    ultimaInteracaoLabel: dateTimeValue(
      row.ultima_interacao_em || row.atualizado_em || row.criado_em
    ),
    solicitanteNome: row.solicitante_nome || "Salao",
    solicitanteEmail: normalizeText(row.solicitante_email) || null,
    origemContexto:
      row.origem_contexto && typeof row.origem_contexto === "object"
        ? row.origem_contexto
        : {},
    slaLimiteEm: row.sla_limite_em || null,
    salaoId: row.id_salao || null,
    responsavelAdminId: row.id_responsavel_admin || null,
  };
}

function mapTicketMessage(row: TicketMessageRow): TicketDetailMessage {
  return {
    id: normalizeText(row.id) || crypto.randomUUID(),
    autorTipo: normalizeText(row.autor_tipo) || "sistema",
    autorNome:
      normalizeText(row.autor_nome) ||
      normalizeText(row.autor_tipo) ||
      "Sistema",
    mensagem: normalizeText(row.mensagem) || "-",
    interna: Boolean(row.interna),
    criadaEm: row.criada_em,
    idUsuarioSalao: row.id_usuario_salao || null,
    idProfissional: row.id_profissional || null,
    idAdminUsuario: row.id_admin_usuario || null,
  };
}

function mapTicketEvent(row: TicketEventRow): TicketDetailEvent {
  return {
    id: normalizeText(row.id) || crypto.randomUUID(),
    evento: normalizeText(row.evento) || "evento",
    descricao: normalizeText(row.descricao) || "Sem descricao",
    payload:
      row.payload_json && typeof row.payload_json === "object"
        ? row.payload_json
        : {},
    criadoEm: row.criado_em,
  };
}

export async function getPainelTicketContext(): Promise<PainelTicketContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("UNAUTHORIZED");
  }

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("id, id_salao, nome, email, nivel, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !usuario?.id_salao || usuario.status !== "ativo") {
    throw new Error("UNAUTHORIZED");
  }

  return {
    origem: "painel_salao",
    idSalao: usuario.id_salao,
    idUsuario: usuario.id,
    nome:
      normalizeText(usuario.nome) ||
      normalizeText(user.user_metadata?.nome) ||
      normalizeText(user.email?.split("@")[0]) ||
      "Usuario do sistema",
    email: normalizeText(usuario.email) || normalizeText(user.email) || null,
    nivel: normalizeText(usuario.nivel) || "recepcao",
  };
}

export async function getProfissionalTicketContext(): Promise<ProfissionalTicketContext> {
  const session = await getProfissionalSessionFromCookie();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  const supabase = getSupabaseAdmin();
  const { data: profissional, error } = await supabase
    .from("profissionais")
    .select("id, id_salao, nome, nome_exibicao, email, ativo")
    .eq("id", session.idProfissional)
    .eq("id_salao", session.idSalao)
    .maybeSingle();

  if (error || !profissional || profissional.ativo === false) {
    throw new Error("UNAUTHORIZED");
  }

  return {
    origem: "app_profissional",
    idSalao: session.idSalao,
    idProfissional: session.idProfissional,
    nome:
      normalizeText(profissional.nome_exibicao) ||
      normalizeText(profissional.nome) ||
      normalizeText(session.nome) ||
      "Profissional",
    email: normalizeText(profissional.email) || null,
  };
}

export async function listSalaoTickets(idSalao: string) {
  const supabase = getSupabaseAdmin();
  const { data: tickets, error } = await supabase
    .from("tickets")
    .select(
      "id, id_salao, numero, assunto, categoria, prioridade, status, origem, criado_em, atualizado_em, ultima_interacao_em, solicitante_nome, sla_limite_em"
    )
    .eq("id_salao", idSalao)
    .order("ultima_interacao_em", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message || "Erro ao listar tickets.");
  }

  const ticketRows = (tickets || []) as TicketListRow[];
  const ids = ticketRows.map((ticket) => ticket.id);
  let latestMessages: TicketMessageRow[] = [];

  if (ids.length > 0) {
    const { data: mensagens, error: mensagensError } = await supabase
      .from("ticket_mensagens")
      .select("id, id_ticket, mensagem, criada_em, autor_tipo, autor_nome, interna")
      .in("id_ticket", ids)
      .eq("interna", false)
      .order("criada_em", { ascending: false });

    if (mensagensError) {
      throw new Error(mensagensError.message || "Erro ao listar mensagens.");
    }

    latestMessages = (mensagens || []) as TicketMessageRow[];
  }

  const latestMap = buildLatestMessageMap(latestMessages);
  const items = ticketRows.map((ticket) =>
    mapTicketSummary(ticket, latestMap.get(ticket.id))
  );

  return {
    items,
    metrics: buildTicketMetrics(items),
  };
}

export async function listAdminTickets() {
  const supabase = getSupabaseAdmin();
  const [{ data: tickets, error }, { data: saloes, error: saloesError }] =
    await Promise.all([
      supabase
        .from("tickets")
        .select(
          "id, id_salao, numero, assunto, categoria, prioridade, status, origem, criado_em, atualizado_em, ultima_interacao_em, solicitante_nome, sla_limite_em"
        )
        .order("ultima_interacao_em", { ascending: false })
        .limit(150),
      supabase.from("saloes").select("id, nome").limit(1000),
    ]);

  if (error) {
    throw new Error(error.message || "Erro ao listar tickets do AdminMaster.");
  }

  if (saloesError) {
    throw new Error(saloesError.message || "Erro ao carregar saloes dos tickets.");
  }

  const ticketRows = (tickets || []) as TicketListRow[];
  const ids = ticketRows.map((ticket) => ticket.id);
  let latestMessages: TicketMessageRow[] = [];

  if (ids.length > 0) {
    const { data: mensagens, error: mensagensError } = await supabase
      .from("ticket_mensagens")
      .select("id, id_ticket, mensagem, criada_em, autor_tipo, autor_nome, interna")
      .in("id_ticket", ids)
      .order("criada_em", { ascending: false });

    if (mensagensError) {
      throw new Error(
        mensagensError.message || "Erro ao carregar mensagens dos tickets."
      );
    }

    latestMessages = (mensagens || []) as TicketMessageRow[];
  }

  const salaoById = new Map(
    ((saloes || []) as { id: string; nome?: string | null }[]).map((salao) => [
      salao.id,
      salao.nome || salao.id,
    ])
  );
  const latestMap = buildLatestMessageMap(latestMessages);
  const items = ticketRows.map((ticket) =>
    mapTicketSummary(
      ticket,
      latestMap.get(ticket.id),
      ticket.id_salao ? salaoById.get(ticket.id_salao) || ticket.id_salao : null
    )
  );

  return {
    items,
    metrics: buildTicketMetrics(items),
  };
}

export async function getSalaoTicketDetail(params: {
  idSalao: string;
  idTicket: string;
}): Promise<SalaoTicketDetail> {
  const supabase = getSupabaseAdmin();
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select(
      "id, id_salao, numero, assunto, categoria, prioridade, status, origem, criado_em, atualizado_em, ultima_interacao_em, solicitante_nome, solicitante_email, origem_contexto, sla_limite_em, id_responsavel_admin"
    )
    .eq("id", params.idTicket)
    .eq("id_salao", params.idSalao)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Erro ao carregar ticket.");
  }

  if (!ticket) {
    throw new Error("NOT_FOUND");
  }

  const [{ data: mensagens, error: mensagensError }, { data: eventos, error: eventosError }] =
    await Promise.all([
      supabase
        .from("ticket_mensagens")
        .select(
          "id, id_ticket, autor_tipo, autor_nome, mensagem, interna, criada_em, id_usuario_salao, id_profissional, id_admin_usuario"
        )
        .eq("id_ticket", params.idTicket)
        .eq("interna", false)
        .order("criada_em", { ascending: true }),
      supabase
        .from("ticket_eventos")
        .select("id, evento, descricao, payload_json, criado_em")
        .eq("id_ticket", params.idTicket)
        .order("criado_em", { ascending: false }),
    ]);

  if (mensagensError) {
    throw new Error(mensagensError.message || "Erro ao carregar mensagens.");
  }

  if (eventosError) {
    throw new Error(eventosError.message || "Erro ao carregar eventos.");
  }

  return {
    ticket: mapTicketHeader(ticket as TicketHeaderRow),
    mensagens: ((mensagens || []) as TicketMessageRow[]).map(mapTicketMessage),
    eventos: ((eventos || []) as TicketEventRow[]).map(mapTicketEvent),
  };
}

export async function getAdminTicketDetail(
  idTicket: string
): Promise<AdminTicketDetail> {
  const supabase = getSupabaseAdmin();
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select(
      "id, id_salao, numero, assunto, categoria, prioridade, status, origem, criado_em, atualizado_em, ultima_interacao_em, solicitante_nome, solicitante_email, origem_contexto, sla_limite_em, id_responsavel_admin"
    )
    .eq("id", idTicket)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Erro ao carregar ticket.");
  }

  if (!ticket) {
    throw new Error("NOT_FOUND");
  }

  const header = ticket as TicketHeaderRow;
  const [{ data: mensagens, error: mensagensError }, { data: eventos, error: eventosError }, { data: salao }, { data: responsavelAdmin }] =
    await Promise.all([
      supabase
        .from("ticket_mensagens")
        .select(
          "id, id_ticket, autor_tipo, autor_nome, mensagem, interna, criada_em, id_usuario_salao, id_profissional, id_admin_usuario"
        )
        .eq("id_ticket", idTicket)
        .order("criada_em", { ascending: true }),
      supabase
        .from("ticket_eventos")
        .select("id, evento, descricao, payload_json, criado_em")
        .eq("id_ticket", idTicket)
        .order("criado_em", { ascending: false }),
      header.id_salao
        ? supabase
            .from("saloes")
            .select("id, nome, responsavel, email")
            .eq("id", header.id_salao)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      header.id_responsavel_admin
        ? supabase
            .from("admin_master_usuarios")
            .select("id, nome, email")
            .eq("id", header.id_responsavel_admin)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (mensagensError) {
    throw new Error(mensagensError.message || "Erro ao carregar mensagens.");
  }

  if (eventosError) {
    throw new Error(eventosError.message || "Erro ao carregar eventos.");
  }

  return {
    ticket: mapTicketHeader(header),
    mensagens: ((mensagens || []) as TicketMessageRow[]).map(mapTicketMessage),
    eventos: ((eventos || []) as TicketEventRow[]).map(mapTicketEvent),
    salao: salao
      ? {
          id: String((salao as { id?: string }).id || ""),
          nome: normalizeText((salao as { nome?: string | null }).nome) || "-",
          responsavel:
            normalizeText((salao as { responsavel?: string | null }).responsavel) ||
            "-",
          email: normalizeText((salao as { email?: string | null }).email) || "-",
        }
      : null,
    responsavelAdmin: responsavelAdmin
      ? {
          id: String((responsavelAdmin as { id?: string }).id || ""),
          nome:
            normalizeText((responsavelAdmin as { nome?: string | null }).nome) ||
            "-",
          email:
            normalizeText((responsavelAdmin as { email?: string | null }).email) ||
            "-",
        }
      : null,
  };
}

export async function createSalaoTicket(params: {
  context: SalaoTicketContext;
  assunto: string;
  categoria?: string | null;
  prioridade?: string | null;
  mensagem: string;
  contexto?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  const assunto = normalizeText(params.assunto);
  const mensagem = normalizeText(params.mensagem);

  if (!assunto || !mensagem) {
    throw new Error("INVALID_PAYLOAD");
  }

  const prioridade = normalizePrioridade(params.prioridade);
  const categoria = normalizeCategoria(params.categoria);
  const now = new Date().toISOString();
  const origemContexto: Record<string, unknown> = {
    ...(params.contexto || {}),
    origem: params.context.origem,
  };

  if (params.context.origem === "app_profissional") {
    origemContexto.id_profissional = params.context.idProfissional;
  } else {
    origemContexto.id_usuario = params.context.idUsuario;
    origemContexto.nivel = params.context.nivel;
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      id_salao: params.context.idSalao,
      assunto,
      categoria,
      prioridade,
      status: "aberto",
      origem: params.context.origem,
      solicitante_nome: params.context.nome,
      solicitante_email: params.context.email,
      origem_contexto: origemContexto,
      ultima_interacao_em: now,
      atualizado_em: now,
      sla_limite_em: buildSla(prioridade),
    })
    .select("id, numero, status")
    .single();

  if (error || !ticket) {
    throw new Error(error?.message || "Erro ao abrir ticket.");
  }

  const messagePayload: Record<string, unknown> = {
    id_ticket: ticket.id,
    autor_tipo:
      params.context.origem === "app_profissional" ? "profissional" : "usuario",
    autor_nome: params.context.nome,
    mensagem,
    interna: false,
  };

  if (params.context.origem === "app_profissional") {
    messagePayload.id_profissional = params.context.idProfissional;
  } else {
    messagePayload.id_usuario_salao = params.context.idUsuario;
  }

  const { error: messageError } = await supabase
    .from("ticket_mensagens")
    .insert(messagePayload);

  if (messageError) {
    throw new Error(messageError.message || "Erro ao registrar mensagem do ticket.");
  }

  await supabase.from("ticket_eventos").insert({
    id_ticket: ticket.id,
    evento: "ticket_aberto",
    descricao:
      params.context.origem === "app_profissional"
        ? "Ticket aberto pelo app profissional."
        : "Ticket aberto pelo painel do salao.",
    payload_json: {
      origem: params.context.origem,
      categoria,
      prioridade,
    },
  });

  return {
    id: String(ticket.id),
    numero: Number(ticket.numero || 0),
    status: String(ticket.status || "aberto"),
  };
}

export async function replySalaoTicket(params: {
  context: SalaoTicketContext;
  idTicket: string;
  mensagem: string;
}) {
  const supabase = getSupabaseAdmin();
  const mensagem = normalizeText(params.mensagem);

  if (!mensagem) {
    throw new Error("INVALID_PAYLOAD");
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("id, status")
    .eq("id", params.idTicket)
    .eq("id_salao", params.context.idSalao)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Erro ao localizar ticket.");
  }

  if (!ticket) {
    throw new Error("NOT_FOUND");
  }

  const messagePayload: Record<string, unknown> = {
    id_ticket: params.idTicket,
    autor_tipo:
      params.context.origem === "app_profissional" ? "profissional" : "usuario",
    autor_nome: params.context.nome,
    mensagem,
    interna: false,
  };

  if (params.context.origem === "app_profissional") {
    messagePayload.id_profissional = params.context.idProfissional;
  } else {
    messagePayload.id_usuario_salao = params.context.idUsuario;
  }

  const { error: replyError } = await supabase
    .from("ticket_mensagens")
    .insert(messagePayload);

  if (replyError) {
    throw new Error(replyError.message || "Erro ao responder ticket.");
  }

  const statusAtual = normalizeStatus(ticket.status);
  const proximoStatus =
    statusAtual === "fechado" || statusAtual === "resolvido"
      ? "aberto"
      : "aguardando_tecnico";
  const now = new Date().toISOString();

  await supabase
    .from("tickets")
    .update({
      status: proximoStatus,
      atualizado_em: now,
      ultima_interacao_em: now,
      fechado_em: null,
    })
    .eq("id", params.idTicket);

  await supabase.from("ticket_eventos").insert({
    id_ticket: params.idTicket,
    evento: "mensagem_cliente",
    descricao:
      params.context.origem === "app_profissional"
        ? "Nova resposta enviada pelo app profissional."
        : "Nova resposta enviada pelo salao.",
    payload_json: {
      origem: params.context.origem,
      proximo_status: proximoStatus,
    },
  });

  return { ok: true, status: proximoStatus };
}

export async function updateSalaoTicketStatus(params: {
  context: SalaoTicketContext;
  idTicket: string;
  status: "fechado" | "aberto";
  motivo?: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("id, status")
    .eq("id", params.idTicket)
    .eq("id_salao", params.context.idSalao)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Erro ao localizar ticket.");
  }

  if (!ticket) {
    throw new Error("NOT_FOUND");
  }

  const now = new Date().toISOString();
  const newStatus = params.status === "fechado" ? "fechado" : "aberto";

  await supabase
    .from("tickets")
    .update({
      status: newStatus,
      atualizado_em: now,
      ultima_interacao_em: now,
      fechado_em: newStatus === "fechado" ? now : null,
    })
    .eq("id", params.idTicket);

  await supabase.from("ticket_eventos").insert({
    id_ticket: params.idTicket,
    evento:
      newStatus === "fechado"
        ? "ticket_fechado_cliente"
        : "ticket_reaberto_cliente",
    descricao:
      normalizeText(params.motivo) ||
      (newStatus === "fechado"
        ? "Ticket encerrado pelo salao."
        : "Ticket reaberto pelo salao."),
    payload_json: {
      origem: params.context.origem,
      status: newStatus,
    },
  });

  return { ok: true, status: newStatus };
}

export async function replyAdminTicket(params: {
  context: AdminTicketContext;
  idTicket: string;
  mensagem: string;
  status?: string | null;
  assumir?: boolean;
}) {
  const supabase = getSupabaseAdmin();
  const mensagem = normalizeText(params.mensagem);

  if (!mensagem) {
    throw new Error("INVALID_PAYLOAD");
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("id, status")
    .eq("id", params.idTicket)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Erro ao localizar ticket.");
  }

  if (!ticket) {
    throw new Error("NOT_FOUND");
  }

  const nextStatus = params.status
    ? normalizeStatus(params.status)
    : "aguardando_cliente";
  const now = new Date().toISOString();

  const { error: replyError } = await supabase.from("ticket_mensagens").insert({
    id_ticket: params.idTicket,
    autor_tipo: "admin",
    id_admin_usuario: params.context.idAdmin,
    autor_nome: params.context.nome,
    mensagem,
    interna: false,
  });

  if (replyError) {
    throw new Error(replyError.message || "Erro ao responder ticket.");
  }

  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    atualizado_em: now,
    ultima_interacao_em: now,
    fechado_em:
      nextStatus === "fechado" || nextStatus === "resolvido" ? now : null,
  };

  if (params.assumir !== false) {
    updatePayload.id_responsavel_admin = params.context.idAdmin;
  }

  await supabase.from("tickets").update(updatePayload).eq("id", params.idTicket);

  await supabase.from("ticket_eventos").insert({
    id_ticket: params.idTicket,
    evento: "resposta_admin",
    descricao: "Resposta enviada pelo AdminMaster.",
    payload_json: {
      status: nextStatus,
      id_admin: params.context.idAdmin,
    },
  });

  return { ok: true, status: nextStatus };
}

export async function updateAdminTicketStatus(params: {
  context: AdminTicketContext;
  idTicket: string;
  status: string;
  prioridade?: string | null;
  motivo?: string | null;
  assumir?: boolean;
}) {
  const supabase = getSupabaseAdmin();
  const nextStatus = normalizeStatus(params.status);
  const nextPrioridade = params.prioridade
    ? normalizePrioridade(params.prioridade)
    : null;
  const now = new Date().toISOString();

  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("id, prioridade")
    .eq("id", params.idTicket)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Erro ao localizar ticket.");
  }

  if (!ticket) {
    throw new Error("NOT_FOUND");
  }

  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    prioridade: nextPrioridade || ticket.prioridade,
    atualizado_em: now,
    ultima_interacao_em: now,
    fechado_em:
      nextStatus === "fechado" || nextStatus === "resolvido" ? now : null,
  };

  if (params.assumir !== false) {
    updatePayload.id_responsavel_admin = params.context.idAdmin;
  }

  await supabase.from("tickets").update(updatePayload).eq("id", params.idTicket);

  await supabase.from("ticket_eventos").insert({
    id_ticket: params.idTicket,
    evento: "status_admin_atualizado",
    descricao:
      normalizeText(params.motivo) ||
      `Status ajustado para ${nextStatus} pelo AdminMaster.`,
    payload_json: {
      status: nextStatus,
      prioridade: nextPrioridade || ticket.prioridade,
      id_admin: params.context.idAdmin,
    },
  });

  return {
    ok: true,
    status: nextStatus,
    prioridade: nextPrioridade || ticket.prioridade,
  };
}
