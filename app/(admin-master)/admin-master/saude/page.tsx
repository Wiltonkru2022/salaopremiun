import Link from "next/link";
import { getAdminMasterHealthCenter, type HealthTone } from "@/lib/admin-master/health-center";
import { getOracleVpsStatus } from "@/lib/oracle-vps/client";
import { AdminDataTable } from "@/components/admin-master/AdminMasterViews";
import OracleVpsActionButton from "@/components/admin-master/OracleVpsActionButton";

export const dynamic = "force-dynamic";

function toneClass(tone: HealthTone) {
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-900";
  if (tone === "red") return "border-red-200 bg-red-50 text-red-900";
  if (tone === "blue") return "border-blue-200 bg-blue-50 text-blue-900";
  return "border-zinc-800 bg-zinc-950 text-white";
}

function scoreClass(tone: HealthTone) {
  if (tone === "green") return "from-emerald-500 to-lime-200 text-emerald-950";
  if (tone === "amber") return "from-amber-500 to-yellow-200 text-amber-950";
  if (tone === "red") return "from-rose-600 to-orange-300 text-red-950";
  return "from-blue-500 to-sky-200 text-blue-950";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatPercent(value: unknown) {
  return `${asNumber(value).toFixed(1).replace(".", ",")}%`;
}

function formatUptime(seconds: unknown) {
  const total = asNumber(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function oracleTone(params: {
  ok: boolean;
  diskPercent: number;
  pendingJobs: number;
  errors: number;
}): HealthTone {
  if (!params.ok || params.diskPercent >= 90 || params.errors >= 5) return "red";
  if (params.diskPercent >= 80 || params.pendingJobs >= 10 || params.errors > 0) {
    return "amber";
  }
  return "green";
}

function HealthList({
  title,
  rows,
}: {
  title: string;
  rows: {
    id: string;
    title: string;
    subtitle: string;
    status: string;
    when: string;
    href?: string;
    tone: HealthTone;
  }[];
}) {
  return (
    <section className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
        {title}
      </div>
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map((row) => {
            const content = (
              <div className="flex items-start justify-between gap-4 rounded-[22px] border border-zinc-100 bg-zinc-50 px-4 py-3 transition hover:border-zinc-300">
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-zinc-950">
                    {row.title}
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                    {row.subtitle}
                  </div>
                  <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                    {row.when}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-black ${toneClass(row.tone)}`}>
                  {row.status}
                </span>
              </div>
            );

            return row.href ? (
              <Link key={row.id} href={row.href}>
                {content}
              </Link>
            ) : (
              <div key={row.id}>{content}</div>
            );
          })
        ) : (
          <div className="rounded-[22px] border border-zinc-100 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
            Nenhum evento recente nesta fila.
          </div>
        )}
      </div>
    </section>
  );
}

export default async function AdminMasterSaudePage() {
  const [data, oracleVps] = await Promise.all([
    getAdminMasterHealthCenter(),
    getOracleVpsStatus(),
  ]);
  const oraclePublic = oracleVps.configured ? asRecord(oracleVps.publicStatus) : {};
  const oracleSystem = oracleVps.configured ? asRecord(oracleVps.system) : {};
  const oracleHost = asRecord(oracleSystem.host);
  const oracleMemory = asRecord(oracleHost.memory);
  const oracleDisk = asRecord(oracleHost.disk);
  const oracleJobsPayload = oracleVps.configured ? asRecord(oracleVps.jobs) : {};
  const oracleJobs = Array.isArray(oracleJobsPayload.items)
    ? (oracleJobsPayload.items as Record<string, unknown>[])
    : [];
  const pendingJobs = oracleJobs.filter(
    (job) => String(job.status || "").toLowerCase() === "queued"
  ).length;
  const oracleErrorsPayload = oracleVps.configured
    ? asRecord(oracleVps.monitoringErrors)
    : {};
  const oracleErrors = Array.isArray(oracleErrorsPayload.items)
    ? (oracleErrorsPayload.items as Record<string, unknown>[])
    : [];
  const oraclePerfPayload = oracleVps.configured
    ? asRecord(oracleVps.monitoringPerformance)
    : {};
  const slowEvents = Array.isArray(oraclePerfPayload.slowEvents)
    ? (oraclePerfPayload.slowEvents as Record<string, unknown>[])
    : [];
  const diskPercent = asNumber(oracleDisk.usedPercent);
  const oracleHealthTone = oracleTone({
    ok: oracleVps.ok,
    diskPercent,
    pendingJobs,
    errors: oracleErrors.length,
  });
  const oracleRows = oracleJobs.slice(0, 5).map((job) => ({
    id: String(job.id || "-"),
    tipo: String(job.type || "-"),
    status: String(job.status || "-"),
    criado: String(job.createdAt || "-"),
    processado: String(job.processedAt || "-"),
  }));
  const oracleErrorRows = oracleErrors.slice(0, 5).map((item) => ({
    id: String(item.id || "-"),
    severidade: String(item.severity || "-"),
    tipo: String(item.type || "-"),
    rota: String(item.route || "-"),
    mensagem: String(item.message || "-"),
    quando: String(item.createdAt || "-"),
  }));
  const oracleSlowRows = slowEvents.slice(0, 5).map((item) => ({
    id: String(item.id || "-"),
    severidade: String(item.severity || "performance"),
    tipo: String(item.type || "-"),
    rota: String(item.route || "-"),
    mensagem: `${String(item.durationMs || "-")}ms`,
    quando: String(item.createdAt || "-"),
  }));
  const incidentRows = data.operational.incidents.map((item) => ({
    incidente: item.title,
    modulo: item.module,
    gravidade: item.severity,
    ocorrencias: item.occurrences,
    saloes: item.impactedSalons,
    ultima: item.lastOccurrence,
    acao: item.recommendedAction,
  }));
  const telemetryRows = data.operational.moduleTelemetry.map((item) => ({
    modulo: item.module,
    sucesso: item.successRate,
    falha: item.failureRate,
    tempo_medio: item.avgResponseMs,
    ultima_falha: item.lastFailure,
    erro_mais_comum: item.topError,
    tendencia: item.trend,
  }));
  const suggestionRows = data.operational.suggestions.map((item) => ({
    prioridade: item.kind === "automatico" ? "Automatica" : item.kind === "sugerido" ? "Sugerida" : "Manual",
    acao: item.title,
    alvo: item.target,
    detalhe: item.detail,
  }));

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[36px] border border-zinc-900 bg-zinc-950 text-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[0.75fr_1.25fr] lg:p-8">
          <div className={`rounded-[32px] bg-gradient-to-br p-6 ${scoreClass(data.statusTone)}`}>
            <div className="text-xs font-black uppercase tracking-[0.28em] opacity-70">
              Saude operacional
            </div>
            <div className="mt-6 font-display text-7xl font-black leading-none">
              {data.score}
            </div>
            <div className="mt-3 text-xl font-black">{data.statusLabel}</div>
            <p className="mt-3 max-w-sm text-sm leading-6 opacity-75">{data.summary}</p>
          </div>

          <div className="flex flex-col justify-between gap-6">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.28em] text-amber-200">
                Centro de comando
              </div>
              <h1 className="mt-3 max-w-3xl font-display text-4xl font-black leading-tight md:text-5xl">
                Webhooks, checkouts, bloqueios e jobs em uma tela acionavel.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-300">
                Esta página junta os sinais que mais afetam venda de assinatura:
                cobrança Asaas, cron de renovação, salões bloqueados, alertas e
                falhas recentes.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {data.actions.map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className={`rounded-[24px] border p-4 transition hover:-translate-y-0.5 ${toneClass(action.tone)}`}
                >
                  <div className="text-sm font-black">{action.title}</div>
                  <div className="mt-2 text-xs leading-5 opacity-75">{action.detail}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {data.metrics.map((metric) => {
          const card = (
            <div className={`h-full rounded-[28px] border p-5 shadow-sm ${toneClass(metric.tone)}`}>
              <div className="text-[11px] font-black uppercase tracking-[0.22em] opacity-60">
                {metric.label}
              </div>
              <div className="mt-3 font-display text-3xl font-black">{metric.value}</div>
              <div className="mt-2 text-sm opacity-75">{metric.hint}</div>
            </div>
          );

          return metric.href ? (
            <Link key={metric.label} href={metric.href}>
              {card}
            </Link>
          ) : (
            <div key={metric.label}>{card}</div>
          );
        })}
      </section>

      <section
        className={`rounded-[32px] border p-5 shadow-sm ${toneClass(oracleHealthTone)}`}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-[0.25em] opacity-60">
              Oracle VPS
            </div>
            <h2 className="mt-2 font-display text-3xl font-black">
              {oracleVps.ok ? "API auxiliar online" : "API auxiliar exige atenção"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 opacity-75">
              {oracleVps.ok
                ? "A Vercel está comunicando com a VPS. Jobs leves, monitoramento e ping estão disponíveis para operação."
                : oracleVps.error || "A integração com a VPS ainda não respondeu corretamente."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <OracleVpsActionButton action="ping" />
            <OracleVpsActionButton action="backup" />
            <OracleVpsActionButton action="notifications" />
            <OracleVpsActionButton action="report" />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Status", oracleVps.ok ? "Online" : "Offline"],
            ["Memória", formatPercent(oracleMemory.usedPercent)],
            ["Disco", formatPercent(oracleDisk.usedPercent)],
            ["Uptime", formatUptime(oraclePublic.uptimeSeconds)],
            ["Jobs pendentes", String(pendingJobs)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[22px] border border-black/10 bg-white/55 p-4"
            >
              <div className="text-[11px] font-black uppercase tracking-[0.22em] opacity-60">
                {label}
              </div>
              <div className="mt-2 font-display text-2xl font-black">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-[24px] border border-black/10 bg-white/60 p-4">
            <div className="text-xs font-black uppercase tracking-[0.24em] opacity-60">
              Jobs recentes da VPS
            </div>
            <div className="mt-3">
              <AdminDataTable
                rows={oracleRows}
                columns={["tipo", "status", "criado", "processado"]}
                emptyTitle="Nenhum job recente na VPS."
                emptyDescription="Use os botões acima para registrar jobs leves e validar a fila."
              />
            </div>
          </div>
          <div className="rounded-[24px] border border-black/10 bg-white/60 p-4">
            <div className="text-xs font-black uppercase tracking-[0.24em] opacity-60">
              Erros e lentidão espelhados
            </div>
            <div className="mt-3">
              <AdminDataTable
                rows={oracleErrorRows.length ? oracleErrorRows : oracleSlowRows}
                columns={["severidade", "tipo", "rota", "mensagem", "quando"]}
                emptyTitle="Nenhum erro espelhado na VPS."
                emptyDescription="Erros globais, webhooks, crons e rotas lentas começam a aparecer aqui quando ocorrerem."
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <HealthList title="Ultimos webhooks Asaas" rows={data.webhooks} />
        <HealthList title="Checkouts e travas de assinatura" rows={data.checkouts} />
        <HealthList title="Cron e jobs internos" rows={data.crons} />
        <HealthList title="Alertas ativos" rows={data.alerts} />
      </div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
            Diagnostico das ultimas 24h
          </div>
          <h2 className="mt-2 font-display text-2xl font-black text-zinc-950">
            Onde o sistema esta falhando, lento ou instavel
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            A leitura abaixo cruza incidentes, eventos de erro, rotas lentas e impacto em saloes. Use isso para abrir tickets internos com contexto, em vez de procurar erro no escuro.
          </p>
          <div className="mt-4">
            <AdminDataTable
              rows={telemetryRows}
              columns={["modulo", "sucesso", "falha", "tempo_medio", "ultima_falha", "tendencia"]}
            />
          </div>
        </div>

        <div className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
            Proximas acoes
          </div>
          <h2 className="mt-2 font-display text-2xl font-black text-zinc-950">
            Fila de resposta do Admin Master
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Cada item precisa virar resolucao, ticket interno ou acompanhamento. Quando nao houver dados, o painel deve dizer que falta telemetria, nao que esta tudo perfeito.
          </p>
          <div className="mt-4">
            <AdminDataTable
              rows={suggestionRows}
              columns={["prioridade", "acao", "alvo", "detalhe"]}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
              Incidentes abertos
            </div>
            <h2 className="mt-2 font-display text-2xl font-black text-zinc-950">
              Problemas que ainda precisam de dono
            </h2>
          </div>
          <Link
            href="/admin-master/tickets"
            className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-black text-white transition hover:bg-zinc-800"
          >
            Abrir tickets
          </Link>
        </div>
        <div className="mt-4">
          <AdminDataTable
            rows={incidentRows}
            columns={["incidente", "modulo", "gravidade", "ocorrencias", "saloes", "ultima", "acao"]}
          />
        </div>
      </section>
    </div>
  );
}
