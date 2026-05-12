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
  const salaoNome = detail.salao?.nome || "Salao nao identificado";

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
          {salaoNome} | {detail.ticket.assunto}
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {detail.salao?.id ? (
            <Link
              href={`/admin-master/saloes/${detail.salao.id}`}
              className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/20"
            >
              Raio-x do salao
            </Link>
          ) : null}
          <Link
            href="/admin-master/logs"
            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/20"
          >
            Investigar logs
          </Link>
          <Link
            href="/admin-master/alertas"
            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/20"
          >
            Ver alertas
          </Link>
          <Link
            href="/admin-master/saude"
            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/20"
          >
            Saude 24h
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Status", detail.ticket.status.replace(/_/g, " ")],
          ["Prioridade", detail.ticket.prioridade],
          ["Categoria", detail.ticket.categoria],
          ["SLA", detail.ticket.slaLimiteEm ? new Date(detail.ticket.slaLimiteEm).toLocaleString("pt-BR") : "-"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
              {label}
            </div>
            <div className="mt-2 text-lg font-black text-zinc-950">{value}</div>
          </div>
        ))}
      </section>

      <AdminTicketDetailClient
        detail={detail}
        canEdit={admin.permissions.tickets_editar}
      />
    </div>
  );
}
