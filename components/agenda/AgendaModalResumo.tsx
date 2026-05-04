"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getAssinaturaUrl } from "@/lib/site-urls";
import { getPlanoMinimoParaRecurso } from "@/lib/plans/catalog";
import { normalizeTimeString } from "@/lib/utils/agenda";
import type { Cliente, Profissional, Servico } from "@/types/agenda";
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
  whatsappLiberado: boolean;
  onChangeWhatsapp: (value: string) => void;
  onAbrirWhatsapp: () => void;
};

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-zinc-900">
        {value}
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-zinc-900">
        {value}
      </div>
    </div>
  );
}

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
  whatsappLiberado,
  onChangeWhatsapp,
  onAbrirWhatsapp,
}: Props) {
  const comunicacaoUpgradeTarget = getPlanoMinimoParaRecurso("whatsapp");

  return (
    <div className="space-y-3">
      <div className="rounded-[20px] border border-zinc-200 bg-white p-3.5 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Resumo
        </div>

        <div className="mt-3 space-y-3">
          <SummaryItem
            label="Profissional"
            value={profissionalSelecionado?.nome || "Selecione"}
          />

          {mode === "agendamento" ? (
            <>
              <SummaryItem
                label="Cliente"
                value={clienteSelecionado?.nome || "Selecione"}
              />
              <SummaryItem
                label="Servico"
                value={servicoSelecionado?.nome || "Selecione"}
              />

              <div className="grid grid-cols-2 gap-2">
                <InfoCard
                  label="Inicio"
                  value={normalizeTimeString(horaInicio)}
                />
                <InfoCard label="Fim" value={horaFimPreview || "--:--"} />
              </div>

              <InfoCard
                label="Duracao"
                value={`${servicoSelecionado?.duracao_minutos ?? 0} min`}
              />
              <InfoCard
                label="Comanda"
                value={comandaNumero ? `#${comandaNumero}` : "Sem comanda"}
              />
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <InfoCard
                  label="Inicio"
                  value={normalizeTimeString(horaInicio)}
                />
                <InfoCard
                  label="Fim"
                  value={normalizeTimeString(horaFimBloqueio)}
                />
              </div>

              <InfoCard
                label="Motivo"
                value={motivoBloqueio || "Sem motivo informado"}
              />
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
              {whatsappLiberado
                ? "A mensagem acompanha o status do agendamento."
                : "A mensagem fica preparada aqui, mas o disparo entra no Pro ou Premium."}
            </p>
          </div>

          <div className="mt-3">
            <textarea
              value={whatsMensagem}
              onChange={(e) => onChangeWhatsapp(e.target.value)}
              className="min-h-[150px] w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm leading-6 text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
            />
          </div>

          {whatsappLiberado ? (
            <button
              type="button"
              onClick={onAbrirWhatsapp}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
            >
              <ExternalLink size={15} />
              Abrir WhatsApp
            </button>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/comparar-planos"
                className="inline-flex flex-1 items-center justify-center rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                Comparar planos
              </Link>
              <Link
                href={getAssinaturaUrl(`/assinatura?plano=${comunicacaoUpgradeTarget}`)}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Fazer upgrade
              </Link>
            </div>
          )}
        </div>
      ) : null}

      <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 p-3.5">
        <div className="text-sm font-semibold text-zinc-800">Dicas rapidas</div>
        <div className="mt-2 text-xs leading-5 text-zinc-500">
          {dicas[dicaIndex]}
        </div>
      </div>
    </div>
  );
}
