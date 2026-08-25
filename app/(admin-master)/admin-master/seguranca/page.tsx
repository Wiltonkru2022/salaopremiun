import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import AdminMasterDataTableClient from "@/components/admin-master/AdminMasterDataTableClient";
import AdminMasterPageHeader, { AdminMasterMetricCard } from "@/components/admin-master/AdminMasterPageHeader";
import AdminMasterSecurityActionButton from "@/components/admin-master/AdminMasterSecurityActionButton";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

export default async function AdminMasterSegurancaPage() {
  await requireAdminMasterUser("operacao_ver");
  const supabase = getSupabaseAdmin();
  const [eventsResult, usersResult, saloesResult] = await Promise.all([
    supabase.from("eventos_sistema").select("id, id_usuario, id_salao, tipo_evento, severidade, mensagem, detalhes_json, created_at").eq("modulo", "security").order("created_at", { ascending: false }).limit(80),
    supabase.from("user_security_status").select("user_id, tipo_usuario, status, motivo, risco_atual, bloqueado_ate, verificacao_necessaria, atualizado_em").neq("status", "ativo").order("atualizado_em", { ascending: false }).limit(60),
    supabase.from("saloes").select("id, nome, status_seguranca, motivo_seguranca, bloqueado_ate").neq("status_seguranca", "ativo").order("nome", { ascending: true }).limit(60),
  ]);

  const events = ((eventsResult.data || []) as SecurityEventRow[]).filter((row) => row.id);
  const users = ((usersResult.data || []) as UserSecurityRow[]).filter((row) => row.user_id);
  const saloes = ((saloesResult.data || []) as SalaoSecurityRow[]).filter((row) => row.id);
  const highRisk = events.filter((event) => ["critical", "error", "critico", "crítico"].includes(String(event.severidade || "").toLowerCase())).length;
  const loginFailures = events.filter((event) => String(event.tipo_evento || "").toLowerCase().includes("login_falhou")).length;

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
        description="Eventos, bloqueios e ações sensíveis com confirmação, motivo obrigatório, MFA AAL2 e trilha de auditoria antes/depois."
        eyebrow="Proteção do ecossistema"
        actions={<><Link href="/admin-master/atividades" className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 hover:border-violet-200 hover:text-violet-700">Ver auditoria</Link><AdminMasterSecurityActionButton type="retention" /></>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMasterMetricCard label="Eventos recentes" value={events.length} hint="Amostra atual" />
        <AdminMasterMetricCard label="Alto risco" value={highRisk} hint="Críticos ou erros" tone={highRisk ? "red" : "green"} />
        <AdminMasterMetricCard label="Falhas de login" value={loginFailures} hint="Na amostra atual" tone={loginFailures ? "amber" : "green"} />
        <AdminMasterMetricCard label="Bloqueios ativos" value={users.length + saloes.length} hint={`${users.length} usuário(s) · ${saloes.length} salão(ões)`} tone={users.length + saloes.length ? "amber" : "green"} />
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
        <div className="px-1"><h2 className="text-base font-black text-zinc-950">Telemetria de segurança</h2><p className="mt-0.5 text-xs text-zinc-500">A mesma tabela padronizada do Admin Master, com busca, filtros, período, exportação e cards no celular.</p></div>
        <AdminMasterDataTableClient rows={eventRows} columns={["evento", "gravidade", "mensagem", "detalhe", "usuario", "salao", "criado_em"]} emptyTitle="Nenhum evento de segurança" emptyDescription="Nenhum evento foi registrado com os filtros atuais." />
      </section>
    </div>
  );
}
