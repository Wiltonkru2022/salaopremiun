"use client";

import { AlertCircle, Clock3 } from "lucide-react";
import SearchableSelect, {
  type SearchableOption,
} from "@/components/ui/SearchableSelect";

type Props = {
  profissionaisOptions: SearchableOption[];
  profissionalId: string;
  horaInicio: string;
  horaFimBloqueio: string;
  motivoBloqueio: string;
  onProfissionalChange: (value: string) => void;
  onHoraInicioChange: (value: string) => void;
  onHoraFimChange: (value: string) => void;
  onMotivoChange: (value: string) => void;
};

export default function AgendaModalFormBloqueio({
  profissionaisOptions,
  profissionalId,
  horaInicio,
  horaFimBloqueio,
  motivoBloqueio,
  onProfissionalChange,
  onHoraInicioChange,
  onHoraFimChange,
  onMotivoChange,
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

        <div className="rounded-[18px] border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <AlertCircle size={14} />
            Período indisponível
          </div>

          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Use para almoço, manutenção, reunião, curso ou pausa do profissional.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
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

        <div>
          <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-zinc-700">
            <Clock3 size={13} />
            Hora fim
          </label>

          <input
            type="time"
            value={horaFimBloqueio}
            onChange={(e) => onHoraFimChange(e.target.value)}
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:bg-white"
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
          placeholder="Ex.: almoço, curso, reunião"
        />
      </div>
    </div>
  );
}