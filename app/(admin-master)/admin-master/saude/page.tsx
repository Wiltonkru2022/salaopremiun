import Link from "next/link";
import { getAdminMasterHealthCenter, type HealthTone } from "@/lib/admin-master/health-center";

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
  const data = await getAdminMasterHealthCenter();

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
                Esta pagina junta os sinais que mais afetam venda de assinatura:
                cobranca Asaas, cron de renovacao, saloes bloqueados, alertas e
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

      <div className="grid gap-5 xl:grid-cols-2">
        <HealthList title="Ultimos webhooks Asaas" rows={data.webhooks} />
        <HealthList title="Checkouts e travas de assinatura" rows={data.checkouts} />
        <HealthList title="Cron e jobs internos" rows={data.crons} />
        <HealthList title="Alertas ativos" rows={data.alerts} />
      </div>
    </div>
  );
}
