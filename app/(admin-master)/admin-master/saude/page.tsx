import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gauge,
  Radar,
  ShieldCheck,
} from "lucide-react";
import { getOperationalHealthSnapshot } from "@/lib/monitoring/operational-snapshot.server";

export const dynamic = "force-dynamic";

function stateClass(state: string) {
  if (state === "operational")
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (state === "degraded")
    return "border-amber-200 bg-amber-50 text-amber-900";
  if (state === "partial_outage")
    return "border-orange-200 bg-orange-50 text-orange-900";
  if (state === "major_outage") return "border-red-200 bg-red-50 text-red-900";
  if (state === "maintenance") return "border-blue-200 bg-blue-50 text-blue-900";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function findingClass(classification: string) {
  if (classification === "falha_operacional")
    return "border-red-200 bg-red-50 text-red-800";
  if (classification === "risco_seguranca")
    return "border-amber-200 bg-amber-50 text-amber-800";
  if (classification === "configuracao_intencional")
    return "border-blue-200 bg-blue-50 text-blue-800";
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function metric(label: string, value: string, hint: string) {
  return { label, value, hint };
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1).replace(".", ",")}%`;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1).replace(".", ",")} h`;
}

function formatMs(value: number | null) {
  return value ? `${Math.round(value)} ms` : "—";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Campo_Grande",
  }).format(date);
}

export default async function AdminMasterSaudePage() {
  const data = await getOperationalHealthSnapshot();
  const metrics = [
    metric(
      "Cobertura operacional",
      `${data.coverage.percentage.toFixed(1).replace(".", ",")}%`,
      `${data.coverage.monitored}/${data.coverage.total} componentes conhecidos com monitor registrado`
    ),
    metric(
      "Cobertura crítica",
      `${data.coverage.criticalPercentage.toFixed(1).replace(".", ",")}%`,
      `${data.coverage.criticalMonitored}/${data.coverage.criticalTotal} componentes críticos`
    ),
    metric(
      "Incidentes ativos",
      String(data.metrics.activeIncidents),
      "Sem contar duplicados suprimidos"
    ),
    metric(
      "Recuperando",
      String(data.metrics.recoveringIncidents),
      "Aguardando evidências suficientes"
    ),
    metric(
      "Auto-resolvidos hoje",
      String(data.metrics.autoResolvedToday),
      "Resolução por evidência, não por silêncio"
    ),
    metric(
      "MTTR 30 dias",
      formatDuration(data.metrics.mttrSeconds),
      "Média dos incidentes resolvidos"
    ),
    metric(
      "Taxa de erro 24h",
      formatPercent(data.metrics.errorRate24h),
      `${data.metrics.failures24h}/${data.metrics.totalEvents24h} eventos operacionais`
    ),
    metric(
      "p95 observado",
      formatMs(data.metrics.p95Ms),
      "Maior p95 entre módulos com amostra"
    ),
  ];

  const attention = data.incidents.filter(
    (incident) => incident.status !== "recuperando"
  );
  const recovering = data.incidents.filter(
    (incident) => incident.status === "recuperando"
  );

  return (
    <div className="space-y-6">
      <section
        className={`rounded-[34px] border p-6 shadow-sm lg:p-8 ${stateClass(
          data.overall.state
        )}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] opacity-65">
              <Radar size={17} /> Saúde operacional autônoma
            </div>
            <h1 className="mt-3 font-display text-4xl font-black tracking-[-0.05em] md:text-5xl">
              {data.overall.label}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 opacity-75">
              {data.overall.summary}
            </p>
          </div>
          <div className="rounded-2xl border border-current/15 bg-white/60 px-4 py-3 text-sm font-bold">
            <div className="text-xs uppercase tracking-[0.15em] opacity-60">
              Deployment atual
            </div>
            <div className="mt-1 font-mono text-xs">
              {data.deployment.commitSha?.slice(0, 12) || "não identificado"}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <div
            key={item.label}
            className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
              {item.label}
            </div>
            <div className="mt-2 font-display text-3xl font-black text-zinc-950">
              {item.value}
            </div>
            <div className="mt-2 text-xs leading-5 text-zinc-500">
              {item.hint}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-red-500">
            <AlertTriangle size={16} /> Incidentes que precisam de atenção
          </div>
          <div className="mt-4 space-y-3">
            {attention.length ? (
              attention.map((incident) => (
                <article
                  key={incident.id}
                  className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                        {incident.componentName}
                      </div>
                      <h3 className="mt-1 text-base font-black">{incident.title}</h3>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-zinc-700">
                      {incident.severity}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-black text-zinc-500">Sintoma</dt>
                      <dd className="mt-1 text-zinc-700">{incident.symptom}</dd>
                    </div>
                    <div>
                      <dt className="font-black text-zinc-500">Causa provável</dt>
                      <dd className="mt-1 text-zinc-700">
                        {incident.cause}{" "}
                        <span className="text-xs text-zinc-400">
                          ({incident.confidence})
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="font-black text-zinc-500">Responsável</dt>
                      <dd className="mt-1 text-zinc-700">{incident.owner}</dd>
                    </div>
                    <div>
                      <dt className="font-black text-zinc-500">Última ocorrência</dt>
                      <dd className="mt-1 text-zinc-700">
                        {formatDate(incident.lastOccurrenceAt)} · {incident.occurrences}{" "}
                        ocorrência(s)
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                    <strong>O que fazer:</strong> {incident.action}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                Nenhum incidente ativo nesta fila.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-500">
            <Clock3 size={16} /> Recuperando automaticamente
          </div>
          <div className="mt-4 space-y-3">
            {recovering.length ? (
              recovering.map((incident) => (
                <article
                  key={incident.id}
                  className="rounded-2xl border border-amber-100 bg-amber-50 p-4"
                >
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">
                    {incident.componentName}
                  </div>
                  <h3 className="mt-1 text-base font-black text-amber-950">
                    {incident.title}
                  </h3>
                  <p className="mt-2 text-sm text-amber-900">
                    Recuperação: {incident.recovery}. O incidente só será encerrado
                    quando janela, dependências e deployment também estiverem saudáveis.
                  </p>
                </article>
              ))
            ) : (
              <div className="rounded-2xl bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
                Nenhum incidente em recuperação neste momento.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
            <Activity size={16} /> Componentes monitorados
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {data.components.map((component) => (
              <div
                key={component.componentKey}
                className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
                      {component.category}
                    </div>
                    <div className="mt-1 text-sm font-black">{component.name}</div>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${stateClass(
                      component.state
                    )}`}
                  >
                    {component.stateLabel}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {component.reason}
                </p>
                <div className="mt-2 text-[11px] text-zinc-400">
                  Último check: {formatDate(component.lastCheckedAt)} · Dono:{" "}
                  {component.owner}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
              <Gauge size={16} /> Cobertura e freshness
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Sem monitor</span>
                <strong>{data.withoutMonitor.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Monitoramento atrasado</span>
                <strong>{data.stale.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Componentes degradados</span>
                <strong>{data.degraded.length}</strong>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
                <ShieldCheck size={16} /> Segurança operacional
              </div>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-black text-zinc-700">
                {data.metrics.openSecurityFindings}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Findings são separados de outage. Advisor INFO/WARN e postura de banco
              não alteram o status público sem evidência de impacto operacional.
            </p>
            <div className="mt-4 space-y-2">
              {data.securityFindings.slice(0, 8).map((finding) => (
                <div
                  key={finding.key}
                  className={`rounded-2xl border p-3 text-xs ${findingClass(
                    finding.classification
                  )}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <strong>{finding.title}</strong>
                    <span className="font-black uppercase">{finding.severity}</span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] opacity-70">
                    {finding.entity}
                  </div>
                  <p className="mt-2 leading-5 opacity-85">{finding.detail}</p>
                  <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] opacity-60">
                    {finding.classification.replaceAll("_", " ")} · {finding.source}
                  </div>
                </div>
              ))}
              {!data.securityFindings.length ? (
                <div className="rounded-2xl bg-zinc-50 px-3 py-4 text-xs text-zinc-500">
                  Nenhum finding de postura sincronizado. Ausência de finding não é
                  prova de segurança completa.
                </div>
              ) : null}
            </div>
          </div>

          <Link
            href="/status"
            className="flex items-center justify-between rounded-2xl border border-violet-200 bg-violet-50 p-5 text-violet-950 shadow-sm"
          >
            <div>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-violet-500">
                Página pública
              </div>
              <div className="mt-1 text-lg font-black">Abrir /status</div>
            </div>
            <CheckCircle2 />
          </Link>
        </div>
      </section>
    </div>
  );
}
