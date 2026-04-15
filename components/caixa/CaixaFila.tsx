"use client";

import type { ReactNode } from "react";
import { CalendarClock, CheckCircle2, Search, XCircle } from "lucide-react";
import { AbaCaixa, AgendamentoFila, ComandaDetalhe, ComandaFila } from "./types";
import {
  formatCurrency,
  formatShortDateTime,
  getJoinedName,
  getStatusCaixaMeta,
} from "./utils";

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
    <div className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm xl:sticky xl:top-6">
      <div className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Triagem do caixa
          </div>
          <div className="mt-2 text-xl font-bold text-zinc-950">
            Fila e historico rapido
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            Selecione uma comanda ativa ou abra um agendamento direto no caixa.
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
          <Search size={16} className="text-zinc-500" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por numero, cliente ou servico"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <TabButton
            active={aba === "fila"}
            label="Fila"
            count={comandasFiltradas.length + agendamentosFiltrados.length}
            onClick={() => setAba("fila")}
          />
          <TabButton
            active={aba === "fechadas"}
            label="Fechadas"
            count={comandasFechadas.length}
            onClick={() => setAba("fechadas")}
          />
          <TabButton
            active={aba === "canceladas"}
            label="Canceladas"
            count={comandasCanceladas.length}
            onClick={() => setAba("canceladas")}
          />
        </div>

        <div className="space-y-3 xl:max-h-[calc(100vh-18rem)] xl:overflow-y-auto xl:pr-1">
          {aba === "fila" ? (
            <>
              {comandasFiltradas.map((item) => (
                <ComandaFilaCard
                  key={item.id}
                  item={item}
                  selecionada={comandaSelecionada?.id === item.id}
                  onClick={() => onAbrirComanda(item.id)}
                />
              ))}

              {agendamentosFiltrados.map((item) => (
                <AgendamentoFilaCard
                  key={item.id}
                  item={item}
                  onClick={() => onAbrirAgendamentoSemComanda(item.id)}
                />
              ))}

              {comandasFiltradas.length === 0 && agendamentosFiltrados.length === 0 ? (
                <EmptyCard text="Nada encontrado na fila do caixa." />
              ) : null}
            </>
          ) : null}

          {aba === "fechadas" ? (
            <>
              {comandasFechadas.map((item) => (
                <HistoricoCard
                  key={item.id}
                  item={item}
                  icon={<CheckCircle2 size={18} className="text-emerald-600" />}
                  label="Fechada"
                  onClick={() => onAbrirComanda(item.id)}
                />
              ))}

              {comandasFechadas.length === 0 ? (
                <EmptyCard text="Nenhuma comanda fechada hoje." />
              ) : null}
            </>
          ) : null}

          {aba === "canceladas" ? (
            <>
              {comandasCanceladas.map((item) => (
                <HistoricoCard
                  key={item.id}
                  item={item}
                  icon={<XCircle size={18} className="text-rose-600" />}
                  label="Cancelada"
                  onClick={() => onAbrirComanda(item.id)}
                />
              ))}

              {comandasCanceladas.length === 0 ? (
                <EmptyCard text="Nenhuma comanda cancelada." />
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border px-3 py-3 text-left transition ${
        active
          ? "border-zinc-900 bg-zinc-950 text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      <div className="text-xs uppercase tracking-[0.14em] opacity-70">{label}</div>
      <div className="mt-1 text-xl font-bold">{count}</div>
    </button>
  );
}

function ComandaFilaCard({
  item,
  selecionada,
  onClick,
}: {
  item: ComandaFila;
  selecionada: boolean;
  onClick: () => void;
}) {
  const status = getStatusCaixaMeta(item.status);

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-[24px] border p-4 text-left transition ${
        selecionada
          ? "border-zinc-950 bg-zinc-950 text-white shadow-lg"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
            Comanda
          </div>
          <div className="mt-1 text-2xl font-bold">#{item.numero}</div>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase ${
            selecionada ? "border-white/15 bg-white/10 text-white" : status.badgeClass
          }`}
        >
          {status.label}
        </span>
      </div>

      <div
        className={`mt-3 text-base font-semibold ${
          selecionada ? "text-white" : "text-zinc-900"
        }`}
      >
        {getJoinedName(item.clientes, "Sem cliente")}
      </div>

      <div className={`mt-1 text-sm ${selecionada ? "text-zinc-300" : "text-zinc-500"}`}>
        {status.description}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MetaCard
          label="Aberta"
          value={formatShortDateTime(item.aberta_em)}
          selected={selecionada}
        />
        <MetaCard
          label="Total atual"
          value={formatCurrency(item.total)}
          selected={selecionada}
        />
      </div>
    </button>
  );
}

function AgendamentoFilaCard({
  item,
  onClick,
}: {
  item: AgendamentoFila;
  onClick: () => void;
}) {
  const servico = Array.isArray(item.servicos) ? item.servicos[0] : item.servicos;

  return (
    <button
      onClick={onClick}
      className="w-full rounded-[24px] border border-amber-200 bg-amber-50/60 p-4 text-left transition hover:bg-amber-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <CalendarClock size={16} />
          <span>Agenda sem comanda</span>
        </div>
        <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase text-amber-800">
          Abrir no caixa
        </span>
      </div>

      <div className="mt-3 text-base font-semibold text-zinc-950">
        {getJoinedName(item.clientes, "Sem cliente")}
      </div>
      <div className="mt-1 text-sm text-zinc-600">
        {getJoinedName(item.servicos, "Servico")}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MetaCard label="Horario" value={`${item.data} - ${item.hora_inicio}`} />
        <MetaCard label="Valor previsto" value={formatCurrency(Number(servico?.preco || 0))} />
      </div>
    </button>
  );
}

function HistoricoCard({
  item,
  icon,
  label,
  onClick,
}: {
  item: ComandaFila;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-[24px] border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {label}
          </div>
          <div className="mt-1 text-2xl font-bold text-zinc-950">#{item.numero}</div>
        </div>
        {icon}
      </div>

      <div className="mt-3 text-base font-semibold text-zinc-900">
        {getJoinedName(item.clientes, "Sem cliente")}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MetaCard label="Movimento" value={label} />
        <MetaCard label="Total" value={formatCurrency(item.total)} />
      </div>
    </button>
  );
}

function MetaCard({
  label,
  selected = false,
  value,
}: {
  label: string;
  selected?: boolean;
  value: string;
}) {
  return (
    <div
      className={`rounded-2xl border px-3 py-3 ${
        selected
          ? "border-white/10 bg-white/5 text-white"
          : "border-zinc-200 bg-zinc-50 text-zinc-900"
      }`}
    >
      <div
        className={`text-[11px] uppercase tracking-[0.14em] ${
          selected ? "text-zinc-400" : "text-zinc-500"
        }`}
      >
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
      {text}
    </div>
  );
}
