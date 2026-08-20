import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getPublicStatusHistory } from "@/lib/monitoring/public-status.server";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Campo_Grande",
  }).format(date);
}

function duration(start?: string | null, end?: string | null) {
  const a = Date.parse(start || "");
  const b = Date.parse(end || "");
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return "-";
  const minutes = Math.round((b - a) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h${rest ? ` ${rest}min` : ""}`;
}

export default async function StatusHistoryPage() {
  const history = await getPublicStatusHistory(60).catch(() => []);

  return (
    <main className="min-h-screen bg-[#f7f7fb] text-zinc-950">
      <div className="mx-auto max-w-4xl px-5 py-10 md:px-8 md:py-16">
        <Link href="/status" className="inline-flex items-center gap-2 text-sm font-black text-zinc-600">
          <ArrowLeft size={18} /> Voltar ao status
        </Link>
        <div className="mt-8">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Histórico público</div>
          <h1 className="mt-2 font-display text-4xl font-black tracking-[-0.04em]">Incidentes resolvidos</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            Este histórico contém apenas informações públicas sanitizadas. Detalhes internos, dados pessoais, stack traces e configurações não são publicados.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {history.length ? (
            history.map((incident) => (
              <article key={incident.id} className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">{incident.component}</div>
                    <h2 className="mt-1 font-display text-xl font-black">{incident.title}</h2>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
                    <CheckCircle2 size={14} /> Resolvido
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-600">{incident.publicMessage}</p>
                <div className="mt-4 grid gap-3 rounded-2xl bg-zinc-50 p-4 text-xs text-zinc-500 sm:grid-cols-3">
                  <div><strong className="block text-zinc-800">Início</strong>{formatDate(incident.startedAt)}</div>
                  <div><strong className="block text-zinc-800">Resolvido</strong>{formatDate(incident.resolvedAt)}</div>
                  <div><strong className="block text-zinc-800">Duração</strong>{duration(incident.startedAt, incident.resolvedAt)}</div>
                </div>
                <div className="mt-3 text-xs text-zinc-400">Resolução: {incident.resolutionMode}. {incident.resolutionSummary}</div>
              </article>
            ))
          ) : (
            <div className="rounded-[28px] border border-zinc-200 bg-white px-5 py-12 text-center text-sm text-zinc-500 shadow-sm">
              Ainda não há incidentes públicos resolvidos para exibir.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
