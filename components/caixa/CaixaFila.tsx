"use client";

import type { ReactNode } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Search,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
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
  comandaCarregandoId: string | null;
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
  comandaCarregandoId,
  onAbrirComanda,
  onAbrirAgendamentoSemComanda,
}: Props) {
  const totalFila = comandasFiltradas.length + agendamentosFiltrados.length;

  return (
    <section className="flex min-h-0 flex-col rounded-[26px] border border-slate-200 bg-white p-3.5 shadow-[0_16px_32px_rgba(148,163,184,0.09)]">
      <div className="shrink-0 space-y-2.5">
        <div>
          <h2 className="text-[1.55rem] font-bold tracking-[-0.03em] text-slate-950">
            Triagem
          </h2>
          <p className="mt-1 text-[12px] text-slate-500">
            Abra rapido a comanda certa e siga sem ruido.
          </p>
        </div>

        <div className="flex gap-3">
          <label className="flex h-11 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5">
            <Search size={18} className="text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por numero, cliente ou servico..."
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
            aria-label="Filtros"
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <TabButton
            active={aba === "fila"}
            count={totalFila}
            label="Fila"
            onClick={() => setAba("fila")}
          />
          <TabButton
            active={aba === "fechadas"}
            count={comandasFechadas.length}
            label="Fechadas"
            onClick={() => setAba("fechadas")}
          />
          <TabButton
            active={aba === "canceladas"}
            count={comandasCanceladas.length}
            label="Canceladas"
            onClick={() => setAba("canceladas")}
          />
        </div>
      </div>

      <div className="mt-2.5 min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-2">
          {aba === "fila" ? (
            <>
              {comandasFiltradas.map((item) => (
                <ComandaFilaCard
                  key={item.id}
                  item={item}
                  selecionada={comandaSelecionada?.id === item.id}
                  carregando={comandaCarregandoId === item.id}
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

              {totalFila === 0 ? (
                <EmptyCard text="Nenhum atendimento encontrado na triagem." />
              ) : null}
            </>
          ) : null}

          {aba === "fechadas" ? (
            <>
              {comandasFechadas.map((item) => (
                <HistoricoCard
                  key={item.id}
                  icon={<CheckCircle2 size={18} className="text-emerald-600" />}
                  item={item}
                  label="Fechada"
                  onClick={() => onAbrirComanda(item.id)}
                />
              ))}
              {comandasFechadas.length === 0 ? (
                <EmptyCard text="Nenhuma comanda fechada por enquanto." />
              ) : null}
            </>
          ) : null}

          {aba === "canceladas" ? (
            <>
              {comandasCanceladas.map((item) => (
                <HistoricoCard
                  key={item.id}
                  icon={<XCircle size={18} className="text-rose-600" />}
                  item={item}
                  label="Cancelada"
                  onClick={() => onAbrirComanda(item.id)}
                />
              ))}
              {comandasCanceladas.length === 0 ? (
                <EmptyCard text="Nenhuma comanda cancelada por enquanto." />
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-2.5 flex shrink-0 items-center justify-between border-t border-slate-100 px-1 pt-2.5 text-[12px] text-slate-500">
        <span>{totalFila} comandas</span>
        <span>Atualizado agora</span>
      </div>
    </section>
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
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-2 text-left transition ${
        active
          ? "border-slate-900 bg-slate-950 text-white"
          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold leading-none">{count}</div>
    </button>
  );
}

function ComandaFilaCard({
  item,
  selecionada,
  carregando,
  onClick,
}: {
  item: ComandaFila;
  selecionada: boolean;
  carregando: boolean;
  onClick: () => void;
}) {
  const status = getStatusCaixaMeta(item.status);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[20px] border p-3 text-left transition ${
        selecionada
          ? "border-emerald-300 bg-emerald-50/70 shadow-[0_14px_26px_rgba(16,185,129,0.10)]"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[1.55rem] font-bold leading-none tracking-[-0.04em] text-slate-950">
            #{item.numero}
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase ${status.badgeClass}`}
          >
            {status.label}
          </span>
        </div>
        <ChevronRight size={18} className="mt-1 text-slate-400" />
      </div>

      <div className="mt-2.5 text-[15px] font-semibold text-slate-950">
        {getJoinedName(item.clientes, "Sem cliente")}
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <span className="text-slate-500">
          {carregando ? "Abrindo comanda..." : `Aberta em ${formatShortDateTime(item.aberta_em)}`}
        </span>
        <span className="font-semibold text-emerald-700">
          {formatCurrency(item.total)}
        </span>
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
      type="button"
      onClick={onClick}
      className="w-full rounded-[20px] border border-amber-200 bg-amber-50/70 p-3 text-left transition hover:bg-amber-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
          <CalendarClock size={16} />
          Agenda sem comanda
        </div>
        <ChevronRight size={18} className="text-amber-500" />
      </div>

      <div className="mt-2.5 text-[15px] font-semibold text-slate-950">
        {getJoinedName(item.clientes, "Sem cliente")}
      </div>
      <div className="mt-1 text-[13px] text-slate-500">
        {getJoinedName(item.servicos, "Servico")}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <span className="text-slate-500">
          {item.data} as {item.hora_inicio}
        </span>
        <span className="font-semibold text-amber-700">
          {formatCurrency(Number(servico?.preco || 0))}
        </span>
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
      type="button"
      onClick={onClick}
      className="w-full rounded-[20px] border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </div>
          <div className="mt-1 text-[1.55rem] font-bold leading-none tracking-[-0.04em] text-slate-950">
            #{item.numero}
          </div>
        </div>
        {icon}
      </div>

      <div className="mt-2.5 text-[15px] font-semibold text-slate-900">
        {getJoinedName(item.clientes, "Sem cliente")}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3 text-[13px]">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-700">
          {formatCurrency(item.total)}
        </span>
      </div>
    </button>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
