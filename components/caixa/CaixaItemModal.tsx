"use client";

import type { Dispatch, SetStateAction } from "react";
import AppModal from "@/components/ui/AppModal";
import type {
  CatalogoExtra,
  CatalogoProduto,
  CatalogoServico,
  ComandaDetalhe,
  ProfissionalResumo,
  TipoItemComanda,
} from "./types";
import type { ModalItemState } from "./page-types";
import { getExtraPrice, getProdutoPrice, getServicoPrice } from "./utils";
import { useCaixaItemModal } from "./useCaixaItemModal";

type Props = {
  open: boolean;
  itemModal: ModalItemState;
  setItemModal: Dispatch<SetStateAction<ModalItemState>>;
  comandaSelecionada: ComandaDetalhe | null;
  servicosCatalogo: CatalogoServico[];
  produtosCatalogo: CatalogoProduto[];
  extrasCatalogo: CatalogoExtra[];
  profissionaisCatalogo: ProfissionalResumo[];
  saving: boolean;
  podeEditar: boolean;
  onClose: () => void;
  onSave: () => void;
};

const TIPOS_ITEM: TipoItemComanda[] = ["servico", "produto", "extra", "ajuste"];

function getTipoLabel(tipo: TipoItemComanda) {
  if (tipo === "servico") return "Serviço";
  if (tipo === "produto") return "Produto";
  if (tipo === "extra") return "Extra";
  return "Ajuste";
}

function getCatalogoPlaceholder(tipo: TipoItemComanda) {
  if (tipo === "servico") return "Digite o nome do serviço";
  if (tipo === "produto") return "Digite o nome do produto";
  return "Digite o nome do extra";
}

export default function CaixaItemModal({
  open,
  itemModal,
  setItemModal,
  comandaSelecionada,
  servicosCatalogo,
  produtosCatalogo,
  extrasCatalogo,
  profissionaisCatalogo,
  saving,
  podeEditar,
  onClose,
  onSave,
}: Props) {
  const {
    assistentesFiltrados,
    buscaAssistente,
    buscaCatalogo,
    buscaProfissional,
    dropdownAssistenteOpen,
    dropdownCatalogoOpen,
    dropdownProfissionalOpen,
    opcoesCatalogoFiltradas,
    profissionaisFiltrados,
    selecionarAssistente,
    selecionarCatalogo,
    selecionarProfissional,
    selecionarTipoItem,
    setDropdownAssistenteOpen,
    setDropdownCatalogoOpen,
    setDropdownProfissionalOpen,
    totalPreviewItem,
    atualizarBuscaAssistente,
    atualizarBuscaCatalogo,
    atualizarBuscaProfissional,
    atualizarDescricao,
    atualizarQuantidade,
    atualizarValorUnitario,
    limparAssistente,
    limparProfissional,
  } = useCaixaItemModal({
    open,
    itemModal,
    setItemModal,
    servicosCatalogo,
    produtosCatalogo,
    extrasCatalogo,
    profissionaisCatalogo,
  });

  if (!open) return null;

  const canSave = !saving && !!comandaSelecionada && podeEditar;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={
        itemModal.mode === "edit"
          ? "Editar item da comanda"
          : "Adicionar item na comanda"
      }
      description="Escolha o tipo do item e preencha os dados da cobrança."
      maxWidthClassName="max-w-2xl"
      zIndexClassName="z-[95]"
      closeDisabled={saving}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            {saving
              ? "Salvando..."
              : itemModal.mode === "edit"
              ? "Salvar alterações"
              : "Adicionar item"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {TIPOS_ITEM.map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => selecionarTipoItem(tipo)}
                className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                  itemModal.tipoItem === tipo
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {getTipoLabel(tipo)}
              </button>
            ))}
          </div>

          {itemModal.tipoItem !== "ajuste" ? (
            <div className="relative">
              <label className="mb-2 block text-sm font-semibold text-zinc-700">
                Buscar {getTipoLabel(itemModal.tipoItem).toLowerCase()}
              </label>

              <input
                value={buscaCatalogo}
                onChange={(e) => atualizarBuscaCatalogo(e.target.value)}
                onFocus={() => setDropdownCatalogoOpen(true)}
                placeholder={getCatalogoPlaceholder(itemModal.tipoItem)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
              />

              {dropdownCatalogoOpen && opcoesCatalogoFiltradas.length > 0 ? (
                <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl">
                  {opcoesCatalogoFiltradas.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selecionarCatalogo(item.id)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition hover:bg-zinc-50"
                    >
                      <div className="font-medium text-zinc-900">{item.nome}</div>
                      <div className="text-sm font-semibold text-zinc-600">
                        {(itemModal.tipoItem === "servico"
                          ? getServicoPrice(item as CatalogoServico)
                          : itemModal.tipoItem === "produto"
                          ? getProdutoPrice(item as CatalogoProduto)
                          : getExtraPrice(item as CatalogoExtra)
                        ).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700">
                Descrição
              </label>
              <input
                value={itemModal.descricao}
                onChange={(e) => atualizarDescricao(e.target.value)}
                placeholder="Descrição do item"
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700">
                Quantidade
              </label>
              <input
                type="number"
                min="1"
                value={itemModal.quantidade}
                onChange={(e) => atualizarQuantidade(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700">
                Valor unitário
              </label>
              <input
                value={itemModal.valorUnitario}
                onChange={(e) => atualizarValorUnitario(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
              />
            </div>

            <div className="relative">
              <label className="mb-2 block text-sm font-semibold text-zinc-700">
                Profissional
              </label>

              <input
                value={buscaProfissional}
                onChange={(e) => atualizarBuscaProfissional(e.target.value)}
                onFocus={() => setDropdownProfissionalOpen(true)}
                placeholder="Digite o nome do profissional"
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
              />

              {dropdownProfissionalOpen ? (
                <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl">
                  <button
                    type="button"
                    onClick={limparProfissional}
                    className="w-full rounded-xl px-3 py-3 text-left text-sm text-zinc-600 transition hover:bg-zinc-50"
                  >
                    Sem profissional
                  </button>

                  {profissionaisFiltrados.map((prof) => (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => selecionarProfissional(prof.id, prof.nome || "")}
                      className="w-full rounded-xl px-3 py-3 text-left transition hover:bg-zinc-50"
                    >
                      <div className="font-medium text-zinc-900">{prof.nome}</div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative">
              <label className="mb-2 block text-sm font-semibold text-zinc-700">
                Assistente
              </label>

              <input
                value={buscaAssistente}
                onChange={(e) => atualizarBuscaAssistente(e.target.value)}
                onFocus={() => setDropdownAssistenteOpen(true)}
                placeholder="Digite o nome do assistente"
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
              />

              {dropdownAssistenteOpen ? (
                <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl">
                  <button
                    type="button"
                    onClick={limparAssistente}
                    className="w-full rounded-xl px-3 py-3 text-left text-sm text-zinc-600 transition hover:bg-zinc-50"
                  >
                    Sem assistente
                  </button>

                  {assistentesFiltrados.map((prof) => (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => selecionarAssistente(prof.id, prof.nome || "")}
                      className="w-full rounded-xl px-3 py-3 text-left transition hover:bg-zinc-50"
                    >
                      <div className="font-medium text-zinc-900">{prof.nome}</div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Total do item
            </div>
            <div className="mt-1 text-2xl font-bold text-zinc-900">
              {totalPreviewItem.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </div>
          </div>
      </div>
    </AppModal>
  );
}
