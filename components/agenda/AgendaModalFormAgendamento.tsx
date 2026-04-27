"use client";

import type { ReactNode } from "react";
import { Clock3, Receipt, StickyNote, UserRound } from "lucide-react";
import SearchableSelect, {
  type SearchableOption,
} from "@/components/ui/SearchableSelect";
import type { Agendamento } from "@/types/agenda";
import type { AgendaStatus } from "./useAgendaModal";

type Props = {
  profissionaisOptions: SearchableOption[];
  clientesOptions: SearchableOption[];
  servicosOptions: SearchableOption[];
  profissionalId: string;
  clienteId: string;
  servicoId: string;
  horaInicio: string;
  observacoes: string;
  status: AgendaStatus;
  loadingComanda: boolean;
  comandaNumero: number | null;
  editingItem?: Agendamento | null;
  onProfissionalChange: (value: string) => void;
  onClienteChange: (value: string) => Promise<void>;
  onServicoChange: (value: string) => void;
  onHoraInicioChange: (value: string) => void;
  onObservacoesChange: (value: string) => void;
  onStatusChange: (value: AgendaStatus) => void;
  onAbrirComanda: () => Promise<void>;
  onCancelAppointment: (item: Agendamento) => Promise<void>;
};

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-zinc-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.03)]">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
        {eyebrow}
      </div>
      <h3 className="mt-1 text-sm font-bold text-zinc-900">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function AgendaModalFormAgendamento({
  profissionaisOptions,
  clientesOptions,
  servicosOptions,
  profissionalId,
  clienteId,
  servicoId,
  horaInicio,
  observacoes,
  status,
  loadingComanda,
  comandaNumero,
  editingItem,
  onProfissionalChange,
  onClienteChange,
  onServicoChange,
  onHoraInicioChange,
  onObservacoesChange,
  onStatusChange,
  onAbrirComanda,
  onCancelAppointment,
}: Props) {
  const statusOptions: Array<{
    value: AgendaStatus;
    label: string;
  }> = [
    { value: "confirmado", label: "Confirmado" },
    { value: "pendente", label: "Pendente" },
    { value: "atendido", label: "Atendido" },
    { value: "cancelado", label: "Cancelado" },
    { value: "aguardando_pagamento", label: "Aguardando pagamento" },
  ];

  return (
    <div className="space-y-4">
      <Section eyebrow="Atendimento" title="Quem vai atender e quem vai ser atendida">
        <div className="grid gap-3 lg:grid-cols-2">
          <SearchableSelect
            label="Profissional"
            placeholder="Digite o nome do profissional"
            emptyText="Nenhum profissional encontrado."
            options={profissionaisOptions}
            value={profissionalId}
            onChange={onProfissionalChange}
          />

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Cliente
            </label>

            <SearchableSelect
              placeholder="Digite o nome da cliente"
              emptyText="Nenhuma cliente encontrada."
              options={clientesOptions}
              value={clienteId}
              onChange={onClienteChange}
            />
          </div>
        </div>

        <div className="mt-3">
          <SearchableSelect
            label="Servico"
            placeholder="Digite o nome do servico"
            emptyText="Nenhum servico encontrado."
            options={servicosOptions}
            value={servicoId}
            onChange={onServicoChange}
          />
        </div>
      </Section>

      <Section eyebrow="Fluxo" title="Horario, status e caixa">
        <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-zinc-700">
              <Clock3 size={13} />
              Hora de inicio
            </label>

            <input
              type="time"
              value={horaInicio}
              onChange={(e) => onHoraInicioChange(e.target.value)}
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
              required
            />
          </div>

          <div className="rounded-[18px] border border-zinc-200 bg-zinc-50 px-4 py-3">
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onStatusChange(option.value)}
                  className={
                    status === option.value
                      ? "inline-flex min-h-10 items-center justify-center rounded-full border border-violet-300 bg-violet-50 px-3.5 py-2 text-sm font-semibold text-violet-700 shadow-[0_10px_24px_rgba(124,58,237,0.12)] transition duration-200"
                      : "inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 transition duration-200 hover:-translate-y-[1px] hover:bg-zinc-50"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-[18px] border border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Comanda
              </div>
              <div className="mt-1 text-sm font-semibold text-zinc-900">
                {comandaNumero ? `Comanda #${comandaNumero}` : "Sem comanda vinculada"}
              </div>
            </div>

            <button
              type="button"
              onClick={onAbrirComanda}
              disabled={loadingComanda || !clienteId}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
            >
              <Receipt size={14} />
              {loadingComanda ? "Verificando..." : "Abrir comanda"}
            </button>
          </div>
        </div>
      </Section>

      <Section eyebrow="Detalhes" title="Observacoes da recepcao e do atendimento">
        <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-zinc-700">
          <StickyNote size={13} />
          Observacoes
        </label>

        <textarea
          value={observacoes}
          onChange={(e) => onObservacoesChange(e.target.value)}
          className="min-h-[120px] w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
          placeholder="Anotacoes internas, combinados, preferencias ou observacoes importantes."
        />
      </Section>

      {editingItem ? (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => onCancelAppointment(editingItem)}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            <UserRound size={14} />
            Cancelar agendamento
          </button>
        </div>
      ) : null}
    </div>
  );
}
