"use client";

import type { ReactNode } from "react";
import { ChevronRight, Clock3, Receipt, StickyNote, UserRound } from "lucide-react";
import SearchableSelect, {
  type SearchableOption,
} from "@/components/ui/SearchableSelect";
import type { Agendamento } from "@/types/agenda";

type Props = {
  profissionaisOptions: SearchableOption[];
  clientesOptions: SearchableOption[];
  servicosOptions: SearchableOption[];
  profissionalId: string;
  clienteId: string;
  servicoId: string;
  horaInicio: string;
  observacoes: string;
  statusLabel: string;
  loadingComanda: boolean;
  comandaNumero: number | null;
  editingItem?: Agendamento | null;
  onProfissionalChange: (value: string) => void;
  onClienteChange: (value: string) => Promise<void>;
  onServicoChange: (value: string) => void;
  onHoraInicioChange: (value: string) => void;
  onObservacoesChange: (value: string) => void;
  onOpenStatusPicker: () => void;
  onAbrirComanda: () => Promise<void>;
  onCancelAppointment: (item: Agendamento) => Promise<void>;
};

function getStatusTone(statusLabel: string) {
  switch (statusLabel) {
    case "Confirmado":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Pendente":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Atendido":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "Cancelado":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-800";
  }
}

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
    <section className="rounded-lg border border-zinc-200 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
        {eyebrow}
      </div>
      <h3 className="mt-1 text-sm font-bold text-zinc-900">{title}</h3>
      <div className="mt-2.5">{children}</div>
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
  statusLabel,
  loadingComanda,
  comandaNumero,
  editingItem,
  onProfissionalChange,
  onClienteChange,
  onServicoChange,
  onHoraInicioChange,
  onObservacoesChange,
  onOpenStatusPicker,
  onAbrirComanda,
  onCancelAppointment,
}: Props) {
  const statusTone = getStatusTone(statusLabel);

  return (
    <div className="space-y-3">
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
            label="Serviço"
            placeholder="Digite o nome do serviço"
            emptyText="Nenhum serviço encontrado."
            options={servicosOptions}
            value={servicoId}
            onChange={onServicoChange}
          />
        </div>
      </Section>

      <Section eyebrow="Fluxo" title="Horário, status e caixa">
        <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)]">
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-zinc-700">
              <Clock3 size={13} />
              Hora de início
            </label>

            <input
              type="time"
              value={horaInicio}
              onChange={(e) => onHoraInicioChange(e.target.value)}
              className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Status
            </label>
            <button
              type="button"
              onClick={onOpenStatusPicker}
              className="flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-left transition duration-200 hover:bg-white"
            >
              <div className="min-w-0 flex-1">
                <span
                  className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone}`}
                >
                  {statusLabel}
                </span>
              </div>
              <ChevronRight size={16} className="shrink-0 text-zinc-400" />
            </button>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
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
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
            >
              <Receipt size={14} />
              {loadingComanda ? "Verificando..." : "Abrir comanda"}
            </button>
          </div>
        </div>
      </Section>

      <Section eyebrow="Detalhes" title="Observações da recepção e do atendimento">
        <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-zinc-700">
          <StickyNote size={13} />
          Observações
        </label>

        <textarea
          value={observacoes}
          onChange={(e) => onObservacoesChange(e.target.value)}
          className="min-h-[88px] w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
          placeholder="Anotacoes internas, combinados, preferencias ou observações importantes."
        />
      </Section>

      {editingItem ? (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => onCancelAppointment(editingItem)}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            <UserRound size={14} />
            Cancelar agendamento
          </button>
        </div>
      ) : null}
    </div>
  );
}
