import { createClient } from "@/lib/supabase/server";
import { requireProfissionalServerContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { clearBackupMetadata } from "@/lib/auth/mfa-backup-codes";
import {
  buildMfaRecoveryApprovedMessage,
  buildMfaRecoveryCompletedMessage,
  buildMfaRecoveryEvidenceAcceptedMessage,
  buildMfaRecoveryEvidenceDivergentMessage,
  buildMfaRecoveryEvidenceIllegibleMessage,
  buildMfaRecoveryRejectedMessage,
} from "@/lib/auth/mfa-recovery";
import { registrarLogSistema } from "@/lib/system-logs";
import type { Json } from "@/types/database.generated";
import crypto from "node:crypto";

const TICKET_ATTACHMENT_BUCKET = "ticket-evidencias";
const TICKET_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
const TICKET_ATTACHMENT_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

type TicketAttachment = {
  bucket: string;
  path: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  signedUrl?: string | null;
};

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
  anexos_json?: Json | null;
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
  anexos: TicketAttachment[];
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

function isProfessionalRecoveryTicketOrigin(value: unknown) {
  return normalizeText(value).toLowerCase() === "app_profissional_login";
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

function sanitizeFileName(value: string) {
  const normalized = normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "arquivo";
}

function normalizeTicketAttachments(value: unknown): TicketAttachment[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Record<string, unknown>;
      const bucket = normalizeText(candidate.bucket);
      const path = normalizeText(candidate.path);
      const fileName = normalizeText(candidate.fileName);
      const contentType = normalizeText(candidate.contentType);
      const sizeBytes = Number(candidate.sizeBytes || 0);

      if (!bucket || !path || !fileName) return null;

      return {
        bucket,
        path,
        fileName,
        contentType: contentType || "application/octet-stream",
        sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0,
      } satisfies TicketAttachment;
    })
    .filter((item): item is TicketAttachment => Boolean(item));
}

async function signTicketAttachments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  attachments: TicketAttachment[]
) {
  if (!attachments.length) return [];

  const signed = await Promise.all(
    attachments.map(async (attachment) => {
      const { data } = await supabase.storage
        .from(attachment.bucket)
        .createSignedUrl(attachment.path, 60 * 60);

      return {
        ...attachment,
        signedUrl: data?.signedUrl || null,
      };
    })
  );

  return signed;
}

async function mapTicketMessage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: TicketMessageRow
): Promise<TicketDetailMessage> {
  const anexos = await signTicketAttachments(
    supabase,
    normalizeTicketAttachments(row.anexos_json)
  );

  return {
    anexos,
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
  const profissional = await requireProfissionalServerContext();

  return {
    origem: "app_profissional",
    idSalao: profissional.idSalao,
    idProfissional: profissional.idProfissional,
    nome: normalizeText(profissional.nome) || "Profissional",
    email: normalizeText(profissional.email) || null,
  };
}

export async function listSalaoTickets(idSalao: string) {
  return runAdminOperation({
    action: "support_list_salao_tickets",
    idSalao,
    run: async (supabase) => {
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
          .select(
            "id, id_ticket, mensagem, criada_em, autor_tipo, autor_nome, interna"
          )
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
  });
}

export async function listAdminTickets() {
  return runAdminOperation({
    action: "support_list_admin_tickets",
    run: async (supabase) => {
      const [{ data: tickets, error }, { data: saloes, error: saloesError }] =
        await Promise.all([
          supabase
            .from("tickets")
            .select(
              "id, id_salao, numero, assunto, categoria, prioridade, status, origem, criado_em, atualizado_em, ultima_interacao_em, solicitante_nome, sla_limite_em"
            )
            .neq("origem", "app_profissional_login")
            .order("ultima_interacao_em", { ascending: false })
            .limit(150),
          supabase.from("saloes").select("id, nome").limit(1000),
        ]);

      if (error) {
        throw new Error(error.message || "Erro ao listar tickets do AdminMaster.");
      }

      if (saloesError) {
        throw new Error(
          saloesError.message || "Erro ao carregar saloes dos tickets."
        );
      }

      const ticketRows = (tickets || []) as TicketListRow[];
      const ids = ticketRows.map((ticket) => ticket.id);
      let latestMessages: TicketMessageRow[] = [];

      if (ids.length > 0) {
        const { data: mensagens, error: mensagensError } = await supabase
          .from("ticket_mensagens")
          .select(
            "id, id_ticket, mensagem, criada_em, autor_tipo, autor_nome, interna"
          )
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
        ((saloes || []) as { id: string; nome?: string | null }[]).map(
          (salao) => [salao.id, salao.nome || salao.id]
        )
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
  });
}

export async function getSalaoTicketDetail(params: {
  idSalao: string;
  idTicket: string;
}): Promise<SalaoTicketDetail> {
  return runAdminOperation({
    action: "support_get_salao_ticket_detail",
    idSalao: params.idSalao,
    run: async (supabase) => {
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

      const [
        { data: mensagens, error: mensagensError },
        { data: eventos, error: eventosError },
      ] = await Promise.all([
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

      const rawMessages = (mensagens || []) as TicketMessageRow[];
      const detailedMessages = await Promise.all(
        rawMessages.map((row) => mapTicketMessage(supabase, row))
      );

      return {
        ticket: mapTicketHeader(ticket as TicketHeaderRow),
        mensagens: detailedMessages,
        eventos: ((eventos || []) as TicketEventRow[]).map(mapTicketEvent),
      };
    }
  });
}

export async function getAdminTicketDetail(
  idTicket: string
): Promise<AdminTicketDetail> {
  return runAdminOperation({
    action: "support_get_admin_ticket_detail",
    run: async (supabase) => {
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

      if (isProfessionalRecoveryTicketOrigin(ticket.origem)) {
        throw new Error("NOT_FOUND");
      }

      const header = ticket as TicketHeaderRow;
      const [
        { data: mensagens, error: mensagensError },
        { data: eventos, error: eventosError },
        { data: salao },
        { data: responsavelAdmin },
      ] = await Promise.all([
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

      const rawMessages = (mensagens || []) as TicketMessageRow[];
      const detailedMessages = await Promise.all(
        rawMessages.map((row) => mapTicketMessage(supabase, row))
      );

      return {
        ticket: mapTicketHeader(header),
        mensagens: detailedMessages,
        eventos: ((eventos || []) as TicketEventRow[]).map(mapTicketEvent),
        salao: salao
          ? {
              id: String((salao as { id?: string }).id || ""),
              nome:
                normalizeText((salao as { nome?: string | null }).nome) || "-",
              responsavel:
                normalizeText(
                  (salao as { responsavel?: string | null }).responsavel
                ) || "-",
              email:
                normalizeText((salao as { email?: string | null }).email) || "-",
            }
          : null,
        responsavelAdmin: responsavelAdmin
          ? {
              id: String((responsavelAdmin as { id?: string }).id || ""),
              nome:
                normalizeText(
                  (responsavelAdmin as { nome?: string | null }).nome
                ) || "-",
              email:
                normalizeText(
                  (responsavelAdmin as { email?: string | null }).email
                ) || "-",
            }
          : null,
      };
    }
  });
}

export async function createSalaoTicket(params: {
  context: SalaoTicketContext;
  assunto: string;
  categoria?: string | null;
  prioridade?: string | null;
  mensagem: string;
  contexto?: Record<string, unknown>;
}) {
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

  const ticket = await runAdminOperation({
    action: "support_create_salao_ticket",
    actorId:
      params.context.origem === "painel_salao"
        ? params.context.idUsuario
        : params.context.idProfissional,
    idSalao: params.context.idSalao,
    run: async (supabase) => {
      const { data: createdTicket, error } = await supabase
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
          origem_contexto: origemContexto as Json,
          ultima_interacao_em: now,
          atualizado_em: now,
          sla_limite_em: buildSla(prioridade),
        })
        .select("id, numero, status")
        .single();

      if (error || !createdTicket) {
        throw new Error(error?.message || "Erro ao abrir ticket.");
      }

      const messagePayload: {
        id_ticket: string;
        autor_tipo: string;
        autor_nome: string;
        mensagem: string;
        interna: boolean;
        id_profissional?: string;
        id_usuario_salao?: string;
      } = {
        id_ticket: createdTicket.id,
        autor_tipo:
          params.context.origem === "app_profissional"
            ? "profissional"
            : "usuario",
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
        throw new Error(
          messageError.message || "Erro ao registrar mensagem do ticket."
        );
      }

      await supabase.from("ticket_eventos").insert({
        id_ticket: createdTicket.id,
        evento: "ticket_aberto",
        descricao:
          params.context.origem === "app_profissional"
            ? "Ticket aberto pelo app profissional."
            : "Ticket aberto pelo painel do salao.",
        payload_json: {
          origem: params.context.origem,
          categoria,
          prioridade,
        } as Json,
      });

      return createdTicket;
    },
  });

  await registrarLogSistema({
    gravidade: "info",
    modulo: "suporte",
    idSalao: params.context.idSalao,
    idUsuario:
      params.context.origem === "painel_salao" ? params.context.idUsuario : null,
    mensagem: "Novo ticket aberto pelo salao.",
    detalhes: {
      id_ticket: ticket.id,
      numero: ticket.numero,
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
  const mensagem = normalizeText(params.mensagem);

  if (!mensagem) {
    throw new Error("INVALID_PAYLOAD");
  }

  const proximoStatus = await runAdminOperation({
    action: "support_reply_salao_ticket",
    actorId:
      params.context.origem === "painel_salao"
        ? params.context.idUsuario
        : params.context.idProfissional,
    idSalao: params.context.idSalao,
    run: async (supabase) => {
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

      const messagePayload: {
        id_ticket: string;
        autor_tipo: string;
        autor_nome: string;
        mensagem: string;
        interna: boolean;
        id_profissional?: string;
        id_usuario_salao?: string;
      } = {
        id_ticket: params.idTicket,
        autor_tipo:
          params.context.origem === "app_profissional"
            ? "profissional"
            : "usuario",
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
      const nextStatus =
        statusAtual === "fechado" || statusAtual === "resolvido"
          ? "aberto"
          : "aguardando_tecnico";
      const now = new Date().toISOString();

      await supabase
        .from("tickets")
        .update({
          status: nextStatus,
          atualizado_em: now,
          ultima_interacao_em: now,
          fechado_em: null,
        })
        .eq("id", params.idTicket)
        .eq("id_salao", params.context.idSalao);

      await supabase.from("ticket_eventos").insert({
        id_ticket: params.idTicket,
        evento: "mensagem_cliente",
        descricao:
          params.context.origem === "app_profissional"
            ? "Nova resposta enviada pelo app profissional."
            : "Nova resposta enviada pelo salao.",
        payload_json: {
          origem: params.context.origem,
          proximo_status: nextStatus,
        },
      });

      return nextStatus;
    },
  });

  await registrarLogSistema({
    gravidade: "info",
    modulo: "suporte",
    idSalao: params.context.idSalao,
    idUsuario:
      params.context.origem === "painel_salao" ? params.context.idUsuario : null,
    mensagem: "Ticket respondido pelo salao.",
    detalhes: {
      id_ticket: params.idTicket,
      origem: params.context.origem,
      status: proximoStatus,
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
  const newStatus = params.status === "fechado" ? "fechado" : "aberto";

  await runAdminOperation({
    action: "support_update_salao_ticket_status",
    actorId:
      params.context.origem === "painel_salao"
        ? params.context.idUsuario
        : params.context.idProfissional,
    idSalao: params.context.idSalao,
    run: async (supabase) => {
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

      await supabase
        .from("tickets")
        .update({
          status: newStatus,
          atualizado_em: now,
          ultima_interacao_em: now,
          fechado_em: newStatus === "fechado" ? now : null,
        })
        .eq("id", params.idTicket)
        .eq("id_salao", params.context.idSalao);

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
    },
  });

  await registrarLogSistema({
    gravidade: "info",
    modulo: "suporte",
    idSalao: params.context.idSalao,
    idUsuario:
      params.context.origem === "painel_salao" ? params.context.idUsuario : null,
    mensagem:
      newStatus === "fechado"
        ? "Ticket encerrado pelo salao."
        : "Ticket reaberto pelo salao.",
    detalhes: {
      id_ticket: params.idTicket,
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
  const mensagem = normalizeText(params.mensagem);

  if (!mensagem) {
    throw new Error("INVALID_PAYLOAD");
  }

  const nextStatus = params.status
    ? normalizeStatus(params.status)
    : "aguardando_cliente";
  const now = new Date().toISOString();

  await runAdminOperation({
    action: "support_reply_admin_ticket",
    actorId: params.context.idAdmin,
    run: async (supabase) => {
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

      const { error: replyError } = await supabase
        .from("ticket_mensagens")
        .insert({
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

      await supabase
        .from("tickets")
        .update(updatePayload)
        .eq("id", params.idTicket);

      await supabase.from("ticket_eventos").insert({
        id_ticket: params.idTicket,
        evento: "resposta_admin",
        descricao: "Resposta enviada pelo AdminMaster.",
        payload_json: {
          status: nextStatus,
          id_admin: params.context.idAdmin,
        } as Json,
      });
    },
  });

  await registrarLogSistema({
    gravidade: "info",
    modulo: "suporte",
    mensagem: "Ticket respondido pelo AdminMaster.",
    detalhes: {
      id_ticket: params.idTicket,
      id_admin: params.context.idAdmin,
      status: nextStatus,
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
  mfaRecoveryAction?: "approve" | "reject" | "complete" | null;
  mfaEvidenceReviewAction?: "valid" | "illegible" | "divergent" | null;
}) {
  const nextStatus = normalizeStatus(params.status);
  const nextPrioridade = params.prioridade
    ? normalizePrioridade(params.prioridade)
    : null;
  const now = new Date().toISOString();

  const statusResult = await runAdminOperation({
    action: "support_update_admin_ticket_status",
    actorId: params.context.idAdmin,
    run: async (supabase) => {
      const { data: ticket, error } = await supabase
        .from("tickets")
        .select("id, id_salao, prioridade, status, origem_contexto")
        .eq("id", params.idTicket)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || "Erro ao localizar ticket.");
      }

      if (!ticket) {
        throw new Error("NOT_FOUND");
      }

      const origemContexto =
        ticket.origem_contexto && typeof ticket.origem_contexto === "object"
          ? { ...(ticket.origem_contexto as Record<string, unknown>) }
          : {};

      const isMfaRecoveryTicket = origemContexto.tipo_fluxo === "recuperacao_2fa";
      let effectiveStatus = nextStatus;
      let eventName = "status_admin_atualizado";
      let eventDescription =
        normalizeText(params.motivo) ||
        `Status ajustado para ${nextStatus} pelo AdminMaster.`;
      let customerMessage = "";
      const recoveryCode =
        typeof origemContexto.recovery_code === "string"
          ? origemContexto.recovery_code
          : "";

      if (params.mfaEvidenceReviewAction) {
        if (!isMfaRecoveryTicket) {
          throw new Error(
            "Este ticket nao foi aberto como recuperacao do autenticador."
          );
        }

        origemContexto.recovery_reviewed_at = now;
        origemContexto.recovery_reviewed_by_admin_id = params.context.idAdmin;

        if (params.mfaEvidenceReviewAction === "valid") {
          origemContexto.recovery_review_status = "valid";
          effectiveStatus = "aguardando_tecnico";
          eventName = "mfa_recovery_evidence_valid";
          eventDescription =
            normalizeText(params.motivo) ||
            "Evidencias marcadas como completas para a recuperacao do autenticador.";
          customerMessage = buildMfaRecoveryEvidenceAcceptedMessage({
            code: recoveryCode || "REC",
          });
        }

        if (params.mfaEvidenceReviewAction === "illegible") {
          origemContexto.recovery_review_status = "illegible";
          effectiveStatus = "aguardando_cliente";
          eventName = "mfa_recovery_evidence_illegible";
          eventDescription =
            normalizeText(params.motivo) ||
            "Evidencias marcadas como ilegiveis. Aguardando novo envio do cliente.";
          customerMessage = buildMfaRecoveryEvidenceIllegibleMessage({
            code: recoveryCode || "REC",
          });
        }

        if (params.mfaEvidenceReviewAction === "divergent") {
          origemContexto.recovery_review_status = "divergent";
          effectiveStatus = "aguardando_cliente";
          eventName = "mfa_recovery_evidence_divergent";
          eventDescription =
            normalizeText(params.motivo) ||
            "Evidencias com divergencia. Aguardando novos dados do cliente.";
          customerMessage = buildMfaRecoveryEvidenceDivergentMessage({
            code: recoveryCode || "REC",
          });
        }
      }

      if (params.mfaRecoveryAction) {
        if (!isMfaRecoveryTicket) {
          throw new Error(
            "Este ticket nao foi aberto como recuperacao do autenticador."
          );
        }

        const delayHours =
          typeof origemContexto.recovery_delay_hours === "number"
            ? origemContexto.recovery_delay_hours
            : 24;

        if (params.mfaRecoveryAction === "approve") {
          const unlockAt = new Date(
            Date.now() + delayHours * 60 * 60 * 1000
          ).toISOString();
          origemContexto.recovery_status = "cooldown";
          origemContexto.recovery_review_status =
            origemContexto.recovery_review_status || "valid";
          origemContexto.recovery_approved_at = now;
          origemContexto.recovery_unlock_at = unlockAt;
          origemContexto.recovery_approved_by_admin_id = params.context.idAdmin;
          effectiveStatus = "aguardando_tecnico";
          eventName = "mfa_recovery_approved";
          eventDescription =
            normalizeText(params.motivo) ||
            `Recuperacao do autenticador aprovada com carencia ate ${unlockAt}.`;
          customerMessage = buildMfaRecoveryApprovedMessage({
            code: recoveryCode || "REC",
            unlockAt,
          });
        }

        if (params.mfaRecoveryAction === "reject") {
          origemContexto.recovery_status = "rejected";
          origemContexto.recovery_rejected_at = now;
          origemContexto.recovery_rejected_by_admin_id = params.context.idAdmin;
          effectiveStatus = "aguardando_cliente";
          eventName = "mfa_recovery_rejected";
          eventDescription =
            normalizeText(params.motivo) ||
            "Recuperacao do autenticador recusada. Aguardando novos dados do cliente.";
          customerMessage = buildMfaRecoveryRejectedMessage({
            code: recoveryCode || "REC",
          });
        }

        if (params.mfaRecoveryAction === "complete") {
          const unlockAt =
            typeof origemContexto.recovery_unlock_at === "string"
              ? origemContexto.recovery_unlock_at
              : "";

          if (!unlockAt || new Date(unlockAt).getTime() > Date.now()) {
            throw new Error(
              "A carencia de seguranca ainda nao terminou para concluir a remocao do autenticador."
            );
          }

          const userIdSalao =
            typeof origemContexto.id_usuario === "string"
              ? origemContexto.id_usuario
              : "";

          if (!ticket.id_salao || !userIdSalao) {
            throw new Error("Nao foi possivel localizar a conta desta recuperacao.");
          }

          const { data: usuarioSalao, error: usuarioSalaoError } = await supabase
            .from("usuarios")
            .select("auth_user_id")
            .eq("id", userIdSalao)
            .eq("id_salao", ticket.id_salao)
            .maybeSingle();

          if (usuarioSalaoError || !usuarioSalao?.auth_user_id) {
            throw new Error(
              usuarioSalaoError?.message ||
                "Nao foi possivel localizar a conta autenticada desta recuperacao."
            );
          }

          const { data: factorsData, error: factorError } =
            await supabase.auth.admin.mfa.listFactors({
              userId: usuarioSalao.auth_user_id,
            });

          if (factorError) {
            throw new Error(
              factorError.message || "Erro ao carregar fatores do autenticador."
            );
          }

          const totpFactor =
            factorsData?.factors?.find(
              (factor) =>
                factor.factor_type === "totp" && factor.status === "verified"
            ) || null;

          if (totpFactor) {
            const { error: deleteFactorError } =
              await supabase.auth.admin.mfa.deleteFactor({
                id: totpFactor.id,
                userId: usuarioSalao.auth_user_id,
              });

            if (deleteFactorError) {
              throw new Error(
                deleteFactorError.message ||
                  "Nao foi possivel remover o autenticador desta conta."
              );
            }
          }

          const { data: authUserData, error: authUserError } =
            await supabase.auth.admin.getUserById(usuarioSalao.auth_user_id);

          if (authUserError || !authUserData?.user) {
            throw new Error(
              authUserError?.message ||
                "Nao foi possivel atualizar a conta autenticada."
            );
          }

          const currentAppMetadata = (authUserData.user.app_metadata ||
            {}) as Record<string, unknown>;
          const currentMfaMetadata =
            (currentAppMetadata.salaopremium_mfa as Record<string, unknown> | undefined) ||
            {};
          const recoveryLockUntil = new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString();

          const { error: updateAuthError } =
            await supabase.auth.admin.updateUserById(usuarioSalao.auth_user_id, {
              app_metadata: {
                ...currentAppMetadata,
                salaopremium_mfa: {
                  ...currentMfaMetadata,
                  ...clearBackupMetadata(),
                  recovery_lock_until: recoveryLockUntil,
                  recovery_reset_completed_at: now,
                },
              },
            });

          if (updateAuthError) {
            throw new Error(
              updateAuthError.message ||
                "Nao foi possivel finalizar a recuperacao do autenticador."
            );
          }

          origemContexto.recovery_status = "completed";
          origemContexto.recovery_completed_at = now;
          origemContexto.recovery_completed_by_admin_id = params.context.idAdmin;
          origemContexto.recovery_post_lock_until = recoveryLockUntil;
          effectiveStatus = "resolvido";
          eventName = "mfa_recovery_completed";
          eventDescription =
            normalizeText(params.motivo) ||
            "Autenticador removido apos a carencia de seguranca.";
          customerMessage = buildMfaRecoveryCompletedMessage({
            code: recoveryCode || "REC",
            lockUntil: recoveryLockUntil,
          });
        }
      }

      const prioridadeAtualizada = nextPrioridade || ticket.prioridade;
      const updatePayload: Record<string, unknown> = {
        status: effectiveStatus,
        prioridade: prioridadeAtualizada,
        atualizado_em: now,
        ultima_interacao_em: now,
        fechado_em:
          effectiveStatus === "fechado" || effectiveStatus === "resolvido"
            ? now
            : null,
        origem_contexto: origemContexto as Json,
      };

      if (params.assumir !== false) {
        updatePayload.id_responsavel_admin = params.context.idAdmin;
      }

      await supabase
        .from("tickets")
        .update(updatePayload)
        .eq("id", params.idTicket);

      await supabase.from("ticket_eventos").insert({
        id_ticket: params.idTicket,
        evento: eventName,
        descricao: eventDescription,
        payload_json: {
          status: effectiveStatus,
          prioridade: prioridadeAtualizada,
          id_admin: params.context.idAdmin,
          mfa_recovery_action: params.mfaRecoveryAction || null,
        } as Json,
      });

      if (customerMessage) {
        await supabase.from("ticket_mensagens").insert({
          id_ticket: params.idTicket,
          autor_tipo: "admin",
          autor_nome: "Equipe de seguranca",
          mensagem: customerMessage,
          interna: false,
          id_admin_usuario: params.context.idAdmin,
        });
      }

      return {
        prioridade: String(prioridadeAtualizada || ticket.prioridade || "media"),
        status: effectiveStatus,
      };
    },
  });

  await registrarLogSistema({
    gravidade: "info",
    modulo: "suporte",
    mensagem: "Status do ticket atualizado pelo AdminMaster.",
    detalhes: {
      id_ticket: params.idTicket,
      id_admin: params.context.idAdmin,
      status: statusResult.status,
      prioridade: statusResult.prioridade,
      mfa_recovery_action: params.mfaRecoveryAction || null,
    },
  });

  return {
    ok: true,
    status: statusResult.status,
    prioridade: statusResult.prioridade,
  };
}

export async function uploadSalaoTicketAttachment(params: {
  context: SalaoTicketContext;
  idTicket: string;
  fileName: string;
  contentType: string;
  bytes: Uint8Array;
  mensagem?: string | null;
}) {
  const fileName = sanitizeFileName(params.fileName);
  const contentType = normalizeText(params.contentType).toLowerCase();
  const mensagem = normalizeText(params.mensagem) || "Anexo enviado para analise.";

  if (!fileName || !params.bytes?.byteLength) {
    throw new Error("INVALID_PAYLOAD");
  }

  if (
    !TICKET_ATTACHMENT_ALLOWED_TYPES.has(contentType) ||
    params.bytes.byteLength > TICKET_ATTACHMENT_MAX_BYTES
  ) {
    throw new Error("INVALID_ATTACHMENT");
  }

  const attachmentPath = `${params.context.idSalao}/${params.idTicket}/${Date.now()}-${crypto.randomUUID()}-${fileName}`;

  const nextStatus = await runAdminOperation({
    action: "support_upload_salao_ticket_attachment",
    actorId:
      params.context.origem === "painel_salao"
        ? params.context.idUsuario
        : params.context.idProfissional,
    idSalao: params.context.idSalao,
    run: async (supabase) => {
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

      const { error: uploadError } = await supabase.storage
        .from(TICKET_ATTACHMENT_BUCKET)
        .upload(attachmentPath, params.bytes, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message || "Erro ao enviar anexo.");
      }

      const attachmentMeta = [
        {
          bucket: TICKET_ATTACHMENT_BUCKET,
          path: attachmentPath,
          fileName,
          contentType,
          sizeBytes: params.bytes.byteLength,
        },
      ] satisfies TicketAttachment[];

      const messagePayload: {
        anexos_json: Json;
        autor_nome: string;
        autor_tipo: string;
        id_profissional?: string;
        id_ticket: string;
        id_usuario_salao?: string;
        interna: boolean;
        mensagem: string;
      } = {
        anexos_json: attachmentMeta as unknown as Json,
        autor_nome: params.context.nome,
        autor_tipo:
          params.context.origem === "app_profissional" ? "profissional" : "usuario",
        id_ticket: params.idTicket,
        interna: false,
        mensagem,
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
        throw new Error(messageError.message || "Erro ao registrar anexo.");
      }

      const statusAtual = normalizeStatus(ticket.status);
      const nextStatus =
        statusAtual === "fechado" || statusAtual === "resolvido"
          ? "aberto"
          : "aguardando_tecnico";
      const now = new Date().toISOString();

      await supabase
        .from("tickets")
        .update({
          status: nextStatus,
          atualizado_em: now,
          ultima_interacao_em: now,
          fechado_em: null,
        })
        .eq("id", params.idTicket)
        .eq("id_salao", params.context.idSalao);

      await supabase.from("ticket_eventos").insert({
        id_ticket: params.idTicket,
        evento: "anexo_cliente",
        descricao:
          params.context.origem === "app_profissional"
            ? "Novo anexo enviado pelo app profissional."
            : "Novo anexo enviado pelo salao.",
        payload_json: {
          origem: params.context.origem,
          arquivo: fileName,
          content_type: contentType,
          proximo_status: nextStatus,
        } as Json,
      });

      return nextStatus;
    },
  });

  await registrarLogSistema({
    gravidade: "info",
    modulo: "suporte",
    idSalao: params.context.idSalao,
    idUsuario:
      params.context.origem === "painel_salao" ? params.context.idUsuario : null,
    mensagem: "Anexo enviado para ticket do salao.",
    detalhes: {
      arquivo: fileName,
      id_ticket: params.idTicket,
      origem: params.context.origem,
      status: nextStatus,
    },
  });

  return { ok: true, status: nextStatus };
}
