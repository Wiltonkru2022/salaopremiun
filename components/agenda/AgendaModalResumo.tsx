"use client";

import { ExternalLink } from "lucide-react";
import { normalizeTimeString } from "@/lib/utils/agenda";
import type {
  Cliente,
  Profissional,
  Servico,
} from "@/types/agenda";
import type { AgendaModalMode } from "./useAgendaModal";

type Props = {
  mode: AgendaModalMode;
  profissionalSelecionado?: Profissional;
  clienteSelecionado?: Cliente;
  servicoSelecionado?: Servico;
  horaInicio: string;
  horaFimPreview: string | null;
  horaFimBloqueio: string;
  motivoBloqueio: string;
  comandaNumero: number | null;
  whatsMensagem: string;
  dicas: string[];
  dicaIndex: number;
  tituloWhatsapp: string;
  onChangeWhatsapp: (value: string) => void;
  onAbrirWhatsapp: () => void;
};

export default function AgendaModalResumo({
  mode,
  profissionalSelecionado,
  clienteSelecionado,
  servicoSelecionado,
  horaInicio,
  horaFimPreview,
  horaFimBloqueio,
  motivoBloqueio,
  comandaNumero,
  whatsMensagem,
  dicas,
  dicaIndex,
  tituloWhatsapp,
  onChangeWhatsapp,
  onAbrirWhatsapp,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded-[20px] border border-zinc-200 bg-white p-3.5 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Resumo
        </div>

        <div className="mt-3 space-y-3">
          <div>
            <div className="text-[11px] text-zinc-500">Profissional</div>
            <div className="mt-1 text-sm font-semibold text-zinc-900">
              {profissionalSelecionado?.nome || "Selecione"}
            </div>
          </div>

          {mode === "agendamento" ? (
            <>
              <div>
                <div className="text-[11px] text-zinc-500">Cliente</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">
                  {clienteSelecionado?.nome || "Selecione"}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-zinc-500">Serviço</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">
                  {servicoSelecionado?.nome || "Selecione"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Início
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zinc-900">
                    {normalizeTimeString(horaInicio)}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Fim
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zinc-900">
                    {horaFimPreview || "--:--"}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                  Duração
                </div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">
                  {servicoSelecionado?.duracao_minutos ?? 0} min
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                  Comanda
                </div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">
                  {comandaNumero ? `#${comandaNumero}` : "Sem comanda"}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Início
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zinc-900">
                    {normalizeTimeString(horaInicio)}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Fim
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zinc-900">
                    {normalizeTimeString(horaFimBloqueio)}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                  Motivo
                </div>
                <div className="mt-1 text-sm font-medium text-zinc-900">
                  {motivoBloqueio || "Sem motivo informado"}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {mode === "agendamento" ? (
        <div className="rounded-[20px] border border-zinc-200 bg-white p-3.5 shadow-sm">
          <div>
            <div className="text-sm font-semibold text-zinc-800">
              {tituloWhatsapp}
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              A mensagem acompanha o status do agendamento.
            </p>
          </div>

          <div className="mt-3">
            <textarea
              value={whatsMensagem}
              onChange={(e) => onChangeWhatsapp(e.target.value)}
              className="min-h-[150px] w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
            />
          </div>

          <button
            type="button"
            onClick={onAbrirWhatsapp}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
          >
            <ExternalLink size={15} />
            Abrir WhatsApp
          </button>
        </div>
      ) : null}

      <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 p-3.5">
        <div className="text-sm font-semibold text-zinc-800">Dicas rápidas</div>
        <div className="mt-2 text-xs leading-5 text-zinc-500">
          {dicas[dicaIndex]}
        </div>
      </div>
    </div>
  );
}