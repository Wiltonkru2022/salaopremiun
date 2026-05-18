"use client";

import { useMemo } from "react";
import {
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
  onEditarItem: (item: ComandaItem) => void;
  onRemoverItem: (idItem: string) => void;
};

const ITEM_SECTIONS = ["servico", "produto", "extra", "ajuste"] as const;

type ItemDisplayEntry =
  | { kind: "item"; item: ComandaItem }
  | { kind: "combo"; comboName: string; itens: ComandaItem[]; total: number };

function organizarItensParaExibicao(itens: ComandaItem[]): ItemDisplayEntry[] {
  const combos = new Map<string, { itens: ComandaItem[]; total: number }>();
  const entries: ItemDisplayEntry[] = [];

  for (const item of itens) {
    const comboMeta = parseComboDisplayMeta(item.descricao);

    if (!comboMeta.isComboItem || !comboMeta.comboName) {
      entries.push({ kind: "item", item });
      continue;
    }

    const current = combos.get(comboMeta.comboName) || { itens: [], total: 0 };
    current.itens.push(item);
    current.total += Number(item.valor_total || 0);

    if (!combos.has(comboMeta.comboName)) {
      entries.push({
        kind: "combo",
        comboName: comboMeta.comboName,
        itens: current.itens,
        total: current.total,
      });
    }

    const entry = entries.find(
      (candidate) =>
        candidate.kind === "combo" && candidate.comboName === comboMeta.comboName
    );
    if (entry?.kind === "combo") {
      entry.itens = current.itens;
      entry.total = current.total;
    }

    combos.set(comboMeta.comboName, current);
  }

  return entries;
}

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
  const itensAgrupados = useMemo(
    () =>
      ITEM_SECTIONS.map((tipo) => ({
        itens: organizarItensParaExibicao(
          itens.filter((item) => item.tipo_item === tipo)
        ),
        tipo,
      })).filter((group) => group.itens.length > 0),
    [itens]
  );
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
    <div className="flex h-full min-h-0 flex-col rounded-[24px] border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="shrink-0 space-y-2">
        <div className={`rounded-[18px] border p-3 ${status.cardClass}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                Comanda
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="text-[1.18rem] font-bold leading-none text-zinc-950">
                  #{comandaSelecionada.numero}
                </h2>
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${status.badgeClass}`}>
                  {status.label}
                </span>
              </div>
              <div className="mt-0.5 text-xs leading-4 text-zinc-600">
                {carregandoDetalhe
                  ? "Atualizando os dados da comanda..."
                  : status.description}
              </div>
            </div>

            {podeEditar ? (
              <div className="flex flex-wrap justify-end gap-1.5">
                <button
                  type="button"
                  onClick={onAbrirPagamento}
                  disabled={saving}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60"
                >
                  <WalletCards size={14} />
                  Pagamento
                </button>
                <button
                  type="button"
                  onClick={onNovoServico}
                  disabled={saving}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60"
                >
                  <Plus size={14} />
                  Lançar item manual
                </button>
                <button
                  type="button"
                  onClick={onCancelarComanda}
                  disabled={saving}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                >
                  <Trash2 size={14} />
                  Cancelar venda
                </button>
                <button
                  type="button"
                  onClick={onFinalizarComanda}
                  disabled={saving || faltaReceber > 0}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-zinc-950 px-3 text-xs font-bold text-white transition hover:opacity-95 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  Finalizar venda
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-2 grid gap-1.5 md:grid-cols-2 xl:grid-cols-4">
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

      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-2">
          <div className="rounded-[20px] border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-3 py-2.5">
            <div className="max-w-2xl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Leitura da venda
              </div>
              <div className="mt-0.5 text-base font-bold leading-tight text-zinc-900">
                Itens da comanda
              </div>
            </div>
          </div>

          <div className="space-y-2.5 p-3">
            {itensAgrupados.map((group) => (
              <section key={group.tipo} className="space-y-1.5">
                <div className="grid gap-1.5">
                  {group.itens.map((entry) =>
                    entry.kind === "combo" ? (
                      <ComboCard
                        key={`combo-${entry.comboName}`}
                        comboName={entry.comboName}
                        itens={entry.itens}
                        total={entry.total}
                        podeEditar={podeEditar}
                        onEditarItem={onEditarItem}
                        onRemoverItem={onRemoverItem}
                      />
                    ) : (
                      <ItemCard
                        key={entry.item.id}
                        item={entry.item}
                        podeEditar={podeEditar}
                        onEditarItem={onEditarItem}
                        onRemoverItem={onRemoverItem}
                      />
                    )
                  )}
                </div>
              </section>
            ))}

            {itens.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center">
                <div className="text-sm font-medium text-zinc-700">Nenhum item nesta comanda.</div>
                <div className="mt-1 text-sm text-zinc-500">
                  Adicione serviços, produtos, extras ou ajustes para seguir com o fechamento.
                </div>
              </div>
            ) : null}
          </div>
          </div>

          {faltaReceber > 0 ? (
            <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
              <div className="flex items-start gap-2">
                <CircleAlert size={16} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">Fechamento pendente</div>
                  <div className="mt-0.5">
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
    <div className={`rounded-xl border px-2.5 py-2 ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">{label}</div>
      <div className="mt-1 break-words text-xs font-semibold leading-4">{value}</div>
    </div>
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
    <div className="rounded-[16px] border border-zinc-200 bg-zinc-50 p-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-600">
            {tipoItemIcon(item.tipo_item)}
          </div>

          <div className="min-w-0">
            <div className="break-words text-sm font-semibold leading-4 text-zinc-950">
              {comboMeta.displayTitle}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">
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
          <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Total</div>
          <div className="mt-0.5 text-sm font-bold text-zinc-950">
            {formatCurrency(item.valor_total)}
          </div>
        </div>
      </div>

      <div className="mt-2 grid gap-1.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid gap-1.5 md:grid-cols-2">
          <InfoPill label="Profissional" value={getJoinedName(item.profissionais, "-")} />
          <InfoPill label="Assistente" value={getJoinedName(item.assistente_ref, "-")} />
        </div>

        <div className="flex flex-wrap items-end justify-end gap-1.5">
          <CompactInfoPill label="Qtd." value={String(Number(item.quantidade || 0))} />
          <CompactInfoPill label="Unitário" value={formatCurrency(item.valor_unitario)} />

          {podeEditar ? (
            <div className="flex h-9 items-center gap-1.5">
              <button
                type="button"
                onClick={() => onEditarItem(item)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-100"
                title="Editar item"
              >
                <Pencil size={15} />
              </button>

              <button
                type="button"
                onClick={() => onRemoverItem(item.id)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                title="Remover item"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ComboCard({
  comboName,
  itens,
  total,
  podeEditar,
  onEditarItem,
  onRemoverItem,
}: {
  comboName: string;
  itens: ComandaItem[];
  total: number;
  podeEditar: boolean;
  onEditarItem: (item: ComandaItem) => void;
  onRemoverItem: (idItem: string) => void;
}) {
  return (
    <div className="rounded-[18px] border border-zinc-900 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <div className="rounded-lg border border-zinc-900 bg-zinc-950 p-1.5 text-white">
            {tipoItemIcon("servico")}
          </div>

          <div className="min-w-0">
            <div className="break-words text-sm font-bold leading-4 text-zinc-950">
              {comboName}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                Combo
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                {itens.length} serviços vinculados para comissão
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Total</div>
          <div className="mt-0.5 text-sm font-bold text-zinc-950">
            {formatCurrency(total)}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-zinc-200 pt-2.5">
        {itens.map((item) => {
          const comboMeta = parseComboDisplayMeta(item.descricao);

          return (
            <div
              key={item.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="break-words text-xs font-semibold text-zinc-900">
                    {comboMeta.displayTitle}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">
                    Comissão de {getJoinedName(item.profissionais, "-")} sobre{" "}
                    {formatCurrency(item.valor_total)}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-800">
                    {formatCurrency(item.valor_total)}
                  </span>

                  {podeEditar ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onEditarItem(item)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-100"
                        title="Editar serviço do combo"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoverItem(item.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                        title="Remover serviço do combo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">{label}</div>
      <div className="mt-0.5 break-words text-xs font-semibold leading-4 text-zinc-900">{value}</div>
    </div>
  );
}

function CompactInfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[74px] rounded-lg border border-zinc-200 bg-white px-2 py-1">
      <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
        {label}
      </div>
      <div className="mt-0.5 whitespace-nowrap text-[11px] font-bold leading-4 text-zinc-900">
        {value}
      </div>
    </div>
  );
}
