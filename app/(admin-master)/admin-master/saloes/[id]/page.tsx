import Link from "next/link";
import AdminMasterSalaoActions from "@/components/admin-master/AdminMasterSalaoActions";
import { AdminDataTable, AdminKpiGrid } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterSalaoDetail } from "@/lib/admin-master/data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminMasterSalaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAdminMasterSalaoDetail(id);
  const salao = data.salao || {};
  const assinatura = data.assinatura || {};
  const supabase = getSupabaseAdmin();

  const { data: planos } = await supabase
    .from("planos_saas")
    .select("codigo, nome")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  const { data: trialControle } = await supabase
    .from("assinaturas")
    .select(
      "trial_fim_em, email_trial_3d_sent_at, email_trial_1d_sent_at, email_trial_today_sent_at, email_trial_expired_sent_at"
    )
    .eq("id_salao", id)
    .maybeSingle();

  const planosOptions = ((planos || []) as { codigo?: string | null; nome?: string | null }[])
    .filter((plano) => plano.codigo && plano.nome)
    .map((plano) => ({
      codigo: String(plano.codigo),
      nome: String(plano.nome),
    }));

  const statusSalao = String(salao.status || data.access.salaoStatus || "-");
  const planoAtual = String(assinatura.plano || data.access.planoCodigo || "basico");
  const vencimentoAtual = String(assinatura.vencimento_em || "");
  const cartaoRecorrente = assinatura.asaas_credit_card_last4
    ? `${String(assinatura.asaas_credit_card_brand || "CARTAO")} **** ${String(
        assinatura.asaas_credit_card_last4 || ""
      )}`
    : "-";
  const scoreSaude = data.scoreSaude;
  const scoreValue =
    typeof scoreSaude.score_total === "number" ? String(scoreSaude.score_total) : "Sem score";
  const eventosFalhos = data.eventos24h.filter(
    (evento) => String(evento.resultado).toLowerCase() === "falhou"
  ).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[34px] bg-zinc-950 p-7 text-white shadow-sm">
        <Link href="/admin-master/saloes" className="text-sm font-bold text-amber-200">
          Voltar para saloes
        </Link>
        <h2 className="mt-4 font-display text-4xl font-black">
          {String(salao.nome || "Salão")}
        </h2>
        <p className="mt-2 text-sm text-zinc-300">
          {String(salao.responsavel || "-")} | {String(salao.email || "-")}
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">
            Status {statusSalao}
          </span>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">
            Plano {planoAtual}
          </span>
        </div>
      </section>

      <AdminMasterSalaoActions
        idSalao={id}
        statusSalao={statusSalao}
        planoAtual={planoAtual}
        vencimentoAtual={vencimentoAtual}
        planos={planosOptions}
        trialInfo={{
          status: String(assinatura.status || data.access.assinaturaStatus || "-"),
          plano: planoAtual,
          trialFimEm: String(
            (trialControle as { trial_fim_em?: string | null } | null)?.trial_fim_em ||
              assinatura.trial_fim_em ||
              salao.trial_fim_em ||
              ""
          ),
          emailTrial3dSentAt:
            (trialControle as { email_trial_3d_sent_at?: string | null } | null)
              ?.email_trial_3d_sent_at || null,
          emailTrial1dSentAt:
            (trialControle as { email_trial_1d_sent_at?: string | null } | null)
              ?.email_trial_1d_sent_at || null,
          emailTrialTodaySentAt:
            (trialControle as { email_trial_today_sent_at?: string | null } | null)
              ?.email_trial_today_sent_at || null,
          emailTrialExpiredSentAt:
            (trialControle as { email_trial_expired_sent_at?: string | null } | null)
              ?.email_trial_expired_sent_at || null,
          email: String(salao.email || ""),
          whatsapp: String(salao.whatsapp || salao.telefone || ""),
          responsavel: String(salao.responsavel || ""),
          nomeSalao: String(salao.nome_fantasia || salao.nome || "Salão"),
        }}
      />

      <AdminKpiGrid
        kpis={[
          {
            label: "Plano",
            value: data.access.planoNome,
            hint: data.access.planoCodigo,
            tone: "blue",
          },
          {
            label: "Assinatura",
            value: data.access.assinaturaStatus || "-",
            hint: data.access.bloqueioTotal ? "Bloqueio total" : "Operacao liberada",
            tone: data.access.bloqueioTotal ? "red" : "green",
          },
          {
            label: "Profissionais",
            value: `${data.access.uso.profissionais}/${data.access.limites.profissionais ?? "Ilimitado"}`,
            hint: "Uso do limite do plano",
            tone: "dark",
          },
          {
            label: "Usuarios",
            value: `${data.access.uso.usuarios}/${data.access.limites.usuarios ?? "Ilimitado"}`,
            hint: "Uso do limite do plano",
            tone: "dark",
          },
          {
            label: "Score saude",
            value: scoreValue,
            hint: `Atualizado em ${scoreSaude.atualizado_em || "-"}`,
            tone:
              typeof scoreSaude.score_total === "number" && scoreSaude.score_total < 70
                ? "red"
                : "green",
          },
          {
            label: "Falhas 24h",
            value: String(eventosFalhos),
            hint: `${data.eventos24h.length} evento(s) monitorado(s)`,
            tone: eventosFalhos ? "red" : "green",
          },
        ]}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
            Raio-x do salão
          </div>
          <h3 className="mt-2 font-display text-2xl font-black">
            Diagnostico operacional
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Esta area mostra se o problema vem de assinatura, acesso, falha de pagina,
            lentidao, ticket ou alerta aberto.
          </p>

          <div className="mt-5 grid gap-3">
            {[
              ["Uso recente", scoreSaude.uso_recente ?? "-", "Quanto o salão está usando o sistema."],
              ["Risco inadimplencia", scoreSaude.inadimplencia_risco ?? "-", "Sinal financeiro que pode virar bloqueio."],
              ["Tickets abertos", scoreSaude.tickets_abertos ?? data.tickets.length, "Suporte pendente para este salão."],
              ["Risco cancelamento", scoreSaude.risco_cancelamento ?? "-", "Probabilidade operacional de churn."],
            ].map(([label, value, hint]) => (
              <div
                key={String(label)}
                className="rounded-[20px] border border-zinc-200 bg-zinc-50 px-4 py-3"
              >
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400">
                  {String(label)}
                </div>
                <div className="mt-1.5 text-2xl font-black text-zinc-950">
                  {String(value)}
                </div>
                <div className="mt-1 text-sm text-zinc-500">{String(hint)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
                Alertas ativos
              </div>
              <h3 className="mt-2 font-display text-2xl font-black">
                O que precisa de acao agora
              </h3>
            </div>
            <Link
              href="/admin-master/alertas"
              className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-black text-white transition hover:bg-zinc-800"
            >
              Ver todos
            </Link>
          </div>
          <div className="mt-4">
            <AdminDataTable
              rows={data.alertasAtivos}
              columns={["criado", "gravidade", "origem", "titulo", "detalhe", "acao"]}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-2xl font-black">Assinatura</h3>
          <div className="mt-4 grid gap-3 text-sm">
            {[
              ["plano", assinatura.plano],
              ["status", assinatura.status],
              ["valor", assinatura.valor],
              ["vencimento_em", assinatura.vencimento_em],
              ["renovacao_automatica", assinatura.renovacao_automatica],
              ["asaas_subscription_id", assinatura.asaas_subscription_id],
              ["cartao_recorrente", cartaoRecorrente],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="flex justify-between gap-4 border-b border-zinc-100 pb-2"
              >
                <span className="font-semibold text-zinc-500">{String(label)}</span>
                <span className="text-right font-bold">{String(value ?? "-")}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-2xl font-black">Recursos bloqueados</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.access.recursosBloqueados.length ? (
              data.access.recursosBloqueados.map((recurso) => (
                <span
                  key={recurso}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800"
                >
                  {recurso}
                </span>
              ))
            ) : (
              <span className="text-sm text-zinc-500">Tudo liberado.</span>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
              Eventos das ultimas 24h
            </div>
            <h3 className="mt-2 font-display text-2xl font-black">
              Logs filtrados deste salão
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Aqui o Admin Master mostra onde o erro nasceu: modulo, rota, acao,
              tempo de resposta e mensagem.
            </p>
          </div>
          <Link
            href="/admin-master/logs"
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-black text-zinc-800 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
          >
            Abrir logs
          </Link>
        </div>
        <div className="mt-4">
          <AdminDataTable
            rows={data.eventos24h}
            columns={[
              "horario",
              "modulo",
              "tipo",
              "severidade",
              "rota",
              "acao",
              "tempo",
              "resultado",
              "detalhe",
            ]}
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-3">
          <h3 className="font-display text-xl font-black">Cobrancas</h3>
          <AdminDataTable
            rows={data.cobrancas}
            columns={["referencia", "valor", "status", "data_expiracao", "pago_em"]}
          />
        </div>
        <div className="space-y-3">
          <h3 className="font-display text-xl font-black">Tickets</h3>
          <AdminDataTable
            rows={data.tickets}
            columns={["numero", "assunto", "status", "prioridade", "criado_em"]}
          />
        </div>
        <div className="space-y-3">
          <h3 className="font-display text-xl font-black">Notas internas</h3>
          <AdminDataTable
            rows={data.anotacoes}
            columns={["titulo", "nota", "criada_em"]}
          />
        </div>
      </section>
    </div>
  );
}
