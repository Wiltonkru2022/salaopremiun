import type { ReactNode } from "react";
import Link from "next/link";
import AdminMasterModuleActionButton from "@/components/admin-master/AdminMasterModuleActionButton";
import AdminMasterRowActionButton from "@/components/admin-master/AdminMasterRowActionButton";
import type {
  AdminKpi,
  AdminSectionData,
  AdminSectionDiagnostic,
  AdminTableRow,
} from "@/lib/admin-master/data";
import type { AdminMasterOperationalSnapshot } from "@/lib/admin-master/operability";

function toneClass(tone?: AdminKpi["tone"]) {
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-900";
  if (tone === "red") return "border-red-200 bg-red-50 text-red-900";
  if (tone === "blue") return "border-blue-200 bg-blue-50 text-blue-900";
  return "border-zinc-200 bg-white text-zinc-950";
}

function diagnosticToneClass(tone?: AdminKpi["tone"]) {
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-950";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-950";
  if (tone === "red") return "border-red-200 bg-red-50 text-red-950";
  if (tone === "blue") return "border-blue-200 bg-blue-50 text-blue-950";
  return "border-zinc-200 bg-zinc-50 text-zinc-950";
}

function healthToneClass(status: AdminMasterOperationalSnapshot["health"]["status"]) {
  if (status === "green") return "from-emerald-500 to-emerald-300 text-emerald-950";
  if (status === "yellow") return "from-amber-500 to-yellow-200 text-amber-950";
  if (status === "orange") return "from-orange-500 to-amber-200 text-orange-950";
  return "from-rose-600 to-red-300 text-red-950";
}

function formatSuggestionKind(
  kind: AdminMasterOperationalSnapshot["suggestions"][number]["kind"]
) {
  if (kind === "automatico") return "Correcao automatica";
  if (kind === "sugerido") return "Sugestao operacional";
  return "Acao manual";
}

function isActionColumn(column: string) {
  return column === "acao" || column.endsWith("_acao");
}

function getActionField(column: string, suffix: "tipo" | "id") {
  return column === "acao" ? `acao_${suffix}` : `${column}_${suffix}`;
}

export function AdminKpiGrid({ kpis }: { kpis: AdminKpi[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={`rounded-[24px] border p-4 shadow-sm ${toneClass(kpi.tone)}`}
        >
          <div className="text-xs font-bold uppercase tracking-[0.28em] opacity-60">
            {kpi.label}
          </div>
          <div className="mt-2.5 font-display text-[1.8rem] font-black">{kpi.value}</div>
          <div className="mt-1.5 text-sm opacity-70">{kpi.hint}</div>
        </div>
      ))}
    </div>
  );
}

export function AdminDataTable({
  rows,
  columns,
}: {
  rows: AdminTableRow[];
  columns: string[];
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-sm">
      <div className="scroll-premium overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-100 text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.2em] text-zinc-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3.5 font-bold">
                  {column.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={index} className="hover:bg-zinc-50/80">
                  {columns.map((column) => (
                    <td key={column} className="max-w-[260px] truncate px-4 py-3.5">
                      {isActionColumn(column) ? (
                        <AdminMasterRowActionButton
                          actionType={String(row[getActionField(column, "tipo")] || "")}
                          actionId={String(row[getActionField(column, "id")] || "")}
                          label={String(row[column] || "-")}
                        />
                      ) : (
                        String(row[column] ?? "-")
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-500">
                  Nenhum registro encontrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminSectionDiagnostics({
  diagnostics,
}: {
  diagnostics: AdminSectionDiagnostic[];
}) {
  if (!diagnostics.length) return null;

  return (
    <section className="grid gap-3 lg:grid-cols-3">
      {diagnostics.map((item) => {
        const content = (
          <>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] opacity-60">
              {item.label}
            </div>
            <div className="mt-3 font-display text-2xl font-black">
              {item.value}
            </div>
            <p className="mt-2 text-sm leading-6 opacity-75">{item.detail}</p>
          </>
        );
        const className = `rounded-[22px] border p-4 shadow-sm ${diagnosticToneClass(item.tone)}`;

        if (item.href) {
          return (
            <Link
              key={`${item.label}-${item.value}`}
              href={item.href}
              className={`${className} transition hover:-translate-y-0.5 hover:shadow-md`}
            >
              {content}
            </Link>
          );
        }

        return (
          <div key={`${item.label}-${item.value}`} className={className}>
            {content}
          </div>
        );
      })}
    </section>
  );
}

function DashboardPanel(props: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
            {props.title}
          </div>
          {props.description ? (
            <p className="mt-1.5 text-sm leading-6 text-zinc-500">{props.description}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3.5">{props.children}</div>
    </section>
  );
}

function HealthRing({
  health,
}: {
  health: AdminMasterOperationalSnapshot["health"];
}) {
  const ringClass = healthToneClass(health.status);
  const stroke = Math.max(8, Math.min(100, health.score));

  return (
    <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)] lg:items-center">
      <div className="flex items-center justify-center">
        <div
          className={`relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br ${ringClass}`}
        >
          <div className="absolute inset-4 rounded-full border border-white/30 bg-white/65 backdrop-blur-sm" />
          <div
            className="absolute inset-3 rounded-full"
            style={{
              background: `conic-gradient(currentColor ${stroke}%, rgba(255,255,255,0.18) ${stroke}% 100%)`,
              WebkitMask:
                "radial-gradient(circle at center, transparent 58%, black 59%)",
              mask: "radial-gradient(circle at center, transparent 58%, black 59%)",
            }}
          />
          <div className="relative text-center">
            <div className="text-xs font-black uppercase tracking-[0.28em] opacity-70">
              Saude
            </div>
            <div className="mt-2 font-display text-4xl font-black">{health.score}</div>
            <div className="mt-2 text-sm font-bold uppercase tracking-[0.18em]">
              {health.label}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 p-3.5">
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">
            Diagnostico
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-700">{health.summary}</p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {[
            ["Erro 24h", `${health.errorRate24h.toFixed(1)}%`],
            ["Incidentes", String(health.openIncidents)],
            ["Saloes afetados", String(health.impactedSalons)],
            ["Rotas lentas", String(health.slowRoutes)],
            ["Acoes criticas", String(health.failingCriticalActions)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[18px] border border-zinc-200 bg-white px-3.5 py-2.5"
            >
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                {label}
              </div>
              <div className="mt-1.5 text-lg font-black text-zinc-900">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BulletList({
  items,
}: {
  items: Array<{
    title: string;
    meta: string;
    body: string;
    accent?: "red" | "amber" | "emerald" | "blue";
  }>;
}) {
  const accentMap = {
    red: "border-red-200 bg-red-50/70",
    amber: "border-amber-200 bg-amber-50/70",
    emerald: "border-emerald-200 bg-emerald-50/70",
    blue: "border-blue-200 bg-blue-50/70",
  } as const;

  return (
    <div className="space-y-2.5">
      {items.length ? (
        items.map((item, index) => (
          <div
            key={`${item.title}-${index}`}
            className={`rounded-[18px] border p-3.5 ${
              accentMap[item.accent || "blue"]
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-black text-zinc-900">{item.title}</div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                {item.meta}
              </div>
            </div>
            <div className="mt-1.5 text-sm leading-6 text-zinc-700">{item.body}</div>
          </div>
        ))
      ) : (
        <div className="rounded-[18px] border border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
          Nada para mostrar ainda.
        </div>
      )}
    </div>
  );
}

function findKpi(kpis: AdminKpi[], label: string) {
  return kpis.find((kpi) => kpi.label.toLowerCase() === label.toLowerCase());
}

function ExecutiveMetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: AdminKpi["tone"];
}) {
  return (
    <div className={`rounded-[22px] border p-4 ${toneClass(tone)}`}>
      <div className="text-[11px] font-black uppercase tracking-[0.24em] opacity-60">
        {label}
      </div>
      <div className="mt-2.5 font-display text-[1.8rem] font-black">{value}</div>
      <div className="mt-1.5 text-sm leading-5 opacity-75">{hint}</div>
    </div>
  );
}

function ExecutiveLinkCard({
  href,
  title,
  body,
  tone = "dark",
}: {
  href: string;
  title: string;
  body: string;
  tone?: "dark" | "light" | "amber";
}) {
  const classes =
    tone === "dark"
      ? "border-zinc-800 bg-zinc-950 text-white"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-zinc-200 bg-white text-zinc-950";

  return (
    <Link
      href={href}
      className={`group rounded-[22px] border p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${classes}`}
    >
      <div className="text-xs font-black uppercase tracking-[0.24em] opacity-60">
        {title}
      </div>
      <div className="mt-2.5 text-sm leading-6 opacity-80">{body}</div>
      <div className="mt-3 text-sm font-black uppercase tracking-[0.18em] opacity-80 transition group-hover:opacity-100">
        Abrir agora
      </div>
    </Link>
  );
}

function PrioritySignal({
  label,
  value,
  description,
  href,
}: {
  label: string;
  value: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[20px] border border-white/10 bg-white/8 p-3.5 transition hover:bg-white/12"
    >
      <div className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-100/70">
        {label}
      </div>
      <div className="mt-1.5 font-display text-[1.8rem] font-black text-white">
        {value}
      </div>
      <div className="mt-1.5 text-sm leading-5 text-zinc-300">{description}</div>
    </Link>
  );
}

export function AdminSectionView({ data }: { data: AdminSectionData }) {
  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-zinc-950 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.35em] text-amber-200">
              AdminMaster
            </div>
            <h2 className="mt-2.5 font-display text-[2rem] font-black">{data.title}</h2>
            <p className="mt-2.5 max-w-3xl text-sm leading-6 text-zinc-300">
              {data.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {data.actions.slice(0, 3).map((action) => (
              <AdminMasterModuleActionButton
                key={action}
                action={action}
                variant="pill"
              />
            ))}
          </div>
        </div>
      </section>

      <AdminKpiGrid kpis={data.kpis} />
      <AdminSectionDiagnostics diagnostics={data.diagnostics || []} />

      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <AdminDataTable rows={data.rows} columns={data.columns} />

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
              Acoes do modulo
            </div>
            <div className="mt-3 space-y-2">
              {data.actions.map((action) => (
                <AdminMasterModuleActionButton
                  key={action}
                  action={action}
                  variant="list"
                />
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-amber-950">
            <div className="text-sm font-black">Regra de seguranca</div>
            <p className="mt-2 text-sm leading-6">
              Toda acao critica do AdminMaster deve passar pelo servidor,
              validar permissao interna e registrar auditoria.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

export function AdminDashboardView({
  kpis,
  recentes,
  planos,
  operational,
}: {
  kpis: AdminKpi[];
  recentes: AdminTableRow[];
  planos: AdminTableRow[];
  operational: AdminMasterOperationalSnapshot;
}) {
  const incidentsRows: AdminTableRow[] = operational.incidents.map((item) => ({
    incidente: item.title,
    modulo: item.module,
    gravidade: item.severity,
    ocorrencias: item.occurrences,
    saloes: item.impactedSalons,
    ultima: item.lastOccurrence,
    acao: item.recommendedAction,
    automacao: item.automation,
  }));

  const telemetryRows: AdminTableRow[] = operational.moduleTelemetry.map((item) => ({
    modulo: item.module,
    sucesso: item.successRate,
    falha: item.failureRate,
    tempo: item.avgResponseMs,
    ultima_falha: item.lastFailure,
    erro_comum: item.topError,
    tendencia: item.trend,
  }));

  const riskRows: AdminTableRow[] = operational.salonsAtRisk.map((item) => ({
    salao: item.salao,
    plano: item.plano,
    status: item.status,
    score: item.score,
    detalhe: item.detail,
    sinal: item.signal,
  }));

  const engagementRows: AdminTableRow[] = operational.engagedSalons.map((item) => ({
    salao: item.salao,
    plano: item.plano,
    status: item.status,
    score: item.score,
    detalhe: item.detail,
    sinal: item.signal,
  }));

  const healthCheckRows: AdminTableRow[] = operational.healthChecks.map((item) => ({
    nome: item.name,
    status: item.status,
    score: item.score,
    atualizado: item.updatedAt,
  }));
  const totalSaloesKpi = findKpi(kpis, "Total de saloes");
  const trialsKpi = findKpi(kpis, "Trials ativos");
  const mrrKpi = findKpi(kpis, "MRR atual");
  const receitaMesKpi = findKpi(kpis, "Receita do mes");
  const checkoutsKpi = findKpi(kpis, "Checkouts assinatura");
  const ticketsKpi = findKpi(kpis, "Tickets abertos");
  const alertasKpi = findKpi(kpis, "Alertas criticos");
  const primarySuggestion = operational.suggestions[0];
  const primaryIncident = operational.incidents[0];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[30px] bg-[#16110b] p-5 text-white shadow-sm sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_400px] xl:items-stretch">
          <div>
            <div className="inline-flex rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.28em] text-amber-100">
              Sala de decisao
            </div>
            <h2 className="mt-4 max-w-4xl font-display text-[2.3rem] font-black leading-[1.02] sm:text-[3.7rem]">
              Comando comercial e operacional do SalaoPremium.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-300 sm:text-[15px]">
              A primeira dobra agora mostra o que precisa de decisao hoje:
              receita, trials, cobrancas, suporte e estabilidade da plataforma.
            </p>

            <div className="mt-5 grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
              <PrioritySignal
                label="Saude"
                value={String(operational.health.score)}
                description={operational.health.label}
                href="/admin-master/operacao"
              />
              <PrioritySignal
                label="MRR"
                value={mrrKpi?.value || "-"}
                description={mrrKpi?.hint || "Receita recorrente atual"}
                href="/admin-master/assinaturas"
              />
              <PrioritySignal
                label="Receita mes"
                value={receitaMesKpi?.value || "-"}
                description={receitaMesKpi?.hint || "Cobrancas do mes"}
                href="/admin-master/assinaturas/cobrancas"
              />
              <PrioritySignal
                label="Alertas"
                value={alertasKpi?.value || "0"}
                description={alertasKpi?.hint || "Operacao e webhooks"}
                href="/admin-master/alertas"
              />
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.28em] text-amber-100">
                Proxima melhor acao
              </div>
              <h3 className="mt-3 font-display text-[2rem] font-black">
                {primarySuggestion?.title ||
                  primaryIncident?.recommendedAction ||
                  "Monitorar operacao do dia"}
              </h3>
              <p className="mt-2.5 text-sm leading-6 text-zinc-300">
                {primarySuggestion?.detail ||
                  primaryIncident?.title ||
                  "Sem incidente critico no snapshot atual. Mantenha a rotina de cobrancas, tickets e alertas em dia."}
              </p>
            </div>

            <div className="mt-5 grid gap-2">
              {[
                ["Cobrancas e inadimplencia", "/admin-master/assinaturas/cobrancas"],
                ["Tickets urgentes", "/admin-master/tickets"],
                ["Alertas operacionais", "/admin-master/alertas"],
                ["Logs e webhooks", "/admin-master/logs"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-zinc-950 transition hover:bg-amber-100"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <ExecutiveLinkCard
          href="/admin-master/assinaturas/cobrancas"
          title="Travas de receita"
          body={`${checkoutsKpi?.value || "0"} checkouts em processamento. ${checkoutsKpi?.hint || "Acompanhe falhas antes do cliente desistir."}`}
          tone="amber"
        />
        <ExecutiveLinkCard
          href="/admin-master/tickets"
          title="Suporte que segura churn"
          body={`${ticketsKpi?.value || "0"} tickets abertos. Priorize contas pagantes, trial quente e saloes com risco operacional.`}
          tone="light"
        />
        <ExecutiveLinkCard
          href="/admin-master/saloes"
          title="Base e conversao"
          body={`${totalSaloesKpi?.value || "0"} saloes no sistema. ${trialsKpi?.value || "0"} trials ativos para converter em assinatura.`}
          tone="dark"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <DashboardPanel
          title="Saude Do Sistema"
          description="Score operacional em tempo real calculado por incidentes, taxa de erro, lentidao e impacto em saloes."
        >
          <HealthRing health={operational.health} />
        </DashboardPanel>

        <DashboardPanel
          title="Resumo Executivo"
          description="Numeros que orientam a reuniao diaria do SaaS."
        >
          <div className="grid gap-3">
            {[mrrKpi, receitaMesKpi, trialsKpi, ticketsKpi, alertasKpi]
              .filter(Boolean)
              .map((kpi) => (
                <ExecutiveMetricCard
                  key={kpi!.label}
                  label={kpi!.label}
                  value={kpi!.value}
                  hint={kpi!.hint}
                  tone={kpi!.tone}
                />
              ))}
          </div>
        </DashboardPanel>
      </section>

      <AdminKpiGrid kpis={kpis} />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardPanel
          title="Centro De Incidentes"
          description="Onde a operacao esta quebrando agora e qual a resposta recomendada."
        >
          <AdminDataTable
            rows={incidentsRows}
            columns={[
              "incidente",
              "modulo",
              "gravidade",
              "ocorrencias",
              "saloes",
              "ultima",
              "automacao",
            ]}
          />
        </DashboardPanel>

        <DashboardPanel
          title="Automacoes E Acoes"
          description="Beneficios, correcao segura e proximo passo recomendado."
        >
          <BulletList
            items={operational.suggestions.map((item) => ({
              title: item.title,
              meta: `${item.target} • ${item.kind}`,
              body: `${item.detail} ${formatSuggestionKind(item.kind)} pronta para acompanhamento.`,
              accent:
                item.kind === "automatico"
                  ? "emerald"
                  : item.kind === "sugerido"
                    ? "amber"
                    : "blue",
            }))}
          />
        </DashboardPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardPanel
          title="Telemetria Por Modulo"
          description="Percentual de sucesso, falha, tempo medio, ultima falha e tendencia."
        >
          <AdminDataTable
            rows={telemetryRows}
            columns={[
              "modulo",
              "sucesso",
              "falha",
              "tempo",
              "ultima_falha",
              "tendencia",
            ]}
          />
        </DashboardPanel>

        <DashboardPanel
          title="Health Checks"
          description="Sinais operacionais mantidos pelo proprio sistema."
        >
          <AdminDataTable
            rows={healthCheckRows}
            columns={["nome", "status", "score", "atualizado"]}
          />
        </DashboardPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel
          title="Saloes Em Risco"
          description="Priorize suporte, retencao e correcao onde o churn esta mais perto."
        >
          <AdminDataTable
            rows={riskRows}
            columns={["salao", "plano", "status", "score", "detalhe", "sinal"]}
          />
        </DashboardPanel>

        <DashboardPanel
          title="Saloes Engajados"
          description="Quem esta usando bem o produto e pode receber expansao, upgrade ou trial extra."
        >
          <AdminDataTable
            rows={engagementRows}
            columns={["salao", "plano", "status", "score", "detalhe", "sinal"]}
          />
        </DashboardPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-2.5">
          <h3 className="font-display text-2xl font-black">Saloes recentes</h3>
          <AdminDataTable
            rows={recentes}
            columns={["salao", "responsavel", "plano", "status", "criado"]}
          />
        </div>
        <div className="space-y-2.5">
          <h3 className="font-display text-2xl font-black">Planos ativos</h3>
          <AdminDataTable
            rows={planos}
            columns={["codigo", "nome", "valor_mensal", "destaque"]}
          />
        </div>
      </section>
    </div>
  );
}
