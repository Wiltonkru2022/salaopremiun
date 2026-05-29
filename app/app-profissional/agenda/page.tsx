import Link from "next/link";
import { Ban, CalendarClock, CalendarDays, CircleDollarSign, Plus, Receipt } from "lucide-react";
import AgendaDayStrip from "@/components/profissional/agenda/AgendaDayStrip";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import ProfissionalEmptyState from "@/components/profissional/ui/ProfissionalEmptyState";
import ProfissionalSectionHeader from "@/components/profissional/ui/ProfissionalSectionHeader";
import ProfissionalStatusPill from "@/components/profissional/ui/ProfissionalStatusPill";
import ProfissionalSurface from "@/components/profissional/ui/ProfissionalSurface";
import { buscarAgendaProfissional } from "@/app/services/profissional/agenda";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";

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

function getSinalLabel(status?: string | null) {
  const value = String(status || "").toLowerCase();
  if (value === "comprovante_enviado") return "Aguardando confirmação";
  if (value === "confirmado") return "Sinal confirmado";
  if (value === "aguardando_pagamento") return "Aguardando pagamento";
  if (value === "recusado") return "Sinal recusado";
  return null;
}

function getStatusMeta(status: string) {
  const value = String(status || "").toLowerCase();

  if (value === "confirmado") return { label: "Confirmado", tone: "success" as const };
  if (value === "em_atendimento") return { label: "Em atendimento", tone: "info" as const };
  if (value === "atendido") return { label: "Atendido", tone: "info" as const };
  if (
    value === "aguardando_confirmacao_salao" ||
    value === "aguardando_confirmacao_profissional"
  ) {
    return { label: "Aguardando confirmação", tone: "warning" as const };
  }
  if (value === "aguardando_pagamento") {
    return { label: "Aguardando pagamento", tone: "warning" as const };
  }
  if (value === "faltou") return { label: "Não compareceu", tone: "danger" as const };
  if (value === "cancelado") return { label: "Cancelado", tone: "danger" as const };
  if (value === "bloqueado") return { label: "Bloqueado", tone: "danger" as const };

  return { label: "Pendente de confirmação", tone: "warning" as const };
}

export default async function AgendaProfissionalPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireProfissionalAppContext();
  const { data, ok } = await searchParams;

  const agenda = await buscarAgendaProfissional(
    session.idSalao,
    session.idProfissional,
    data,
    { verTodos: session.podeVerAgendaTodos }
  );

  return (
    <ProfissionalShell title="Agenda" subtitle={agenda.dataLabel}>
      <div className="space-y-3.5">
        {ok ? (
          <div className="rounded-[1.25rem] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 shadow-sm">
            {ok}
          </div>
        ) : null}

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Calendário"
            description={
              session.podeVerAgendaTodos
                ? "Toque em um dia para ver seus atendimentos e os da equipe."
                : "Toque em um dia para ver os atendimentos."
            }
            action={
              <div className="flex flex-wrap justify-end gap-2">
                <Link
                  href={`/app-profissional/agenda/bloquear?data=${agenda.dataSelecionada}`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[18px] border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-800"
                >
                  <Ban size={16} />
                  Bloquear
                </Link>
                <Link
                  href={`/app-profissional/agenda/novo?data=${agenda.dataSelecionada}`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[18px] bg-zinc-950 px-4 text-sm font-bold text-white"
                >
                  <Plus size={16} />
                  Novo
                </Link>
              </div>
            }
          />

          <AgendaDayStrip
            dataSelecionada={agenda.dataSelecionada}
            basePath="/app-profissional/agenda"
            diasComAtendimento={agenda.diasComAtendimento}
          />
        </ProfissionalSurface>

        <div className="grid grid-cols-2 gap-2.5">
          <ProfissionalSurface>
            <div className="flex items-center gap-2 text-zinc-500">
              <CalendarDays size={18} />
              <span className="text-sm font-medium">Atendimentos</span>
            </div>
            <div className="mt-2 text-[1.55rem] font-black tracking-[-0.04em] leading-none text-zinc-950">
              {agenda.totalAtendimentos}
            </div>
          </ProfissionalSurface>

          <ProfissionalSurface>
            <div className="flex items-center gap-2 text-zinc-500">
              <CircleDollarSign size={18} />
              <span className="text-sm font-medium">Previsto</span>
            </div>
            <div className="mt-2.5 text-[1.55rem] font-black tracking-[-0.04em] leading-none text-zinc-950">
              {formatarMoeda(agenda.totalPrevisto)}
            </div>
          </ProfissionalSurface>
        </div>

        {agenda.totalBloqueios ? (
          <ProfissionalSurface>
            <div className="flex items-center gap-2 text-zinc-500">
              <Ban size={18} />
              <span className="text-sm font-medium">Bloqueios no dia</span>
            </div>
            <div className="mt-2 text-[1.55rem] font-black tracking-[-0.04em] leading-none text-zinc-950">
              {agenda.totalBloqueios}
            </div>
          </ProfissionalSurface>
        ) : null}

        <ProfissionalSurface>
          <ProfissionalSectionHeader
            title="Dia de trabalho"
            description={
              agenda.expedienteAtivo
                ? `Expediente das ${agenda.horaInicioExpediente} às ${agenda.horaFimExpediente}.`
                : "Sem expediente ativo neste dia."
            }
          />

          {agenda.cards.length ? (
            <div className="space-y-2.5">
              {agenda.cards.map((card) => {
                const status = getStatusMeta(card.status);

                return (
                  <div
                    key={card.id}
                    className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50/70 p-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">
                          <span>{card.horario}</span>
                          <span className="h-1 w-1 rounded-full bg-zinc-300" />
                          <span>{card.horaFim}</span>
                        </div>

                        <div className="mt-1.5 flex items-center gap-2 text-base font-bold tracking-[-0.02em] text-zinc-950">
                          {card.tipo === "bloqueio" ? <Ban size={16} /> : null}
                          {card.cliente}
                        </div>

                        <div className="mt-1 text-sm leading-6 text-zinc-500">
                          {card.servico}
                        </div>

                        {card.tipo === "agendamento" && card.sinalValor ? (
                          <div className="mt-2 rounded-[0.95rem] border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                            Sinal: {formatarMoeda(card.sinalValor)}
                            {getSinalLabel(card.sinalStatus)
                              ? ` · ${getSinalLabel(card.sinalStatus)}`
                              : ""}
                          </div>
                        ) : null}

                        {session.podeVerAgendaTodos ? (
                          <div className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-600 ring-1 ring-zinc-200">
                            {card.profissional}
                          </div>
                        ) : null}
                      </div>

                      <ProfissionalStatusPill
                        label={status.label}
                        tone={status.tone}
                      />
                    </div>

                    {card.tipo === "bloqueio" ? null : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/app-profissional/agenda/${card.id}`}
                        className="inline-flex h-8.5 items-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700"
                      >
                        Ver detalhes
                      </Link>

                      {card.isDoProfissionalLogado &&
                      ["pendente", "confirmado"].includes(String(card.status || "").toLowerCase()) ? (
                        <Link
                          href={`/app-profissional/agenda/${card.id}#reagendar`}
                          className="inline-flex h-8.5 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700"
                        >
                          <CalendarClock size={14} />
                          Reagendar
                        </Link>
                      ) : null}

                      {card.isDoProfissionalLogado && card.idComanda ? (
                        <Link
                          href={`/app-profissional/comandas/${card.idComanda}`}
                          className="inline-flex h-8.5 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-800"
                        >
                          <Receipt size={14} />
                          Abrir comanda
                        </Link>
                      ) : null}
                    </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <ProfissionalEmptyState
              title="Nenhum agendamento nesta data"
              description="Seu dia está livre. Se quiser, crie um novo horário agora."
              action={
                <Link
                  href={`/app-profissional/agenda/novo?data=${agenda.dataSelecionada}`}
                  className="inline-flex h-10 items-center justify-center rounded-[18px] bg-zinc-950 px-4 text-sm font-bold text-white"
                >
                  Criar horário
                </Link>
              }
            />
          )}
        </ProfissionalSurface>
      </div>
    </ProfissionalShell>
  );
}
