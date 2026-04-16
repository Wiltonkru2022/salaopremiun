import Link from "next/link";
import AdminTicketDetailClient from "@/components/admin-master/tickets/AdminTicketDetailClient";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getAdminTicketDetail } from "@/lib/support/tickets";

export const dynamic = "force-dynamic";

export default async function AdminMasterTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdminMasterUser("tickets_ver");
  const { id } = await params;
  const detail = await getAdminTicketDetail(id);

  return (
    <div className="space-y-6">
      <section className="rounded-[34px] bg-zinc-950 p-7 text-white shadow-sm">
        <Link href="/admin-master/tickets" className="text-sm font-bold text-amber-200">
          Voltar para tickets
        </Link>
        <h2 className="mt-4 font-display text-4xl font-black">
          Ticket #{detail.ticket.numero}
        </h2>
        <p className="mt-2 text-sm text-zinc-300">
          {detail.salao?.nome || "Salao nao identificado"} •{" "}
          {detail.ticket.assunto}
        </p>
      </section>

      <AdminTicketDetailClient
        detail={detail}
        canEdit={admin.permissions.tickets_editar}
      />
    </div>
  );
}
