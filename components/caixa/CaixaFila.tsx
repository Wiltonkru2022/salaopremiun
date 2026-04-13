"use client";

import { CheckCircle2, Search, XCircle } from "lucide-react";
import { AbaCaixa, AgendamentoFila, ComandaDetalhe, ComandaFila } from "./types";
import { formatCurrency, formatDateTime, getJoinedName } from "./utils";

type Props = {
  aba: AbaCaixa;
  setAba: (value: AbaCaixa) => void;
  busca: string;
  setBusca: (value: string) => void;
  comandasFiltradas: ComandaFila[];
  agendamentosFiltrados: AgendamentoFila[];
  comandasFechadas: ComandaFila[];
  comandasCanceladas: ComandaFila[];
  comandaSelecionada: ComandaDetalhe | null;
  onAbrirComanda: (idComanda: string) => void;
  onAbrirAgendamentoSemComanda: (idAgendamento: string) => void;
};

export default function CaixaFila({
  aba,
  setAba,
  busca,
  setBusca,
  comandasFiltradas,
  agendamentosFiltrados,
  comandasFechadas,
  comandasCanceladas,
  comandaSelecionada,
  onAbrirComanda,
  onAbrirAgendamentoSemComanda,
}: Props) {
  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
        <Search size={16} className="text-zinc-500" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por número, cliente ou serviço"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <button
          onClick={() => setAba("fila")}
          className={`rounded-2xl px-3 py-2 text-sm font-semibold ${
            aba === "fila"
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 bg-white text-zinc-700"
          }`}
        >
          Fila
        </button>

        <button
          onClick={() => setAba("fechadas")}
          className={`rounded-2xl px-3 py-2 text-sm font-semibold ${
            aba === "fechadas"
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 bg-white text-zinc-700"
          }`}
        >
          Fechadas
        </button>

        <button
          onClick={() => setAba("canceladas")}
          className={`rounded-2xl px-3 py-2 text-sm font-semibold ${
            aba === "canceladas"
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 bg-white text-zinc-700"
          }`}
        >
          Canceladas
        </button>
      </div>

      <div className="space-y-3">
        {aba === "fila" && (
          <>
            {comandasFiltradas.map((item) => (
              <button
                key={item.id}
                onClick={() => onAbrirComanda(item.id)}
                className={`w-full rounded-[24px] border p-4 text-left transition ${
                  comandaSelecionada?.id === item.id
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-bold">#{item.numero}</div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${
                      comandaSelecionada?.id === item.id
                        ? "bg-white/15 text-white"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div
                  className={`mt-2 text-sm ${
                    comandaSelecionada?.id === item.id ? "text-zinc-300" : "text-zinc-500"
                  }`}
                >
                  {getJoinedName(item.clientes, "Sem cliente")}
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span>{formatDateTime(item.aberta_em)}</span>
                  <span className="font-semibold">{formatCurrency(item.total)}</span>
                </div>
              </button>
            ))}

            {agendamentosFiltrados.map((item) => (
              <button
                key={item.id}
                onClick={() => onAbrirAgendamentoSemComanda(item.id)}
                className="w-full rounded-[24px] border border-dashed border-zinc-300 bg-zinc-50 p-4 text-left transition hover:bg-zinc-100"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-zinc-900">Agendamento</div>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold uppercase text-amber-700">
                    sem comanda
                  </span>
                </div>

                <div className="mt-2 text-sm font-medium text-zinc-900">
                  {getJoinedName(item.clientes, "Sem cliente")}
                </div>

                <div className="mt-1 text-sm text-zinc-500">
                  {getJoinedName(item.servicos as any, "Serviço")}
                </div>

                <div className="mt-3 flex items-center justify-between text-sm text-zinc-500">
                  <span>
                    {item.data} • {item.hora_inicio}
                  </span>
                  <span className="font-semibold text-zinc-900">
                    {formatCurrency(
                      Number(
                        (Array.isArray(item.servicos) ? item.servicos[0] : item.servicos)?.preco || 0
                      )
                    )}
                  </span>
                </div>
              </button>
            ))}

            {comandasFiltradas.length === 0 && agendamentosFiltrados.length === 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
                Nada encontrado na fila do caixa.
              </div>
            )}
          </>
        )}

        {aba === "fechadas" && (
          <>
            {comandasFechadas.map((item) => (
              <button
                key={item.id}
                onClick={() => onAbrirComanda(item.id)}
                className="w-full rounded-[24px] border border-zinc-200 bg-white p-4 text-left transition hover:bg-zinc-50"
              >
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-zinc-900">#{item.numero}</div>
                  <CheckCircle2 size={18} className="text-emerald-600" />
                </div>
                <div className="mt-2 text-sm text-zinc-500">
                  {getJoinedName(item.clientes, "Sem cliente")}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-zinc-500">{formatCurrency(item.total)}</span>
                  <span className="font-medium text-zinc-700">Fechada</span>
                </div>
              </button>
            ))}

            {comandasFechadas.length === 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
                Nenhuma comanda fechada hoje.
              </div>
            )}
          </>
        )}

        {aba === "canceladas" && (
          <>
            {comandasCanceladas.map((item) => (
              <button
                key={item.id}
                onClick={() => onAbrirComanda(item.id)}
                className="w-full rounded-[24px] border border-zinc-200 bg-white p-4 text-left transition hover:bg-zinc-50"
              >
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-zinc-900">#{item.numero}</div>
                  <XCircle size={18} className="text-rose-600" />
                </div>
                <div className="mt-2 text-sm text-zinc-500">
                  {getJoinedName(item.clientes, "Sem cliente")}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-zinc-500">{formatCurrency(item.total)}</span>
                  <span className="font-medium text-zinc-700">Cancelada</span>
                </div>
              </button>
            ))}

            {comandasCanceladas.length === 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
                Nenhuma comanda cancelada.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}