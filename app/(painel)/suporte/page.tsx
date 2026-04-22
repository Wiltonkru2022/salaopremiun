import SupportDeskClient from "@/components/support/SupportDeskClient";
import { requirePagePermission } from "@/lib/auth/require-page-permission";
import { getSalaoTicketDetail, listSalaoTickets } from "@/lib/support/tickets";

export const dynamic = "force-dynamic";

export default async function SuportePage() {
  const usuario = await requirePagePermission("suporte_ver");
  if (!usuario.id_salao) {
    throw new Error("Usuario sem vinculo com salao.");
  }

  const tickets = await listSalaoTickets(usuario.id_salao);
  const firstTicketId = tickets.items[0]?.id || null;
  const initialDetail = firstTicketId
    ? await getSalaoTicketDetail({
        idSalao: usuario.id_salao,
        idTicket: firstTicketId,
      }).catch(() => null)
    : null;

  return (
    <SupportDeskClient
      initialItems={tickets.items}
      initialMetrics={tickets.metrics}
      initialDetail={initialDetail}
    />
  );
}
