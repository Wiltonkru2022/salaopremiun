import Link from "next/link";
import { Filter, Plus, Search } from "lucide-react";
import AdminMasterPageHeader, { AdminMasterMetricCard } from "@/components/admin-master/AdminMasterPageHeader";
import AdminTicketQueueClient from "@/components/admin-master/tickets/AdminTicketQueueClient";
import PaginationLinks from "@/components/ui/PaginationLinks";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAdminTicketGlobalMetrics } from "@/lib/support/admin-ticket-metrics";
import { listAdminTickets, type AdminTicketListParams } from "@/lib/support/tickets";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 15;

type SearchParams = {
  pagina?: string;
  busca?: string;
  status?: string;
  prioridade?: string;
  sla?: string;
  responsavel?: string;
  recovery?: string;
  periodo?: string;
  ordem?: string;
};

function int(value: string | undefined, fallback: number) {
  const parsed = Number(value || fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildHref(params: SearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!value || key === "pagina") continue;
    query.set(key, value);
  }
  if (page > 0) query.set("pagina", String(page + 1));
  const suffix = query.toString();
  return `/admin-master/tickets${suffix ? `?${suffix}` : ""}`;
}

export default async function AdminMasterTicketsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const admin = await requireAdminMasterUser("tickets_ver");
  const params = searchParams ? await searchParams : {};
  const page = Math.max(0, int(params.pagina, 1) - 1);
  const periodDays = params.periodo && params.periodo !== "todos" ? Math.max(1, int(params.periodo, 30)) : undefined;
  const supabase = getSupabaseAdmin();
  const filters: AdminTicketListParams = {
    search: params.busca,
    status: params.status,
    prioridade: params.prioridade,
    sla: (["vencido", "proximo", "ok"].includes(params.sla || "") ? params.sla : "todos") as "todos" | "vencido" | "proximo" | "ok",
    responsavelAdminId: params.responsavel,
    recovery: (["sim", "nao"].includes(params.recovery || "") ? params.recovery : "todos") as "todos" | "sim" | "nao",
    periodDays,
    order: (["antigos", "sla"].includes(params.ordem || "") ? params.ordem : "recentes") as "recentes" | "antigos" | "sla",
  };

  const [{ items }, globalMetrics, { data: adminsData }] = await Promise.all([
    listAdminTickets({ ...filters, page, limit: PAGE_SIZE }),
    getAdminTicketGlobalMetrics(filters),
    supabase.from("admin_master_usuarios").select("id, nome, email").eq("status", "ativo").order("nome", { ascending: true }).limit(40),
  ]);

  const admins = ((adminsData || []) as Array<{ id: string; nome?: string | null; email?: string | null }>).map((row) => ({
    id: row.id,
    nome: row.nome || row.email || "Admin Master",
    email: row.email || "",
  }));

  return (
    <div className="space-y-5">
      <AdminMasterPageHeader
        title="Central de atendimento"
        description="Fila única para pesquisar, priorizar, atribuir responsáveis, acompanhar SLA e resolver tickets sem perder contexto do salão."
        eyebrow="Atendimento"
        actions={
          <Link href="/admin-master/tickets/novo" className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white transition hover:bg-violet-800">
            <Plus size={16} /> Novo ticket
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminMasterMetricCard label="Encontrados" value={globalMetrics.total} hint="Toda a fila com os filtros atuais" tone="violet" />
        <AdminMasterMetricCard label="Em andamento" value={globalMetrics.abertos} hint="Total global filtrado" tone={globalMetrics.abertos ? "amber" : "green"} />
        <AdminMasterMetricCard label="SLA vencido" value={globalMetrics.slaVencido} hint="Exige ação imediata" tone={globalMetrics.slaVencido ? "red" : "green"} />
        <AdminMasterMetricCard label="SLA em até 4h" value={globalMetrics.slaProximo} hint="Prioridade preventiva" tone={globalMetrics.slaProximo ? "amber" : "default"} />
        <AdminMasterMetricCard label="Sem responsável" value={globalMetrics.semResponsavel} hint="Tickets abertos sem atribuição" tone={globalMetrics.semResponsavel ? "amber" : "green"} />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <form method="get" className="grid gap-3 lg:grid-cols-4 xl:grid-cols-8">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 lg:col-span-2">
            <Search size={15} className="text-zinc-400" />
            <input name="busca" defaultValue={params.busca || ""} placeholder="Ticket, salão, responsável ou solicitante" className="min-w-0 flex-1 bg-transparent text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400" />
          </label>
          <select name="status" defaultValue={params.status || "todos"} className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700">
            <option value="todos">Todos os status</option><option value="aberto">Aberto</option><option value="em_atendimento">Em atendimento</option><option value="aguardando_cliente">Aguardando cliente</option><option value="aguardando_tecnico">Aguardando técnico</option><option value="resolvido">Resolvido</option><option value="fechado">Fechado</option>
          </select>
          <select name="prioridade" defaultValue={params.prioridade || "todas"} className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700">
            <option value="todas">Todas prioridades</option><option value="critica">Crítica</option><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option>
          </select>
          <select name="sla" defaultValue={params.sla || "todos"} className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700">
            <option value="todos">Qualquer SLA</option><option value="vencido">SLA vencido</option><option value="proximo">Vence em até 4h</option><option value="ok">Dentro do SLA</option>
          </select>
          <select name="responsavel" defaultValue={params.responsavel || "todos"} className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700">
            <option value="todos">Todos responsáveis</option><option value="sem_responsavel">Sem responsável</option>{admins.map((option) => <option key={option.id} value={option.id}>{option.nome}</option>)}
          </select>
          <select name="recovery" defaultValue={params.recovery || "todos"} className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700">
            <option value="todos">Todos os fluxos</option><option value="sim">Recuperação MFA</option><option value="nao">Sem recuperação MFA</option>
          </select>
          <select name="periodo" defaultValue={params.periodo || "30"} className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700">
            <option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option><option value="todos">Todo período</option>
          </select>
          <select name="ordem" defaultValue={params.ordem || "recentes"} className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700">
            <option value="recentes">Mais recentes</option><option value="sla">SLA primeiro</option><option value="antigos">Mais antigos</option>
          </select>
          <div className="flex gap-2 lg:col-span-2 xl:col-span-8 xl:justify-end">
            <Link href="/admin-master/tickets" className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-600 hover:bg-zinc-50">Limpar</Link>
            <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-bold text-white hover:bg-zinc-800"><Filter size={15} /> Aplicar filtros</button>
          </div>
        </form>
      </section>

      <AdminTicketQueueClient items={items} admins={admins} currentAdminId={admin.usuario.id} canEdit={admin.permissions.tickets_editar} />

      <PaginationLinks
        currentPage={page}
        pageSize={PAGE_SIZE}
        totalItems={globalMetrics.total}
        getHref={(nextPage) => buildHref(params, nextPage)}
      />
    </div>
  );
}
