"use client";

import { Clock3, Receipt } from "lucide-react";
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
  return (
    <div className="space-y-3.5">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <SearchableSelect
            label="Profissional"
            placeholder="Digite o nome do profissional"
            emptyText="Nenhum profissional encontrado."
            options={profissionaisOptions}
            value={profissionalId}
            onChange={onProfissionalChange}
          />
        </div>

        <div>
          <SearchableSelect
            label="Cliente"
            placeholder="Digite o nome do cliente"
            emptyText="Nenhum cliente encontrado."
            options={clientesOptions}
            value={clienteId}
            onChange={onClienteChange}
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAbrirComanda}
              disabled={loadingComanda || !clienteId}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
            >
              <Receipt size={14} />
              {loadingComanda ? "Verificando..." : "Abrir comanda"}
            </button>

            {comandaNumero ? (
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                Comanda #{comandaNumero}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <SearchableSelect
            label="Serviço"
            placeholder="Digite o nome do serviço"
            emptyText="Nenhum serviço encontrado."
            options={servicosOptions}
            value={servicoId}
            onChange={onServicoChange}
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-zinc-700">
            <Clock3 size={13} />
            Hora início
          </label>

          <input
            type="time"
            value={horaInicio}
            onChange={(e) => onHoraInicioChange(e.target.value)}
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
            required
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[220px_1fr]">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
            Status
          </label>

          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as AgendaStatus)}
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
          >
            <option value="confirmado">Confirmado</option>
            <option value="pendente">Pendente</option>
            <option value="atendido">Atendido</option>
            <option value="cancelado">Cancelado</option>
            <option value="aguardando_pagamento">Aguardando pagamento</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
            Observações
          </label>

          <textarea
            value={observacoes}
            onChange={(e) => onObservacoesChange(e.target.value)}
            className="min-h-[88px] w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
            placeholder="Anotações internas"
          />
        </div>
      </div>

      {editingItem ? (
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => onCancelAppointment(editingItem)}
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            Cancelar agendamento
          </button>
        </div>
      ) : null}
    </div>
  );
}