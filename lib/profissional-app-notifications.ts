import "server-only";

import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ProfissionalAppNotification } from "@/lib/profissional-app-notification-contracts";
import type { ProfissionalServerContext } from "@/lib/profissional-context.server";

type TicketRow = {
  id: string;
  numero?: number | string | null;
  origem_contexto?: Record<string, unknown> | null;
};

type TicketEventoRow = {
  id: string;
  id_ticket: string;
  evento?: string | null;
  descricao?: string | null;
  payload_json?: Record<string, unknown> | null;
  criado_em?: string | null;
};

type NotificationJobRow = {
  id: string;
  tipo?: string | null;
  titulo?: string | null;
  mensagem?: string | null;
  status?: string | null;
  url?: string | null;
  enviar_em?: string | null;
  created_at?: string | null;
};

function notificationActionLabel(type?: string | null) {
  const normalized = String(type || "").toLowerCase();

  if (normalized.includes("lembrete")) return "Ver agenda";
  if (normalized.includes("finalizado")) return "Ver atendimento";
  if (normalized.includes("cancelamento")) return "Ver agenda";
  if (normalized.includes("reagendamento")) return "Ver novo horário";
  if (normalized.includes("comanda")) return "Ver comanda";

  return "Abrir";
}

async function fetchPasswordNotifications(
  idSalao: string,
  idProfissional: string
): Promise<ProfissionalAppNotification[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: tickets, error: ticketsError } = await supabaseAdmin
    .from("tickets")
    .select("id, numero, origem_contexto")
    .eq("id_salao", idSalao)
    .eq("origem", "app_profissional_login")
    .order("atualizado_em", { ascending: false })
    .limit(20);

  if (ticketsError) {
    throw ticketsError;
  }

  const ownedTickets = ((tickets || []) as TicketRow[]).filter((ticket) => {
    const origemContexto =
      ticket.origem_contexto && typeof ticket.origem_contexto === "object"
        ? ticket.origem_contexto
        : {};

    return String(origemContexto.id_profissional || "").trim() === idProfissional;
  });

  if (!ownedTickets.length) {
    return [];
  }

  const ticketMap = new Map(
    ownedTickets.map((ticket) => [ticket.id, Number(ticket.numero || 0)])
  );

  const { data: eventos, error: eventosError } = await supabaseAdmin
    .from("ticket_eventos")
    .select("id, id_ticket, evento, descricao, payload_json, criado_em")
    .in("id_ticket", ownedTickets.map((ticket) => ticket.id))
    .eq("evento", "senha_redefinida_salao")
    .order("criado_em", { ascending: false })
    .limit(5);

  if (eventosError) {
    throw eventosError;
  }

  return ((eventos || []) as TicketEventoRow[]).map((evento) => {
    const payload =
      evento.payload_json && typeof evento.payload_json === "object"
        ? evento.payload_json
        : {};
    const nomeSalao =
      String(payload.nome_salao || "").trim() || "seu salao";
    const numeroTicket = ticketMap.get(evento.id_ticket);

    return {
      id: evento.id,
      title: "Senha alterada pelo salão",
      description:
        evento.descricao?.trim() ||
        `O salão ${nomeSalao} redefiniu sua senha de acesso ao app profissional.`,
      createdAt: evento.criado_em || null,
      type: "senha_redefinida_salao",
      status: "enviada",
      actionLabel: numeroTicket ? `Ticket #${numeroTicket}` : "Ver notificação",
      href: `/app-profissional/notificacoes?notificacao=${encodeURIComponent(evento.id)}`,
    };
  });
}

async function fetchJobNotifications(
  idSalao: string,
  idProfissional: string
): Promise<ProfissionalAppNotification[]> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await (supabaseAdmin as any)
    .from("notification_jobs")
    .select("id, tipo, titulo, mensagem, status, url, enviar_em, created_at")
    .eq("id_salao", idSalao)
    .eq("id_profissional", idProfissional)
    .eq("canal", "profissional_app")
    .neq("status", "cancelada")
    .lte("enviar_em", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    const message = String(error.message || "");
    if (message.includes("notification_jobs") || message.includes("does not exist")) {
      return [];
    }

    throw error;
  }

  return ((data || []) as NotificationJobRow[]).map((item) => {
    const type = String(item.tipo || "").trim();
    const url = String(item.url || "").trim();

    return {
      id: item.id,
      title: String(item.titulo || "").trim() || "Notificação do atendimento",
      description:
        String(item.mensagem || "").trim() ||
        "Você tem uma atualização importante no App Profissional.",
      createdAt: String(item.created_at || item.enviar_em || "").trim() || null,
      type,
      status: String(item.status || "").trim() || null,
      actionLabel: notificationActionLabel(type),
      href: url || "/app-profissional/notificacoes",
    };
  });
}

async function fetchProfissionalAppNotifications(
  idSalao: string,
  idProfissional: string
): Promise<ProfissionalAppNotification[]> {
  const [passwordNotifications, jobNotifications] = await Promise.all([
    fetchPasswordNotifications(idSalao, idProfissional),
    fetchJobNotifications(idSalao, idProfissional),
  ]);

  return [...passwordNotifications, ...jobNotifications]
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      return dateB - dateA;
    })
    .slice(0, 40);
}

const getCachedProfissionalAppNotifications = unstable_cache(
  async (cachedSalaoId: string, cachedProfissionalId: string) =>
    fetchProfissionalAppNotifications(cachedSalaoId, cachedProfissionalId),
  ["profissional-app-notifications"],
  {
    revalidate: 30,
  }
);

export async function listProfissionalAppNotifications(
  context: ProfissionalServerContext
): Promise<ProfissionalAppNotification[]> {
  return getCachedProfissionalAppNotifications(
    context.idSalao,
    context.idProfissional
  );
}
