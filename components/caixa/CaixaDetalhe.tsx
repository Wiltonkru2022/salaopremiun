"use client";

import type { ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  WalletCards,
} from "lucide-react";
import { ComandaDetalhe, ComandaItem } from "./types";
import {
  formatCurrency,
  formatDateTime,
  getJoinedName,
  getStatusCaixaMeta,
  getTipoItemLabel,
} from "./utils";
import { parseComboDisplayMeta } from "@/lib/combo/display";

type Props = {
  comandaSelecionada: ComandaDetalhe | null;
  comandaCarregandoId: string | null;
  itens: ComandaItem[];
  saving: boolean;
  faltaReceber: number;
  onAbrirPagamento: () => void;
  onCancelarComanda: () => void;
  onFinalizarComanda: () => void;
  onNovoServico: () => void;
  onEditarItem: (item: ComandaItem) => void;
  onRemoverItem: (idItem: string) => void;
};

export default function CaixaDetalhe({
  comandaSelecionada,
  comandaCarregandoId,
  itens,
  saving,
  faltaReceber,
  onAbrirPagamento,
  onCancelarComanda,
  onFinalizarComanda,
  onNovoServico,
  onEditarItem,
  onRemoverItem,
}: Props) {
  if (!comandaSelecionada) {
    return (
      <section className="flex min-h-0 flex-col rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(148,163,184,0.12)]">
        <div className="flex min-h-[560px] flex-1 items-center justify-center rounded-[26px] border border-dashed border-slate-300 bg-slate-50 text-center">
          <div>
            <Receipt className="mx-auto mb-4 text-slate-400" size={34} />
            <div className="text-2xl font-bold tracking-[-0.03em] text-slate-900">
              Selecione uma comanda
            </div>
            <div className="mt-2 text-sm text-slate-500">
              Escolha a venda na triagem para abrir itens e pagamento.
            </div>
          </div>
        </div>
      </section>
    );
  }

  const status = getStatusCaixaMeta(comandaSelecionada.status);
  const podeEditar =
    comandaSelecionada.status !== "fechada" &&
    comandaSelecionada.status !== "cancelada";
  const carregandoDetalhe = comandaCarregandoId === comandaSelecionada.id;

  return (
    <section className="flex min-h-0 flex-col rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(148,163,184,0.12)]">
      <div className="shrink-0">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[2.2rem] font-bold tracking-[-0.04em] text-slate-950">
                Comanda #{comandaSelecionada.numero}
              </h2>
              <span
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase ${status.badgeClass}`}
              >
                {status.label}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {carregandoDetalhe
                ? "Atualizando dados da comanda..."
                : `Aberta em ${formatDateTime(comandaSelecionada.aberta_em)}`}
            </p>
          </div>

          {podeEditar ? (
            <div className="flex flex-wrap gap-3">
              <ActionButton icon={<WalletCards size={16} />} onClick={onAbrirPagamento}>
                Pagamento
              </ActionButton>
              <ActionButton icon={<Plus size={16} />} onClick={onNovoServico}>
                Lancar item manual
              </ActionButton>
              <ActionButton
                danger
                icon={<Trash2 size={16} />}
                onClick={onCancelarComanda}
              >
                Cancelar venda
              </ActionButton>
              <button
                type="button"
                onClick={onFinalizarComanda}
                disabled={saving || faltaReceber > 0}
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                Finalizar venda
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-4">
          <InfoCard
            icon={<Receipt size={16} />}
            label="Cliente"
            value={getJoinedName(comandaSelecionada.clientes, "Sem cliente")}
          />
          <InfoCard
            icon={<CalendarDays size={16} />}
            label="Abertura"
            value={formatDateTime(comandaSelecionada.aberta_em)}
          />
          <InfoCard
            icon={<Receipt size={16} />}
            label="Itens"
            value={String(itens.length)}
          />
          <InfoCard
            accent={faltaReceber > 0 ? "emerald" : "slate"}
            label="Falta a receber"
            value={formatCurrency(faltaReceber)}
          />
        </div>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
        <div className="rounded-[26px] border border-slate-200">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-xl font-bold tracking-[-0.02em] text-slate-950">
              Itens da comanda
            </h3>
          </div>

          {itens.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[minmax(260px,1.6fr)_120px_120px_130px_120px] gap-4 border-b border-slate-100 px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  <span>Servico</span>
                  <span>Tipo</span>
                  <span>Qtd.</span>
                  <span>Unitario</span>
                  <span>Total</span>
                </div>

                {itens.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[minmax(260px,1.6fr)_120px_120px_130px_120px] gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {parseComboDisplayMeta(item.descricao).displayTitle}
                      </div>
                      <div className="mt-1 truncate text-sm text-slate-500">
                        {getJoinedName(item.profissionais, "Sem profissional")}
                      </div>
                    </div>
                    <div className="text-sm text-slate-600">
                      {getTipoItemLabel(item.tipo_item)}
                    </div>
                    <div className="text-sm font-medium text-slate-700">
                      {Number(item.quantidade || 0)}
                    </div>
                    <div className="text-sm font-medium text-slate-700">
                      {formatCurrency(item.valor_unitario)}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCurrency(item.valor_total)}
                      </span>
                      {podeEditar ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEditarItem(item)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                            title="Editar item"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoverItem(item.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                            title="Remover item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <div className="text-base font-semibold text-slate-800">
                Nenhum item nesta comanda.
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Adicione servicos, produtos ou extras para seguir com o fechamento.
              </div>
            </div>
          )}
        </div>

        {faltaReceber > 0 ? (
          <div className="mt-4 flex items-start gap-3 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <CircleAlert size={18} className="mt-0.5 shrink-0" />
            <div>
              Ainda faltam <strong>{formatCurrency(faltaReceber)}</strong> para concluir
              esta comanda.
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ActionButton({
  children,
  danger = false,
  icon,
  onClick,
}: {
  children: string;
  danger?: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-12 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
        danger
          ? "border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function InfoCard({
  icon,
  label,
  value,
  accent = "slate",
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  accent?: "emerald" | "slate";
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={`mt-3 text-[1.85rem] font-bold leading-none tracking-[-0.04em] ${
          accent === "emerald" ? "text-emerald-700" : "text-slate-950"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
