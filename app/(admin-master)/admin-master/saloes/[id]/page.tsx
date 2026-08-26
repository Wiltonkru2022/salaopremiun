import Link from "next/link";
import { ChevronRight } from "lucide-react";
import AdminMasterSalaoActions from "@/components/admin-master/AdminMasterSalaoActions";
import AdminMasterDataTableClient from "@/components/admin-master/AdminMasterDataTableClient";
import { AdminMasterMetricCard } from "@/components/admin-master/AdminMasterPageHeader";
import { getAdminMasterSalaoDetail } from "@/lib/admin-master/data";
import { getDatabaseAdmin } from "@/lib/db/admin";

export const dynamic = "force-dynamic";

const TABS = [
  ["resumo", "Resumo"],
  ["assinatura", "Assinatura e cobrança"],
  ["suporte", "Suporte"],
  ["atividade", "Atividade técnica"],
  ["notas", "Notas internas"],
] as const;

type TabKey = (typeof TABS)[number][0];

function statusClass(status: string) {
  const value = status.toLowerCase();
  if (["ativo", "ativa", "active", "pago", "paid"].includes(value)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["trial", "em_teste", "pendente", "processando"].includes(value)) return "border-amber-200 bg-amber-50 text-amber-700";
  if (["inadimplente", "bloqueado", "cancelado", "vencido", "falhou"].includes(value)) return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

export default async function AdminMasterSalaoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const requestedTab = String(query.tab || "resumo") as TabKey;
  const activeTab: TabKey = TABS.some(([key]) => key === requestedTab) ? requestedTab : "resumo";
  const data = await getAdminMasterSalaoDetail(id);
  const salao = data.salao || {};
  const assinatura = data.assinatura || {};
  const database = getDatabaseAdmin();

  const { data: planos } = await database
    .from("planos_saas")
    .select("codigo, nome")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  const { data: trialControle } = await database
    .from("assinaturas")
    .select("trial_fim_em, email_trial_3d_sent_at, email_trial_1d_sent_at, email_trial_today_sent_at, email_trial_expired_sent_at")
    .eq("id_salao", id)
    .maybeSingle();

  const planosOptions = ((planos || []) as { codigo?: string | null; nome?: string | null }[])
    .filter((plano) => plano.codigo && plano.nome)
    .map((plano) => ({ codigo: String(plano.codigo), nome: String(plano.nome) }));

  const statusSalao = String(salao.status || data.access.salaoStatus || "-");
  const planoAtual = String(assinatura.plano || data.access.planoCodigo || "basico");
  const vencimentoAtual = String(assinatura.vencimento_em || "");
  const cartaoRecorrente = assinatura.asaas_credit_card_last4
    ? `${String(assinatura.asaas_credit_card_brand || "CARTAO")} **** ${String(assinatura.asaas_credit_card_last4 || "")}`
    : "-";
  const scoreSaude = data.scoreSaude;
  const scoreValue = typeof scoreSaude.score_total === "number" ? String(scoreSaude.score_total) : "Sem score";
  const eventosFalhos = data.eventos24h.filter((evento) => String(evento.resultado).toLowerCase() === "falhou").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-zinc-400">
        <Link href="/admin-master" className="hover:text-violet-700">Admin Master</Link>
        <ChevronRight size={13} />
        <Link href="/admin-master/saloes" className="hover:text-violet-700">Salões</Link>
        <ChevronRight size={13} />
        <span className="text-zinc-700">{String(salao.nome || "Salão")}</span>
      </div>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Raio-X do salão</div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">{String(salao.nome || "Salão")}</h1>
            <p className="mt-2 text-sm text-zinc-500">{String(salao.responsavel || "-")} · {String(salao.email || "-")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1.5 text-xs font-bold ${statusClass(statusSalao)}`}>{statusSalao}</span>
              <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">Plano {planoAtual}</span>
            </div>
          </div>
          <Link href="/admin-master/saloes" className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50">Voltar para salões</Link>
        </div>
      </section>

      <nav className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-sm" aria-label="Seções do salão">
        <div className="flex min-w-max gap-1">
          {TABS.map(([key, label]) => (
            <Link
              key={key}
              href={`/admin-master/saloes/${id}?tab=${key}`}
              className={`rounded-xl px-3.5 py-2 text-sm font-bold transition ${activeTab === key ? "bg-violet-100 text-violet-800" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {activeTab === "resumo" ? (
        <div className="space-y-5">
          <AdminMasterSalaoActions
            idSalao={id}
            statusSalao={statusSalao}
            planoAtual={planoAtual}
            vencimentoAtual={vencimentoAtual}
            planos={planosOptions}
            trialInfo={{
              status: String(assinatura.status || data.access.assinaturaStatus || "-"),
              plano: planoAtual,
              trialFimEm: String((trialControle as { trial_fim_em?: string | null } | null)?.trial_fim_em || assinatura.trial_fim_em || salao.trial_fim_em || ""),
              emailTrial3dSentAt: (trialControle as { email_trial_3d_sent_at?: string | null } | null)?.email_trial_3d_sent_at || null,
              emailTrial1dSentAt: (trialControle as { email_trial_1d_sent_at?: string | null } | null)?.email_trial_1d_sent_at || null,
              emailTrialTodaySentAt: (trialControle as { email_trial_today_sent_at?: string | null } | null)?.email_trial_today_sent_at || null,
              emailTrialExpiredSentAt: (trialControle as { email_trial_expired_sent_at?: string | null } | null)?.email_trial_expired_sent_at || null,
              email: String(salao.email || ""),
              whatsapp: String(salao.whatsapp || salao.telefone || ""),
              responsavel: String(salao.responsavel || ""),
              nomeSalao: String(salao.nome_fantasia || salao.nome || "Salão"),
            }}
          />

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <AdminMasterMetricCard label="Plano" value={data.access.planoNome} hint={data.access.planoCodigo} tone="blue" />
            <AdminMasterMetricCard label="Assinatura" value={data.access.assinaturaStatus || "-"} hint={data.access.bloqueioTotal ? "Bloqueio total" : "Operação liberada"} tone={data.access.bloqueioTotal ? "red" : "green"} />
            <AdminMasterMetricCard label="Profissionais" value={`${data.access.uso.profissionais}/${data.access.limites.profissionais ?? "Ilimitado"}`} hint="Uso do limite do plano" />
            <AdminMasterMetricCard label="Usuários" value={`${data.access.uso.usuarios}/${data.access.limites.usuarios ?? "Ilimitado"}`} hint="Uso do limite do plano" />
            <AdminMasterMetricCard label="Score saúde" value={scoreValue} hint={`Atualizado em ${scoreSaude.atualizado_em || "-"}`} tone={typeof scoreSaude.score_total === "number" && scoreSaude.score_total < 70 ? "red" : "green"} />
            <AdminMasterMetricCard label="Falhas 24h" value={String(eventosFalhos)} hint={`${data.eventos24h.length} evento(s) monitorado(s)`} tone={eventosFalhos ? "red" : "green"} />
          </section>

          <section className="grid gap-4 lg:grid-cols-4">
            {[
              ["Uso recente", scoreSaude.uso_recente ?? "-", "Quanto o salão está usando o sistema."],
              ["Risco de inadimplência", scoreSaude.inadimplencia_risco ?? "-", "Sinal financeiro que pode virar bloqueio."],
              ["Tickets abertos", scoreSaude.tickets_abertos ?? data.tickets.length, "Suporte pendente para este salão."],
              ["Risco de cancelamento", scoreSaude.risco_cancelamento ?? "-", "Probabilidade operacional de churn."],
            ].map(([label, value, hint]) => (
              <div key={String(label)} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">{String(label)}</div>
                <div className="mt-2 text-2xl font-black text-zinc-950">{String(value)}</div>
                <div className="mt-1 text-sm leading-5 text-zinc-500">{String(hint)}</div>
              </div>
            ))}
          </section>
        </div>
      ) : null}

      {activeTab === "assinatura" ? (
        <div className="space-y-5">
          <section className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-zinc-950">Assinatura</h2>
              <div className="mt-4 grid gap-3 text-sm">
                {[
                  ["Plano", assinatura.plano],
                  ["Status", assinatura.status],
                  ["Valor", assinatura.valor],
                  ["Vencimento", assinatura.vencimento_em],
                  ["Renovação automática", assinatura.renovacao_automatica],
                  ["Assinatura Asaas", assinatura.asaas_subscription_id],
                  ["Cartão recorrente", cartaoRecorrente],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex flex-col gap-1 border-b border-zinc-100 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <span className="font-semibold text-zinc-500">{String(label)}</span>
                    <span className="font-bold text-zinc-900">{String(value ?? "-")}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-zinc-950">Recursos bloqueados</h2>
              <p className="mt-1 text-sm text-zinc-500">O que o plano ou o status atual está restringindo.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.access.recursosBloqueados.length ? data.access.recursosBloqueados.map((recurso) => (
                  <span key={recurso} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{recurso}</span>
                )) : <span className="text-sm text-zinc-500">Tudo liberado.</span>}
              </div>
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-black text-zinc-950">Cobranças</h2>
            <AdminMasterDataTableClient rows={data.cobrancas} columns={["referencia", "valor", "status", "data_expiracao", "pago_em"]} emptyTitle="Nenhuma cobrança" emptyDescription="Não há cobranças registradas para este salão." />
          </section>
        </div>
      ) : null}

      {activeTab === "suporte" ? (
        <div className="space-y-5">
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-zinc-950">Alertas ativos</h2>
                <p className="mt-1 text-sm text-zinc-500">Somente problemas que ainda exigem acompanhamento.</p>
              </div>
              <Link href="/admin-master/alertas" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50">Ver todos os alertas</Link>
            </div>
            <AdminMasterDataTableClient rows={data.alertasAtivos} columns={["criado", "gravidade", "origem", "titulo", "detalhe", "acao"]} emptyTitle="Nenhum alerta ativo" emptyDescription="Este salão não possui alertas pendentes." />
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-black text-zinc-950">Tickets</h2>
            <AdminMasterDataTableClient rows={data.tickets} columns={["numero", "assunto", "status", "prioridade", "criado_em"]} emptyTitle="Nenhum ticket" emptyDescription="Este salão não possui tickets no histórico atual." />
          </section>
        </div>
      ) : null}

      {activeTab === "atividade" ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-zinc-950">Atividade técnica das últimas 24h</h2>
              <p className="mt-1 text-sm text-zinc-500">Módulo, rota, ação, tempo de resposta e resultado deste salão.</p>
            </div>
            <Link href="/admin-master/logs" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50">Abrir diagnóstico técnico</Link>
          </div>
          <AdminMasterDataTableClient rows={data.eventos24h} columns={["horario", "modulo", "tipo", "severidade", "rota", "acao", "tempo", "resultado", "detalhe"]} emptyTitle="Sem eventos nas últimas 24h" emptyDescription="Nenhum evento técnico foi registrado para este salão no período." />
        </section>
      ) : null}

      {activeTab === "notas" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-black text-zinc-950">Notas internas</h2>
          <p className="text-sm text-zinc-500">Histórico administrativo separado dos dados operacionais.</p>
          <AdminMasterDataTableClient rows={data.anotacoes} columns={["titulo", "nota", "criada_em"]} emptyTitle="Nenhuma nota interna" emptyDescription="As anotações administrativas deste salão aparecerão aqui." />
        </section>
      ) : null}
    </div>
  );
}
