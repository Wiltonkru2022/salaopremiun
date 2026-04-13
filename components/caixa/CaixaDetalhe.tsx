"use client";

import { Pencil, Plus, Receipt, Scissors, ShoppingBag, Trash2, WalletCards } from "lucide-react";
import { ComandaDetalhe, ComandaItem } from "./types";
import {
  formatCurrency,
  formatDateTime,
  getJoinedName,
  tipoItemIcon,
} from "./utils";

type Props = {
  comandaSelecionada: ComandaDetalhe | null;
  itens: ComandaItem[];
  saving: boolean;
  faltaReceber: number;
  onCancelarComanda: () => void;
  onFinalizarComanda: () => void;
  onNovoServico: () => void;
  onNovoProduto: () => void;
  onNovoExtra: () => void;
  onNovoAjuste: () => void;
  onEditarItem: (item: ComandaItem) => void;
  onRemoverItem: (idItem: string) => void;
};

export default function CaixaDetalhe({
  comandaSelecionada,
  itens,
  saving,
  faltaReceber,
  onCancelarComanda,
  onFinalizarComanda,
  onNovoServico,
  onNovoProduto,
  onNovoExtra,
  onNovoAjuste,
  onEditarItem,
  onRemoverItem,
}: Props) {
  if (!comandaSelecionada) {
    return (
      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex h-full min-h-[520px] items-center justify-center rounded-[24px] border border-dashed border-zinc-300 bg-zinc-50 text-center">
          <div>
            <Receipt className="mx-auto mb-3 text-zinc-400" size={32} />
            <div className="text-lg font-semibold text-zinc-800">
              Selecione uma comanda
            </div>
            <div className="mt-1 text-sm text-zinc-500">
              Escolha uma comanda da fila ou abra um agendamento sem comanda.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const podeEditar =
    comandaSelecionada.status !== "fechada" &&
    comandaSelecionada.status !== "cancelada";

  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="space-y-5">
        <div className="rounded-[24px] border border-zinc-200 bg-gradient-to-r from-zinc-50 to-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Comanda
              </div>
              <h2 className="mt-2 text-3xl font-bold text-zinc-900">
                #{comandaSelecionada.numero}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
                <span>
                  Cliente: {getJoinedName(comandaSelecionada.clientes, "Sem cliente")}
                </span>
                <span>•</span>
                <span>Status: {comandaSelecionada.status}</span>
                <span>•</span>
                <span>Aberta em: {formatDateTime(comandaSelecionada.aberta_em)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              {podeEditar ? (
                <>
                  <button
                    type="button"
                    onClick={onCancelarComanda}
                    disabled={saving}
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={onFinalizarComanda}
                    disabled={saving || faltaReceber > 0}
                    className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-50"
                  >
                    Finalizar comanda
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {podeEditar ? (
          <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-3 text-sm font-semibold text-zinc-800">
              Lançar item manual
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <button
                type="button"
                onClick={onNovoServico}
                className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
              >
                <Scissors size={16} />
                Serviço
              </button>

              <button
                type="button"
                onClick={onNovoProduto}
                className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
              >
                <ShoppingBag size={16} />
                Produto
              </button>

              <button
                type="button"
                onClick={onNovoExtra}
                className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
              >
                <WalletCards size={16} />
                Extra
              </button>

              <button
                type="button"
                onClick={onNovoAjuste}
                className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
              >
                <Plus size={16} />
                Ajuste
              </button>
            </div>
          </div>
        ) : null}

        <div className="rounded-[24px] border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-5 py-4">
            <div className="text-lg font-bold text-zinc-900">Itens da comanda</div>
            <div className="mt-1 text-sm text-zinc-500">
              Serviços, produtos, extras e ajustes lançados nesta cobrança.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-3">Item</th>
                  <th className="px-5 py-3">Profissional</th>
                  <th className="px-5 py-3">Assistente</th>
                  <th className="px-5 py-3">Qtd</th>
                  <th className="px-5 py-3">Unit.</th>
                  <th className="px-5 py-3">Total</th>
                  {podeEditar ? <th className="px-5 py-3 text-right">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-100 last:border-b-0">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-zinc-600">
                          {tipoItemIcon(item.tipo_item)}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900">{item.descricao}</div>
                          <div className="text-xs uppercase text-zinc-500">{item.tipo_item}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-zinc-700">
                      {getJoinedName(item.profissionais, "-")}
                    </td>

                    <td className="px-5 py-4 text-sm text-zinc-700">
                      {getJoinedName(item.assistente_ref, "-")}
                    </td>

                    <td className="px-5 py-4 text-sm text-zinc-700">
                      {Number(item.quantidade || 0)}
                    </td>

                    <td className="px-5 py-4 text-sm text-zinc-700">
                      {formatCurrency(item.valor_unitario)}
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-zinc-900">
                      {formatCurrency(item.valor_total)}
                    </td>

                    {podeEditar ? (
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onEditarItem(item)}
                            className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-700 transition hover:bg-zinc-100"
                            title="Editar item"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => onRemoverItem(item.id)}
                            className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                            title="Remover item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}

                {itens.length === 0 && (
                  <tr>
                    <td
                      colSpan={podeEditar ? 7 : 6}
                      className="px-5 py-8 text-center text-sm text-zinc-500"
                    >
                      Nenhum item nesta comanda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}