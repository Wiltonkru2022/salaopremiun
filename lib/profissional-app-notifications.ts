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

async function fetchProfissionalAppNotifications(
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
      title: "Senha alterada pelo salao",
      description:
        evento.descricao?.trim() ||
        `O salao ${nomeSalao} redefiniu sua senha de acesso ao app profissional.`,
      createdAt: evento.criado_em || null,
      actionLabel: numeroTicket ? `Ticket #${numeroTicket}` : "Ver suporte",
      href: "/app-profissional/suporte",
    };
  });
}

const getCachedProfissionalAppNotifications = unstable_cache(
  async (cachedSalaoId: string, cachedProfissionalId: string) =>
    fetchProfissionalAppNotifications(cachedSalaoId, cachedProfissionalId),
  ["profissional-app-notifications"],
  {
    revalidate: 60,
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
