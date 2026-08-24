"use client";

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
      <section className="rounded-[18px] border border-zinc-200/90 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
        <div className="grid gap-3">
          <SearchableSelect
            label="Profissional"
            placeholder="Selecione o profissional"
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
              placeholder="Busque pelo nome da cliente"
              emptyText="Nenhuma cliente encontrada."
              options={clientesOptions}
              value={clienteId}
              onChange={onClienteChange}
            />
          </div>

          <SearchableSelect
            label="Serviço"
            placeholder="Selecione o serviço"
            emptyText="Nenhum serviço encontrado."
            options={servicosOptions}
            value={servicoId}
            onChange={onServicoChange}
          />

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-zinc-700">
              <Clock3 size={13} />
              Horário
            </label>
            <input
              type="time"
              value={horaInicio}
              onChange={(event) => onHoraInicioChange(event.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
              required
            />
          </div>
        </div>
      </section>

      <details
        className="group rounded-[18px] border border-zinc-200/90 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.03)]"
        open={Boolean(editingItem)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-zinc-800 [&::-webkit-details-marker]:hidden">
          <span>Mais opções</span>
          <ChevronRight
            size={17}
            className="text-zinc-400 transition-transform group-open:rotate-90"
          />
        </summary>

        <div className="space-y-3 border-t border-zinc-100 px-3 pb-3 pt-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
              Status
            </label>
            <button
              type="button"
              onClick={onOpenStatusPicker}
              className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-left transition hover:bg-white"
            >
              <span
                className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone}`}
              >
                {statusLabel}
              </span>
              <ChevronRight size={16} className="shrink-0 text-zinc-400" />
            </button>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                  Comanda
                </div>
                <div className="mt-1 truncate text-sm font-semibold text-zinc-900">
                  {comandaNumero ? `Comanda #${comandaNumero}` : "Sem comanda vinculada"}
                </div>
              </div>
              <button
                type="button"
                onClick={onAbrirComanda}
                disabled={loadingComanda || !clienteId}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                <Receipt size={14} />
                {loadingComanda ? "Verificando..." : "Abrir"}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-zinc-700">
              <StickyNote size={13} />
              Observações
            </label>
            <textarea
              value={observacoes}
              onChange={(event) => onObservacoesChange(event.target.value)}
              className="min-h-[76px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
              placeholder="Observações opcionais"
            />
          </div>
        </div>
      </details>

      {editingItem ? (
        <button
          type="button"
          onClick={() => onCancelAppointment(editingItem)}
          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
        >
          <UserRound size={14} />
          Cancelar agendamento
        </button>
      ) : null}
    </div>
  );
}
