import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, CircleDollarSign, Plus } from "lucide-react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import AgendaDayStrip from "@/components/profissional/agenda/AgendaDayStrip";
import AgendaTimeline from "@/components/profissional/agenda/AgendaTimeline";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";
import { buscarAgendaProfissional } from "@/app/services/profissional/agenda";

type SearchParams = Promise<{
  data?: string;
  ok?: string;
}>;

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export default async function AgendaProfissionalPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getProfissionalSessionFromCookie();

  if (!session) {
    redirect("/app-profissional/login");
  }

  const { data, ok } = await searchParams;

  const agenda = await buscarAgendaProfissional(
    session.idSalao,
    session.idProfissional,
    data
  );

  return (
    <ProfissionalShell title="Agenda" subtitle={agenda.dataLabel}>
      <div className="space-y-5 pb-28">
        {ok ? (
          <div className="rounded-[1.25rem] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 shadow-sm">
            {ok}
          </div>
        ) : null}

        <AgendaDayStrip
          dataSelecionada={agenda.dataSelecionada}
          basePath="/app-profissional/agenda"
        />

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-[1.6rem] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-500">
              <CalendarDays size={18} />
              <span className="text-sm">Atendimentos</span>
            </div>
            <div className="mt-3 text-[2rem] font-bold leading-none text-zinc-950">
              {agenda.totalAtendimentos}
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-500">
              <CircleDollarSign size={18} />
              <span className="text-sm">Previsto</span>
            </div>
            <div className="mt-3 text-[1.75rem] font-bold leading-none text-zinc-950">
              {formatarMoeda(agenda.totalPrevisto)}
            </div>
          </div>
        </section>

        <section className="rounded-[1.6rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
              Todos
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700">
              <span className="h-2.5 w-2.5 rounded-full bg-[#c89b3c]" />
              {agenda.profissional.nome}
            </span>
          </div>

          <div className="mt-4 text-sm text-zinc-500">
            {agenda.expedienteAtivo
              ? `Expediente: ${agenda.horaInicioExpediente} às ${agenda.horaFimExpediente}`
              : "Profissional sem expediente ativo neste dia."}
          </div>
        </section>

        {agenda.cards.length ? (
          <AgendaTimeline
            labels={agenda.labels}
            cards={agenda.cards}
            pausas={agenda.pausas as any}
            timelineHeight={agenda.timelineHeight}
          />
        ) : (
          <div className="rounded-[1.6rem] border border-zinc-200 bg-white p-5 text-sm text-zinc-500 shadow-sm">
            Nenhum agendamento encontrado nesta data.
          </div>
        )}

        <Link
          href={`/app-profissional/agenda/novo?data=${agenda.dataSelecionada}`}
          className="fixed bottom-[98px] right-5 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-[#b67d19] to-[#d9ab3f] text-white shadow-[0_18px_35px_rgba(0,0,0,0.18)]"
        >
          <Plus size={28} />
        </Link>
      </div>
    </ProfissionalShell>
  );
}