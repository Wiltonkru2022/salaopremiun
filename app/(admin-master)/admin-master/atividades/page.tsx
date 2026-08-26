import Link from "next/link";
import { Activity, ArrowRight, Clock3, Filter, UserRound } from "lucide-react";
import AdminMasterDataTableClient from "@/components/admin-master/AdminMasterDataTableClient";
import AdminMasterPageHeader, { AdminMasterMetricCard } from "@/components/admin-master/AdminMasterPageHeader";
import PaginationLinks from "@/components/ui/PaginationLinks";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getDatabaseAdmin } from "@/lib/db/admin";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

type SearchParams = {
  pagina?: string;
  admin?: string;
  acao?: string;
  entidade?: string;
  periodo?: string;
  sensivel?: string;
};

type AuditRow = {
  id: string;
  id_admin_usuario: string | null;
  acao: string | null;
  entidade: string | null;
  entidade_id: string | null;
  descricao: string | null;
  payload_json: Record<string, unknown> | null;
  criado_em: string | null;
};

function dateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Campo_Grande" }).format(parsed);
}

function summarize(value: unknown) {
  if (!value) return "-";
  if (typeof value === "string") return value;
  try {
    const text = JSON.stringify(value);
    return text.length > 180 ? `${text.slice(0, 177)}...` : text;
  } catch {
    return "-";
  }
}

function extractChange(payload: Record<string, unknown> | null, side: "antes" | "depois") {
  if (!payload) return "-";
  const keys = side === "antes" ? ["antes", "before", "anterior", "old"] : ["depois", "after", "novo", "new"];
  for (const key of keys) if (payload[key] !== undefined) return summarize(payload[key]);
  return "-";
}

function actionLabel(value?: string | null) {
  return String(value || "atividade").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function periodStart(value?: string) {
  const now = Date.now();
  if (value === "24h") return new Date(now - 24 * 60 * 60 * 1000).toISOString();
  if (value === "30d") return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  if (value === "90d") return new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
  if (value === "todos") return null;
  return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
}

function buildHref(params: SearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!value || key === "pagina") continue;
    query.set(key, value);
  }
  if (page > 0) query.set("pagina", String(page + 1));
  const suffix = query.toString();
  return `/admin-master/atividades${suffix ? `?${suffix}` : ""}`;
}

export default async function AdminMasterAtividadesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await requireAdminMasterUser("auditoria_ver");
  const params = searchParams ? await searchParams : {};
  const page = Math.max(0, Number(params.pagina || 1) - 1);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const supabase = getDatabaseAdmin();

  let auditQuery = supabase
    .from("admin_master_auditoria")
    .select("id, id_admin_usuario, acao, entidade, entidade_id, descricao, payload_json, criado_em", { count: "exact" });

  const since = periodStart(params.periodo);
  if (since) auditQuery = auditQuery.gte("criado_em", since);
  if (params.admin && params.admin !== "todos") auditQuery = auditQuery.eq("id_admin_usuario", params.admin);
  if (params.acao?.trim()) auditQuery = auditQuery.ilike("acao", `%${params.acao.replace(/[,%()]/g, " ").trim().slice(0, 60)}%`);
  if (params.entidade?.trim()) auditQuery = auditQuery.ilike("entidade", `%${params.entidade.replace(/[,%()]/g, " ").trim().slice(0, 60)}%`);
  if (params.sensivel === "sim") {
    auditQuery = auditQuery.or("acao.ilike.%segur%,acao.ilike.%desbloq%,acao.ilike.%assinatura%,acao.ilike.%cobranca%,acao.ilike.%plano%,acao.ilike.%permiss%,entidade.ilike.%segur%,entidade.ilike.%cobranca%");
  }

  const [auditResult, adminsResult] = await Promise.all([
    auditQuery.order("criado_em", { ascending: false }).range(from, to),
    supabase.from("admin_master_usuarios").select("id, nome, email, status").order("nome", { ascending: true }).limit(100),
  ]);

  if (auditResult.error) throw new Error(auditResult.error.message || "Erro ao carregar auditoria.");
  const rows = ((auditResult.data || []) as AuditRow[]).filter((row) => row.id);
  const admins = ((adminsResult.data || []) as Array<{ id: string; nome?: string | null; email?: string | null; status?: string | null }>).filter((row) => row.id);
  const adminById = new Map(admins.map((admin) => [admin.id, admin.nome || admin.email || "Admin Master"]));
  const total = auditResult.count || 0;
  const sensitiveOnPage = rows.filter((row) => /segur|desbloq|assinatura|cobranca|plano|permiss/i.test(`${row.acao} ${row.entidade}`)).length;
  const actorsOnPage = new Set(rows.map((row) => row.id_admin_usuario).filter(Boolean)).size;
  const last24hOnPage = rows.filter((row) => row.criado_em && Date.now() - new Date(row.criado_em).getTime() <= 24 * 60 * 60 * 1000).length;

  const tableRows = rows.map((row) => ({
    administrador: row.id_admin_usuario ? adminById.get(row.id_admin_usuario) || "Admin Master" : "Sistema",
    acao: actionLabel(row.acao),
    entidade: row.entidade || "-",
    descricao: row.descricao || "Ação administrativa registrada.",
    antes: extractChange(row.payload_json, "antes"),
    depois: extractChange(row.payload_json, "depois"),
    criado_em: dateTime(row.criado_em),
  }));

  return (
    <div className="space-y-5">
      <AdminMasterPageHeader title="Central de atividades" description="Linha do tempo paginada das ações administrativas, alterações de configuração e eventos auditáveis do Admin Master." eyebrow="Governança" />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMasterMetricCard label="Atividades" value={total} hint="Total com os filtros atuais" />
        <AdminMasterMetricCard label="Últimas 24h" value={last24hOnPage} hint="Na página exibida" tone={last24hOnPage ? "blue" : "default"} />
        <AdminMasterMetricCard label="Administradores" value={actorsOnPage} hint="Autores na página atual" tone="violet" />
        <AdminMasterMetricCard label="Ações sensíveis" value={sensitiveOnPage} hint="Na página atual" tone={sensitiveOnPage ? "amber" : "green"} />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <form method="get" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <select name="admin" defaultValue={params.admin || "todos"} className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700">
            <option value="todos">Todos administradores</option>
            {admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.nome || admin.email || "Admin Master"}</option>)}
          </select>
          <input name="acao" defaultValue={params.acao || ""} placeholder="Filtrar por ação" className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium outline-none focus:border-violet-300" />
          <input name="entidade" defaultValue={params.entidade || ""} placeholder="Filtrar por entidade" className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium outline-none focus:border-violet-300" />
          <select name="periodo" defaultValue={params.periodo || "7d"} className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700">
            <option value="24h">Últimas 24h</option><option value="7d">7 dias</option><option value="30d">30 dias</option><option value="90d">90 dias</option><option value="todos">Todo período</option>
          </select>
          <select name="sensivel" defaultValue={params.sensivel || "todos"} className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700">
            <option value="todos">Todas as ações</option><option value="sim">Somente sensíveis</option>
          </select>
          <div className="flex gap-2 sm:col-span-2 xl:col-span-5 xl:justify-end">
            <Link href="/admin-master/atividades" className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 px-4 text-sm font-bold text-zinc-600">Limpar</Link>
            <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-bold text-white"><Filter size={15} /> Aplicar filtros</button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div><div className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Timeline</div><h2 className="mt-1 text-lg font-black text-zinc-950">O que mudou nesta página</h2></div>
          <Activity size={20} className="text-zinc-400" />
        </div>
        <div className="mt-5 space-y-1">
          {rows.slice(0, 10).map((row, index) => {
            const actor = row.id_admin_usuario ? adminById.get(row.id_admin_usuario) || "Admin Master" : "Sistema";
            const before = extractChange(row.payload_json, "antes");
            const after = extractChange(row.payload_json, "depois");
            return (
              <div key={row.id} className="relative flex gap-3 pb-5 sm:gap-4">
                {index < Math.min(rows.length, 10) - 1 ? <span className="absolute left-[17px] top-9 h-[calc(100%-18px)] w-px bg-zinc-200" /> : null}
                <span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-violet-200 bg-violet-50 text-violet-700"><UserRound size={15} /></span>
                <div className="min-w-0 flex-1 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-3.5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0"><div className="break-words text-sm font-black text-zinc-900">{actor} · {actionLabel(row.acao)}</div><div className="mt-1 break-words text-sm leading-5 text-zinc-600">{row.descricao || `${row.entidade || "Entidade"} atualizada.`}</div></div>
                    <div className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-zinc-400"><Clock3 size={12} />{dateTime(row.criado_em)}</div>
                  </div>
                  {before !== "-" || after !== "-" ? <details className="mt-3 rounded-xl border border-zinc-200 bg-white"><summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-600">Ver antes e depois <ArrowRight size={13} /></summary><div className="grid gap-2 border-t border-zinc-100 p-3 sm:grid-cols-2"><div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Antes</div><div className="mt-1 break-words text-xs text-zinc-600">{before}</div></div><div><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Depois</div><div className="mt-1 break-words text-xs text-zinc-600">{after}</div></div></div></details> : null}
                </div>
              </div>
            );
          })}
          {!rows.length ? <div className="rounded-2xl bg-zinc-50 p-8 text-center text-sm text-zinc-500">Nenhuma atividade encontrada com os filtros atuais.</div> : null}
        </div>
      </section>

      <section className="space-y-3">
        <div className="px-1"><h2 className="text-base font-black text-zinc-950">Auditoria completa</h2><p className="mt-0.5 text-xs text-zinc-500">Tabela padronizada, exportação e cards mobile sobre a página filtrada.</p></div>
        <AdminMasterDataTableClient rows={tableRows} columns={["administrador", "acao", "entidade", "descricao", "antes", "depois", "criado_em"]} emptyTitle="Nenhuma atividade encontrada" emptyDescription="Não há registros com os filtros atuais." />
        <PaginationLinks currentPage={page} pageSize={PAGE_SIZE} totalItems={total} getHref={(nextPage) => buildHref(params, nextPage)} />
      </section>
    </div>
  );
}
