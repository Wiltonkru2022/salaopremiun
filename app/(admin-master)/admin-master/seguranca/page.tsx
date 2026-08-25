import Link from "next/link";
import { Filter, Search, ShieldCheck } from "lucide-react";
import AdminMasterDataTableClient from "@/components/admin-master/AdminMasterDataTableClient";
import AdminMasterPageHeader, { AdminMasterMetricCard } from "@/components/admin-master/AdminMasterPageHeader";
import AdminMasterSecurityActionButton from "@/components/admin-master/AdminMasterSecurityActionButton";
import PaginationLinks from "@/components/ui/PaginationLinks";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

type SearchParams = {
  pagina?: string;
  periodo?: string;
  severidade?: string;
  busca?: string;
};

type SecurityEventRow = { id: string; id_usuario: string | null; id_salao: string | null; tipo_evento: string | null; severidade: string | null; mensagem: string | null; detalhes_json: Record<string, unknown> | null; created_at: string | null };
type UserSecurityRow = { user_id: string; tipo_usuario: string | null; status: string | null; motivo: string | null; risco_atual: string | null; bloqueado_ate: string | null; verificacao_necessaria: boolean | null; atualizado_em: string | null };
type SalaoSecurityRow = { id: string; nome: string | null; status_seguranca: string | null; motivo_seguranca: string | null; bloqueado_ate: string | null };

function dateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Campo_Grande" });
}

function detailText(details?: Record<string, unknown> | null) {
  if (!details || typeof details !== "object") return "-";
  const preferred = ["tipoUsuario", "risco", "ip", "identidade", "motivo", "status", "tentativas_10_minutos", "tentativas_1_hora"];
  const values = preferred.map((key) => {
    const value = details[key];
    return value === null || value === undefined || value === "" ? null : `${key.replace(/_/g, " ")}: ${String(value)}`;
  }).filter(Boolean);
  return values.length ? values.join(" · ") : "Detalhes técnicos disponíveis na auditoria.";
}

function statusTone(value?: string | null) {
  const normalized = String(value || "").toLowerCase();
  if (/bloque|alto|critical|critico|erro/.test(normalized)) return "border-rose-200 bg-rose-50";
  if (/analise|verificacao|medio|warning/.test(normalized)) return "border-amber-200 bg-amber-50";
  return "border-zinc-200 bg-white";
}

function periodHours(value?: string) {
  if (value === "24h") return 24;
  if (value === "30d") return 24 * 30;
  if (value === "90d") return 24 * 90;
  return 24 * 7;
}

function buildHref(params: SearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!value || key === "pagina") continue;
    query.set(key, value);
  }
  if (page > 0) query.set("pagina", String(page + 1));
  const suffix = query.toString();
  return `/admin-master/seguranca${suffix ? `?${suffix}` : ""}`;
}

export default async function AdminMasterSegurancaPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await requireAdminMasterUser("operacao_ver");
  const params = searchParams ? await searchParams : {};
  const page = Math.max(0, Number(params.pagina || 1) - 1);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const sinceIso = new Date(Date.now() - periodHours(params.periodo) * 60 * 60 * 1000).toISOString();
  const cleanSearch = String(params.busca || "").replace(/[,%()]/g, " ").trim().slice(0, 80);
  const supabase = getSupabaseAdmin();

  let eventsQuery = supabase
    .from("eventos_sistema")
    .select("id, id_usuario, id_salao, tipo_evento, severidade, mensagem, detalhes_json, created_at", { count: "exact" })
    .eq("modulo", "security")
    .gte("created_at", sinceIso);
  let highRiskQuery = supabase
    .from("eventos_sistema")
    .select("id", { count: "exact", head: true })
    .eq("modulo", "security")
    .gte("created_at", sinceIso)
    .in("severidade", ["critical", "error", "critico", "crítico"]);
  let loginFailuresQuery = supabase
    .from("eventos_sistema")
    .select("id", { count: "exact", head: true })
    .eq("modulo", "security")
    .gte("created_at", sinceIso)
    .ilike("tipo_evento", "%login_falhou%");

  if (params.severidade && params.severidade !== "todas") {
    eventsQuery = eventsQuery.eq("severidade", params.severidade);
    highRiskQuery = highRiskQuery.eq("severidade", params.severidade);
    loginFailuresQuery = loginFailuresQuery.eq("severidade", params.severidade);
  }
  if (cleanSearch.length >= 2) {
    const expression = `tipo_evento.ilike.%${cleanSearch}%,mensagem.ilike.%${cleanSearch}%`;
    eventsQuery = eventsQuery.or(expression);
    highRiskQuery = highRiskQuery.or(expression);
    loginFailuresQuery = loginFailuresQuery.or(expression);
  }

  const [eventsResult, highRiskResult, loginFailuresResult, usersResult, saloesResult] = await Promise.all([
    eventsQuery.order("created_at", { ascending: false }).range(from, to),
    highRiskQuery,
    loginFailuresQuery,
    supabase.from("user_security_status").select("user_id, tipo_usuario, status, motivo, risco_atual, bloqueado_ate, verificacao_necessaria, atualizado_em").neq("status", "ativo").order("atualizado_em", { ascending: false }).limit(60),
    supabase.from("saloes").select("id, nome, status_seguranca, motivo_seguranca, bloqueado_ate").neq("status_seguranca", "ativo").order("nome", { ascending: true }).limit(60),
  ]);

  const events = ((eventsResult.data || []) as SecurityEventRow[]).filter((row) => row.id);
  const users = ((usersResult.data || []) as UserSecurityRow[]).filter((row) => row.user_id);
  const saloes = ((saloesResult.data || []) as SalaoSecurityRow[]).filter((row) => row.id);
  const totalEvents = eventsResult.count || 0;
  const highRisk = highRiskResult.count || 0;
  const loginFailures = loginFailuresResult.count || 0;

  const eventRows = events.map((event) => ({
    evento: String(event.tipo_evento || "evento").replace(/_/g, " "),
    gravidade: event.severidade || "info",
    mensagem: event.mensagem || "Evento de segurança",
    detalhe: detailText(event.detalhes_json),
    usuario: event.id_usuario || "-",
    salao: event.id_salao || "-",
    criado_em: dateTime(event.created_at),
  }));

  return (
    <div className="space-y-5">
      <AdminMasterPageHeader
        title="Segurança"
        description="Histórico paginado de eventos, bloqueios e ações sensíveis com confirmação, motivo obrigatório, MFA AAL2 e trilha de auditoria."
        eyebrow="Proteção do ecossistema"
        actions={<><Link href="/admin-master/atividades" className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 hover:border-violet-200 hover:text-violet-700">Ver auditoria</Link><AdminMasterSecurityActionButton type="retention" /></>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMasterMetricCard label="Eventos no período" value={totalEvents} hint="Total histórico filtrado" />
        <AdminMasterMetricCard label="Alto risco" value={highRisk} hint="Críticos ou erros no período" tone={highRisk ? "red" : "green"} />
        <AdminMasterMetricCard label="Falhas de login" value={loginFailures} hint="Total no período" tone={loginFailures ? "amber" : "green"} />
        <AdminMasterMetricCard label="Bloqueios ativos" value={users.length + saloes.length} hint={`${users.length} usuário(s) · ${saloes.length} salão(ões)`} tone={users.length + saloes.length ? "amber" : "green"} />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <form method="get" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 sm:col-span-2">
            <Search size={15} className="text-zinc-400" />
            <input name="busca" defaultValue={params.busca || ""} placeholder="Evento ou mensagem" className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" />
          </label>
          <select name="periodo" defaultValue={params.periodo || "7d"} className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700">
            <option value="24h">Últimas 24h</option><option value="7d">7 dias</option><option value="30d">30 dias</option><option value="90d">90 dias</option>
          </select>
          <select name="severidade" defaultValue={params.severidade || "todas"} className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700">
            <option value="todas">Todas gravidades</option><option value="critical">Crítica</option><option value="error">Erro</option><option value="warning">Alerta</option><option value="info">Informação</option>
          </select>
          <div className="flex gap-2 sm:col-span-2 xl:col-span-4 xl:justify-end">
            <Link href="/admin-master/seguranca" className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 px-4 text-sm font-bold text-zinc-600">Limpar</Link>
            <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-bold text-white"><Filter size={15} /> Aplicar</button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">Usuários</div><h2 className="mt-1 text-lg font-black text-zinc-950">Bloqueios e verificações</h2></div><ShieldCheck size={19} className="text-zinc-400" /></div>
          <div className="mt-4 space-y-3">
            {users.map((row) => <div key={row.user_id} className={`rounded-2xl border p-4 ${statusTone(`${row.status} ${row.risco_atual}`)}`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="font-black text-zinc-950">{row.tipo_usuario || "Usuário"}</div><div className="mt-1 break-all text-xs text-zinc-500">{row.user_id}</div><div className="mt-2 text-sm text-zinc-700">{row.motivo || "Bloqueio de segurança"}</div><div className="mt-1 text-xs text-zinc-500">Risco: {row.risco_atual || "-"} · Atualizado {dateTime(row.atualizado_em)}</div></div><AdminMasterSecurityActionButton type="user" userId={row.user_id} tipoUsuario={row.tipo_usuario || "salao"} /></div></div>)}
            {!users.length ? <div className="rounded-2xl bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">Nenhum usuário bloqueado.</div> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">Salões</div><h2 className="mt-1 text-lg font-black text-zinc-950">Contas bloqueadas por segurança</h2>
          <div className="mt-4 space-y-3">
            {saloes.map((row) => <div key={row.id} className={`rounded-2xl border p-4 ${statusTone(row.status_seguranca)}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-black text-zinc-950">{row.nome || "Salão"}</div><div className="mt-2 text-sm text-zinc-700">{row.motivo_seguranca || "Bloqueio de segurança"}</div><div className="mt-1 text-xs text-zinc-500">Bloqueado até: {dateTime(row.bloqueado_ate)}</div></div><AdminMasterSecurityActionButton type="salao" idSalao={row.id} /></div></div>)}
            {!saloes.length ? <div className="rounded-2xl bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">Nenhum salão bloqueado por segurança.</div> : null}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="px-1"><h2 className="text-base font-black text-zinc-950">Telemetria de segurança</h2><p className="mt-0.5 text-xs text-zinc-500">Histórico server-side; a tabela mantém exportação e cards responsivos no celular.</p></div>
        <AdminMasterDataTableClient rows={eventRows} columns={["evento", "gravidade", "mensagem", "detalhe", "usuario", "salao", "criado_em"]} emptyTitle="Nenhum evento de segurança" emptyDescription="Nenhum evento foi registrado com os filtros atuais." />
        <PaginationLinks currentPage={page} pageSize={PAGE_SIZE} totalItems={totalEvents} getHref={(nextPage) => buildHref(params, nextPage)} />
      </section>
    </div>
  );
}
