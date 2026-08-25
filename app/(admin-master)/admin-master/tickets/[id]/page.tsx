import Link from "next/link";
import AdminMasterPageHeader, { AdminMasterMetricCard } from "@/components/admin-master/AdminMasterPageHeader";
import AdminTicketDetailClient from "@/components/admin-master/tickets/AdminTicketDetailClient";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getAdminTicketDetail } from "@/lib/support/tickets";

export const dynamic = "force-dynamic";

export default async function AdminMasterTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminMasterUser("tickets_ver");
  const { id } = await params;
  const detail = await getAdminTicketDetail(id);
  const salaoNome = detail.salao?.nome || "Salão não identificado";

  return (
    <div className="space-y-5">
      <AdminMasterPageHeader
        title={`Ticket #${detail.ticket.numero}`}
        description={`${salaoNome} · ${detail.ticket.assunto}`}
        eyebrow="Atendimento"
        breadcrumb={[{ label: "Admin Master", href: "/admin-master" }, { label: "Tickets", href: "/admin-master/tickets" }, { label: `#${detail.ticket.numero}` }]}
        actions={<>{detail.salao?.id ? <Link href={`/admin-master/saloes/${detail.salao.id}`} className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 hover:border-violet-200 hover:text-violet-700">Raio-X do salão</Link> : null}<Link href="/admin-master/logs" className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 hover:border-violet-200 hover:text-violet-700">Investigar logs</Link></>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMasterMetricCard label="Status" value={detail.ticket.status.replace(/_/g, " ")} tone={['resolvido','fechado'].includes(detail.ticket.status) ? 'green' : 'amber'} />
        <AdminMasterMetricCard label="Prioridade" value={detail.ticket.prioridade} tone={detail.ticket.prioridade === 'critica' ? 'red' : detail.ticket.prioridade === 'alta' ? 'amber' : 'blue'} />
        <AdminMasterMetricCard label="Categoria" value={detail.ticket.categoria} />
        <AdminMasterMetricCard label="SLA" value={detail.ticket.slaLimiteEm ? new Date(detail.ticket.slaLimiteEm).toLocaleString("pt-BR", { timeZone: "America/Campo_Grande" }) : "-"} />
      </section>

      <AdminTicketDetailClient detail={detail} canEdit={admin.permissions.tickets_editar} />
    </div>
  );
}
