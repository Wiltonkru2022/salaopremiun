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
  return (
    <div className="flex h-full min-h-0 flex-col rounded-[22px] border border-zinc-200 bg-white p-2.5 shadow-sm">
      <div className="shrink-0 space-y-2">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Triagem do caixa
          </div>
          <div className="mt-0.5 text-[1.35rem] font-bold leading-none text-zinc-950">
            Triagem
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2">
          <Search size={14} className="text-zinc-500" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por número, cliente ou serviço"
            className="w-full bg-transparent text-xs outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-1.5">
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

              {comandasFiltradas.length === 0 && agendamentosFiltrados.length === 0 ? (
                <EmptyCard text="Nenhum atendimento encontrado na fila." />
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
                <EmptyCard text="Nenhuma comanda fechada por enquanto." />
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
                <EmptyCard text="Nenhuma comanda cancelada por enquanto." />
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
      className={`rounded-xl border px-2.5 py-2 text-left transition ${
        active
          ? "border-zinc-900 bg-zinc-950 text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.12em] opacity-70">{label}</div>
      <div className="mt-0.5 text-lg font-bold">{count}</div>
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
      onClick={onClick}
      className={`w-full rounded-[18px] border p-2.5 text-left transition ${
        selecionada
          ? "border-zinc-950 bg-zinc-950 text-white shadow-lg"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
            Comanda
          </div>
          <div className="mt-0.5 text-xl font-bold">#{item.numero}</div>
        </div>

        <span
          className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase ${
            selecionada ? "border-white/15 bg-white/10 text-white" : status.badgeClass
          }`}
        >
          {status.label}
        </span>
      </div>

      <div
        className={`mt-2 break-words text-sm font-semibold leading-5 ${
          selecionada ? "text-white" : "text-zinc-900"
        }`}
      >
        {getJoinedName(item.clientes, "Sem cliente")}
      </div>

      <div
        className={`mt-0.5 break-words text-xs leading-4 ${
          selecionada ? "text-zinc-300" : "text-zinc-500"
        }`}
      >
        {carregando ? (
          <span className="inline-flex items-center gap-1" aria-label="Abrindo comanda">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
          </span>
        ) : (
          status.description
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
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
      className="w-full rounded-[18px] border border-amber-200 bg-amber-50/60 p-2.5 text-left transition hover:bg-amber-50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
          <CalendarClock size={14} />
          <span>Agenda sem comanda</span>
        </div>
        <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase text-amber-800">
          Abrir no caixa
        </span>
      </div>

      <div className="mt-2 break-words text-sm font-semibold leading-5 text-zinc-950">
        {getJoinedName(item.clientes, "Sem cliente")}
      </div>
      <div className="mt-0.5 break-words text-xs leading-4 text-zinc-600">
        {getJoinedName(item.servicos, "Serviço")}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        <MetaCard label="Horário" value={`${item.data} - ${item.hora_inicio}`} />
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
      className="w-full rounded-[18px] border border-zinc-200 bg-white p-2.5 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {label}
          </div>
          <div className="mt-0.5 text-xl font-bold text-zinc-950">#{item.numero}</div>
        </div>
        {icon}
      </div>

      <div className="mt-2 break-words text-sm font-semibold leading-5 text-zinc-900">
        {getJoinedName(item.clientes, "Sem cliente")}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
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
      className={`rounded-xl border px-2 py-1.5 ${
        selected
          ? "border-white/10 bg-white/5 text-white"
          : "border-zinc-200 bg-zinc-50 text-zinc-900"
      }`}
    >
      <div
        className={`text-[9px] uppercase tracking-[0.12em] ${
          selected ? "text-zinc-400" : "text-zinc-500"
        }`}
      >
        {label}
      </div>
      <div className="mt-0.5 break-words text-xs font-semibold leading-4">{value}</div>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-6 text-center text-xs text-zinc-500">
      {text}
    </div>
  );
}
