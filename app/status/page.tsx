import Link from "next/link";
import { Activity, Bell, CheckCircle2, CircleAlert, Clock3 } from "lucide-react";
import { getPublicStatusSnapshot } from "@/lib/monitoring/public-status.server";

export const dynamic = "force-dynamic";

function stateClasses(state: string) {
  if (state === "operational") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (state === "degraded") return "border-amber-200 bg-amber-50 text-amber-900";
  if (state === "partial_outage") return "border-orange-200 bg-orange-50 text-orange-900";
  if (state === "major_outage") return "border-red-200 bg-red-50 text-red-900";
  if (state === "maintenance") return "border-blue-200 bg-blue-50 text-blue-900";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function formatDate(value?: string | null) {
  if (!value) return "Sem verificação recente";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem verificação recente";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Campo_Grande",
  }).format(date);
}

export default async function PublicStatusPage({
  searchParams,
}: {
  searchParams?: Promise<{ subscription?: string }>;
}) {
  const snapshot = await getPublicStatusSnapshot().catch(() => null);
  const params = searchParams ? await searchParams : undefined;
  const subscriptionEnabled = Boolean(
    process.env.BREVO_API_KEY &&
      (process.env.STATUS_SUBSCRIPTION_SECRET || process.env.CRON_SECRET)
  );
  const overall = snapshot?.overall || {
    state: "unknown",
    label: "Estado desconhecido",
    detail:
      "O monitoramento está temporariamente indisponível; isso não significa que os serviços estejam operacionais.",
  };

  return (
    <main className="min-h-screen bg-[#f7f7fb] text-zinc-950">
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-16">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="font-display text-xl font-black tracking-[-0.04em]">
            SalãoPremium
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/status/history"
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-bold shadow-sm"
            >
              Histórico
            </Link>
          </div>
        </header>

        <section className={`mt-10 rounded-[32px] border p-6 shadow-sm md:p-8 ${stateClasses(overall.state)}`}>
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] opacity-65">
                <Activity size={16} /> Status do SalãoPremium
              </div>
              <h1 className="mt-4 font-display text-4xl font-black tracking-[-0.05em] md:text-5xl">
                {overall.label}
              </h1>
              <p className="mt-3 text-sm leading-6 opacity-75 md:text-base">{overall.detail}</p>
            </div>
            <div className="rounded-2xl border border-current/15 bg-white/55 px-4 py-3 text-sm font-bold">
              <div className="text-xs uppercase tracking-[0.16em] opacity-60">Última avaliação</div>
              <div className="mt-1">{formatDate(snapshot?.generatedAt)}</div>
            </div>
          </div>
        </section>

        {params?.subscription === "requested" ? (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
            Se o endereço for válido, enviamos um e-mail de confirmação. A inscrição só fica ativa após o clique no e-mail.
          </div>
        ) : null}
        {params?.subscription === "confirmed" ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            Inscrição confirmada. Você receberá apenas atualizações públicas de incidentes.
          </div>
        ) : null}
        {params?.subscription === "unsubscribed" ? (
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700">
            Inscrição cancelada.
          </div>
        ) : null}

        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.36fr]">
          <div className="space-y-5">
            {(snapshot?.groups || []).map((group) => (
              <section key={group.name} className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 px-5 py-4">
                  <h2 className="font-display text-xl font-black">{group.name}</h2>
                </div>
                <div className="divide-y divide-zinc-100">
                  {group.components.map((component) => (
                    <div key={component.key} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div>
                        <div className="text-sm font-bold text-zinc-900">{component.name}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                          <Clock3 size={13} /> {formatDate(component.lastCheckedAt)}
                        </div>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${stateClasses(component.state)}`}>
                        {component.stateLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Incidentes atuais</div>
                  <h2 className="mt-1 font-display text-xl font-black">Atualizações públicas</h2>
                </div>
                {snapshot?.incidents?.length ? <CircleAlert className="text-amber-500" /> : <CheckCircle2 className="text-emerald-500" />}
              </div>
              <div className="mt-4 space-y-3">
                {snapshot?.incidents?.length ? (
                  snapshot.incidents.map((incident) => (
                    <article key={incident.id} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">{incident.component}</div>
                      <h3 className="mt-1 text-base font-black">{incident.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">{incident.symptom}</p>
                      <div className="mt-3 text-xs text-zinc-400">Atualizado em {formatDate(incident.lastOccurrenceAt)}</div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-2xl bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
                    Nenhum incidente público ativo no momento. Isso não substitui a verificação de freshness dos componentes acima.
                  </p>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Cobertura crítica conhecida</div>
              <div className="mt-3 font-display text-4xl font-black">
                {snapshot ? `${snapshot.coverage.criticalPercentage.toFixed(1).replace(".", ",")}%` : "—"}
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {snapshot
                  ? `${snapshot.coverage.criticalMonitored} de ${snapshot.coverage.criticalTotal} componentes críticos conhecidos possuem monitor registrado.`
                  : "Cobertura indisponível."}
              </p>
            </section>

            {subscriptionEnabled ? (
              <section className="rounded-[28px] border border-zinc-900 bg-zinc-950 p-5 text-white shadow-sm">
                <Bell size={24} />
                <h2 className="mt-4 font-display text-2xl font-black">Receber atualizações</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Receba por e-mail apenas alterações públicas de incidentes. A inscrição usa confirmação e possui cancelamento em cada aviso.
                </p>
                <form action="/api/status/subscribe" method="post" className="mt-4 space-y-2">
                  <label htmlFor="status-email" className="sr-only">Seu e-mail</label>
                  <input
                    id="status-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    className="min-h-12 w-full rounded-2xl border border-white/15 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-white/40"
                  />
                  <button className="min-h-12 w-full rounded-2xl bg-white px-4 text-sm font-black text-zinc-950">
                    Inscrever por e-mail
                  </button>
                </form>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
