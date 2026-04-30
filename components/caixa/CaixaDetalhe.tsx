"use client";

import { type ReactNode, useMemo } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Pencil,
  Plus,
  Receipt,
  Scissors,
  ShoppingBag,
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
  tipoItemIcon,
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
  onNovoProduto: () => void;
  onNovoExtra: () => void;
  onNovoAjuste: () => void;
  onEditarItem: (item: ComandaItem) => void;
  onRemoverItem: (idItem: string) => void;
};

const ITEM_SECTIONS = ["servico", "produto", "extra", "ajuste"] as const;

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
  onNovoProduto,
  onNovoExtra,
  onNovoAjuste,
  onEditarItem,
  onRemoverItem,
}: Props) {
  const itensAgrupados = useMemo(
    () =>
      ITEM_SECTIONS.map((tipo) => ({
        itens: itens.filter((item) => item.tipo_item === tipo),
        tipo,
      })).filter((group) => group.itens.length > 0),
    [itens]
  );
  const gruposAtivos = itensAgrupados.length;

  if (!comandaSelecionada) {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex h-full min-h-[520px] items-center justify-center rounded-[24px] border border-dashed border-zinc-300 bg-zinc-50 text-center">
          <div>
            <Receipt className="mx-auto mb-3 text-zinc-400" size={32} />
            <div className="text-lg font-semibold text-zinc-800">Selecione uma comanda</div>
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
  const status = getStatusCaixaMeta(comandaSelecionada.status);
  const carregandoDetalhe = comandaCarregandoId === comandaSelecionada.id;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="shrink-0 space-y-2">
        <div className={`rounded-[22px] border p-3 ${status.cardClass}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Comanda
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="text-[1.45rem] font-bold leading-none text-zinc-950">
                  #{comandaSelecionada.numero}
                </h2>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${status.badgeClass}`}>
                  {status.label}
                </span>
              </div>
              <div className="mt-0.5 text-[13px] leading-5 text-zinc-600">
                {carregandoDetalhe
                  ? "Atualizando os dados da comanda..."
                  : status.description}
              </div>
            </div>

            {podeEditar ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onAbrirPagamento}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60"
                >
                  <WalletCards size={15} />
                  Pagamento
                </button>
                <button
                  type="button"
                  onClick={onCancelarComanda}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                >
                  <Trash2 size={15} />
                  Cancelar venda
                </button>
                <button
                  type="button"
                  onClick={onFinalizarComanda}
                  disabled={saving || faltaReceber > 0}
                  className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-50"
                >
                  <CheckCircle2 size={15} />
                  Finalizar venda
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-2.5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <HighlightCard
              label="Cliente"
              value={getJoinedName(comandaSelecionada.clientes, "Sem cliente")}
            />
            <HighlightCard
              label="Aberta em"
              value={formatDateTime(comandaSelecionada.aberta_em)}
            />
            <HighlightCard label="Itens ativos" value={String(itens.length)} />
            <HighlightCard
              label="Falta receber"
              value={formatCurrency(faltaReceber)}
              tone={faltaReceber > 0 ? "amber" : "emerald"}
            />
          </div>
        </div>

        {podeEditar ? (
          <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-800">
                  Lancar item manual
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
              <ActionCard icon={<Scissors size={16} />} label="Servico" onClick={onNovoServico} />
              <ActionCard icon={<ShoppingBag size={16} />} label="Produto" onClick={onNovoProduto} />
              <ActionCard icon={<WalletCards size={16} />} label="Extra" onClick={onNovoExtra} />
              <ActionCard icon={<Plus size={16} />} label="Ajuste" onClick={onNovoAjuste} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-3">
          <div className="rounded-[24px] border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Leitura da venda
                </div>
                <div className="mt-1 text-[1.2rem] font-bold leading-tight text-zinc-900">
                  Itens da comanda
                </div>
              </div>

              <div className="grid min-w-[220px] gap-2 sm:grid-cols-2">
                <HeaderStat
                  label="Itens ativos"
                  value={String(itens.length)}
                />
                <HeaderStat
                  label="Grupos"
                  value={String(gruposAtivos)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5">
            {itensAgrupados.map((group) => (
              <section key={group.tipo} className="space-y-2.5">
                <div className="flex items-center justify-between gap-3 rounded-[20px] border border-zinc-200 bg-zinc-50 px-4 py-2.5">
                  <div className="flex items-center gap-3 text-zinc-900">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-2 text-zinc-600 shadow-sm">
                      {tipoItemIcon(group.tipo)}
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold">{getTipoItemLabel(group.tipo)}</div>
                      <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                        {group.itens.length} item(ns)
                      </div>
                    </div>
                  </div>

                  <div className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold text-zinc-700">
                    {formatCurrency(
                      group.itens.reduce(
                        (acc, current) => acc + Number(current.valor_total || 0),
                        0
                      )
                    )}
                  </div>
                </div>

                <div className="grid gap-3">
                  {group.itens.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      podeEditar={podeEditar}
                      onEditarItem={onEditarItem}
                      onRemoverItem={onRemoverItem}
                    />
                  ))}
                </div>
              </section>
            ))}

            {itens.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center">
                <div className="text-sm font-medium text-zinc-700">Nenhum item nesta comanda.</div>
                <div className="mt-1 text-sm text-zinc-500">
                  Adicione servicos, produtos, extras ou ajustes para seguir com o fechamento.
                </div>
              </div>
            ) : null}
          </div>
          </div>

          {faltaReceber > 0 ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
              <div className="flex items-start gap-3">
                <CircleAlert size={18} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">Fechamento pendente</div>
                  <div className="mt-1">
                    Ainda falta receber <strong>{formatCurrency(faltaReceber)}</strong> para concluir
                    esta comanda.
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </div>
      <div className="mt-1 break-words text-lg font-bold leading-6 text-zinc-950">{value}</div>
    </div>
  );
}

function HighlightCard({
  label,
  tone = "zinc",
  value,
}: {
  label: string;
  tone?: "amber" | "emerald" | "zinc";
  value: string;
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-white text-amber-900"
      : tone === "emerald"
      ? "border-emerald-200 bg-white text-emerald-900"
      : "border-zinc-200 bg-white text-zinc-900";

  return (
    <div className={`rounded-2xl border px-3.5 py-2.5 ${toneClass}`}>
      <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className="mt-1.5 break-words text-sm font-semibold leading-5">{value}</div>
    </div>
  );
}

function ActionCard({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-100"
    >
      {icon}
      {label}
    </button>
  );
}

function ItemCard({
  item,
  podeEditar,
  onEditarItem,
  onRemoverItem,
}: {
  item: ComandaItem;
  podeEditar: boolean;
  onEditarItem: (item: ComandaItem) => void;
  onRemoverItem: (idItem: string) => void;
}) {
  const comboMeta = parseComboDisplayMeta(item.descricao);

  return (
    <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-1.5 text-zinc-600">
            {tipoItemIcon(item.tipo_item)}
          </div>

          <div className="min-w-0">
            <div className="break-words text-sm font-semibold leading-5 text-zinc-950">
              {comboMeta.displayTitle}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                {getTipoItemLabel(item.tipo_item)}
              </div>
              {comboMeta.isComboItem ? (
                <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-700">
                  Combo
                </span>
              ) : null}
            </div>
            {comboMeta.isComboItem && comboMeta.comboName ? (
              <div className="mt-0.5 text-xs text-zinc-500">
                Vindo do combo <span className="font-semibold text-zinc-700">{comboMeta.comboName}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">Total</div>
          <div className="mt-0.5 text-[15px] font-bold text-zinc-950">
            {formatCurrency(item.valor_total)}
          </div>
        </div>
      </div>

      <div className="mt-2.5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <InfoPill label="Profissional" value={getJoinedName(item.profissionais, "-")} />
        <InfoPill label="Assistente" value={getJoinedName(item.assistente_ref, "-")} />
        <InfoPill label="Quantidade" value={String(Number(item.quantidade || 0))} />
        <InfoPill label="Unitario" value={formatCurrency(item.valor_unitario)} />
      </div>

      {podeEditar ? (
        <div className="mt-2.5 flex justify-end gap-2">
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
      ) : null}
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className="mt-0.5 break-words text-sm font-semibold leading-5 text-zinc-900">{value}</div>
    </div>
  );
}
