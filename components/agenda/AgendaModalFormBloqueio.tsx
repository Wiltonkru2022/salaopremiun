"use client";

import { AlertCircle, CalendarDays, Clock3 } from "lucide-react";
import SearchableSelect, {
  type SearchableOption,
} from "@/components/ui/SearchableSelect";
import type { Bloqueio } from "@/types/agenda";

type Props = {
  profissionaisOptions: SearchableOption[];
  profissionalId: string;
  editingBlock?: Bloqueio | null;
  dataBloqueio: string;
  datasBloqueio: string[];
  bloquearDiaTodo: boolean;
  horaInicio: string;
  horaFimBloqueio: string;
  motivoBloqueio: string;
  onProfissionalChange: (value: string) => void;
  onDataChange: (value: string) => void;
  onAdicionarData: () => void;
  onRemoverData: (value: string) => void;
  onBloquearDiaTodoChange: (value: boolean) => void;
  onHoraInicioChange: (value: string) => void;
  onHoraFimChange: (value: string) => void;
  onMotivoChange: (value: string) => void;
};

export default function AgendaModalFormBloqueio({
  profissionaisOptions,
  profissionalId,
  editingBlock,
  dataBloqueio,
  datasBloqueio,
  bloquearDiaTodo,
  horaInicio,
  horaFimBloqueio,
  motivoBloqueio,
  onProfissionalChange,
  onDataChange,
  onAdicionarData,
  onRemoverData,
  onBloquearDiaTodoChange,
  onHoraInicioChange,
  onHoraFimChange,
  onMotivoChange,
}: Props) {
  return (
    <div className="space-y-3.5">
      <div className="grid gap-3">
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

        <div className="rounded-[18px] border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <AlertCircle size={14} />
            Periodo indisponivel
          </div>

          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Use para almoco, manutencao, reuniao, curso ou pausa do profissional.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-zinc-700">
            <CalendarDays size={13} />
            {editingBlock ? "Data do bloqueio" : "Data base do bloqueio"}
          </label>

          <div className="flex gap-2">
            <input
              type="date"
              value={dataBloqueio}
              onChange={(e) => onDataChange(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
              required
            />
            {!editingBlock ? (
              <button
                type="button"
                onClick={onAdicionarData}
                className="shrink-0 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Adicionar
              </button>
            ) : null}
          </div>

          {!editingBlock ? (
            <div className="mt-2">
              <p className="text-xs leading-5 text-zinc-500">
                Adicione quantos dias quiser para repetir o mesmo bloqueio.
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {datasBloqueio.length ? (
                  datasBloqueio.map((data) => (
                    <button
                      key={data}
                      type="button"
                      onClick={() => onRemoverData(data)}
                      className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                    >
                      {data} x
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-zinc-400">Nenhuma data adicionada.</span>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <label className="flex items-center gap-2 rounded-[18px] border border-zinc-200 bg-white px-3 py-3 text-sm font-semibold text-zinc-700">
            <input
              type="checkbox"
              checked={bloquearDiaTodo}
              onChange={(e) => onBloquearDiaTodoChange(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            />
            Bloquear dia todo
          </label>

          <p className="mt-1.5 text-xs leading-5 text-zinc-500">
            Usa automaticamente o inicio e o fim do expediente configurado para esse dia.
          </p>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-zinc-700">
            <Clock3 size={13} />
            Hora inicio
          </label>

          <input
            type="time"
            value={horaInicio}
            onChange={(e) => onHoraInicioChange(e.target.value)}
            disabled={bloquearDiaTodo}
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-zinc-700">
            <Clock3 size={13} />
            Hora fim
          </label>

          <input
            type="time"
            value={horaFimBloqueio}
            onChange={(e) => onHoraFimChange(e.target.value)}
            disabled={bloquearDiaTodo}
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
          Motivo do bloqueio
        </label>

        <textarea
          value={motivoBloqueio}
          onChange={(e) => onMotivoChange(e.target.value)}
          className="min-h-[100px] w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
          placeholder="Ex.: almoco, curso, reuniao"
        />
      </div>
    </div>
  );
}
