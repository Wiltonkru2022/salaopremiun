"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CatalogoExtra, CatalogoProduto, CatalogoServico, ProfissionalResumo } from "./types";
import type { ModalItemState } from "./page-types";
import { getExtraPrice, getProdutoPrice, getServicoPrice, moneyMask, parseMoney } from "./utils";

type Params = {
  open: boolean;
  itemModal: ModalItemState;
  setItemModal: Dispatch<SetStateAction<ModalItemState>>;
  servicosCatalogo: CatalogoServico[];
  produtosCatalogo: CatalogoProduto[];
  extrasCatalogo: CatalogoExtra[];
  profissionaisCatalogo: ProfissionalResumo[];
};

export function useCaixaItemModal({
  open,
  itemModal,
  setItemModal,
  servicosCatalogo,
  produtosCatalogo,
  extrasCatalogo,
  profissionaisCatalogo,
}: Params) {
  const [buscaCatalogo, setBuscaCatalogo] = useState("");
  const [dropdownCatalogoOpen, setDropdownCatalogoOpen] = useState(false);
  const [buscaProfissional, setBuscaProfissional] = useState("");
  const [dropdownProfissionalOpen, setDropdownProfissionalOpen] = useState(false);
  const [buscaAssistente, setBuscaAssistente] = useState("");
  const [dropdownAssistenteOpen, setDropdownAssistenteOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const profissionalAtual = profissionaisCatalogo.find(
      (item) => item.id === itemModal.idProfissional
    );
    const assistenteAtual = profissionaisCatalogo.find(
      (item) => item.id === itemModal.idAssistente
    );

    setBuscaCatalogo(itemModal.descricao || "");
    setBuscaProfissional(profissionalAtual?.nome || "");
    setBuscaAssistente(assistenteAtual?.nome || "");
    setDropdownCatalogoOpen(false);
    setDropdownProfissionalOpen(false);
    setDropdownAssistenteOpen(false);
  }, [
    open,
    itemModal.mode,
    itemModal.itemId,
    itemModal.descricao,
    itemModal.idProfissional,
    itemModal.idAssistente,
    profissionaisCatalogo,
  ]);

  const opcoesCatalogoFiltradas = useMemo(() => {
    const termo = buscaCatalogo.trim().toLowerCase();

    const lista =
      itemModal.tipoItem === "servico"
        ? servicosCatalogo
        : itemModal.tipoItem === "produto"
        ? produtosCatalogo
        : itemModal.tipoItem === "extra"
        ? extrasCatalogo
        : [];

    if (!termo) return lista.slice(0, 8);

    return lista
      .filter((item) => String(item.nome || "").toLowerCase().includes(termo))
      .slice(0, 8);
  }, [buscaCatalogo, itemModal.tipoItem, servicosCatalogo, produtosCatalogo, extrasCatalogo]);

  const profissionaisFiltrados = useMemo(() => {
    const termo = buscaProfissional.trim().toLowerCase();
    if (!termo) return profissionaisCatalogo.slice(0, 8);

    return profissionaisCatalogo
      .filter((item) => String(item.nome || "").toLowerCase().includes(termo))
      .slice(0, 8);
  }, [buscaProfissional, profissionaisCatalogo]);

  const assistentesFiltrados = useMemo(() => {
    const termo = buscaAssistente.trim().toLowerCase();
    if (!termo) return profissionaisCatalogo.slice(0, 8);

    return profissionaisCatalogo
      .filter((item) => String(item.nome || "").toLowerCase().includes(termo))
      .slice(0, 8);
  }, [buscaAssistente, profissionaisCatalogo]);

  const totalPreviewItem = useMemo(() => {
    const quantidade = Math.max(Number(itemModal.quantidade || 1), 1);
    const valorUnitario = parseMoney(itemModal.valorUnitario);
    return quantidade * valorUnitario;
  }, [itemModal.quantidade, itemModal.valorUnitario]);

  function selecionarTipoItem(tipoItem: ModalItemState["tipoItem"]) {
    setBuscaCatalogo("");
    setDropdownCatalogoOpen(false);

    setItemModal((prev) => ({
      ...prev,
      tipoItem,
      catalogoId: "",
      descricao: tipoItem === "ajuste" ? prev.descricao : "",
      valorUnitario: tipoItem === "ajuste" ? prev.valorUnitario : "0,00",
    }));
  }

  function atualizarBuscaCatalogo(value: string) {
    setBuscaCatalogo(value);
    setDropdownCatalogoOpen(true);

    setItemModal((prev) => ({
      ...prev,
      catalogoId: "",
      descricao: value,
    }));
  }

  function selecionarCatalogo(id: string) {
    if (!id) {
      setItemModal((prev) => ({
        ...prev,
        catalogoId: "",
      }));
      return;
    }

    if (itemModal.tipoItem === "servico") {
      const servico = servicosCatalogo.find((item) => item.id === id);
      if (!servico) return;

      setItemModal((prev) => ({
        ...prev,
        catalogoId: id,
        descricao: servico.nome || "",
        valorUnitario: getServicoPrice(servico).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      }));

      setBuscaCatalogo(servico.nome || "");
      setDropdownCatalogoOpen(false);
      return;
    }

    if (itemModal.tipoItem === "produto") {
      const produto = produtosCatalogo.find((item) => item.id === id);
      if (!produto) return;

      setItemModal((prev) => ({
        ...prev,
        catalogoId: id,
        descricao: produto.nome || "",
        valorUnitario: getProdutoPrice(produto).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      }));

      setBuscaCatalogo(produto.nome || "");
      setDropdownCatalogoOpen(false);
      return;
    }

    if (itemModal.tipoItem === "extra") {
      const extra = extrasCatalogo.find((item) => item.id === id);
      if (!extra) return;

      setItemModal((prev) => ({
        ...prev,
        catalogoId: id,
        descricao: extra.nome || "",
        valorUnitario: getExtraPrice(extra).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      }));

      setBuscaCatalogo(extra.nome || "");
      setDropdownCatalogoOpen(false);
    }
  }

  function atualizarDescricao(value: string) {
    setItemModal((prev) => ({
      ...prev,
      descricao: value,
    }));
  }

  function atualizarQuantidade(value: string) {
    setItemModal((prev) => ({
      ...prev,
      quantidade: value,
    }));
  }

  function atualizarValorUnitario(value: string) {
    setItemModal((prev) => ({
      ...prev,
      valorUnitario: moneyMask(value),
    }));
  }

  function atualizarBuscaProfissional(value: string) {
    setBuscaProfissional(value);
    setDropdownProfissionalOpen(true);

    setItemModal((prev) => ({
      ...prev,
      idProfissional: "",
    }));
  }

  function limparProfissional() {
    setBuscaProfissional("");
    setItemModal((prev) => ({
      ...prev,
      idProfissional: "",
    }));
    setDropdownProfissionalOpen(false);
  }

  function selecionarProfissional(id: string, nome: string) {
    setBuscaProfissional(nome);
    setItemModal((prev) => ({
      ...prev,
      idProfissional: id,
    }));
    setDropdownProfissionalOpen(false);
  }

  function atualizarBuscaAssistente(value: string) {
    setBuscaAssistente(value);
    setDropdownAssistenteOpen(true);

    setItemModal((prev) => ({
      ...prev,
      idAssistente: "",
    }));
  }

  function limparAssistente() {
    setBuscaAssistente("");
    setItemModal((prev) => ({
      ...prev,
      idAssistente: "",
    }));
    setDropdownAssistenteOpen(false);
  }

  function selecionarAssistente(id: string, nome: string) {
    setBuscaAssistente(nome);
    setItemModal((prev) => ({
      ...prev,
      idAssistente: id,
    }));
    setDropdownAssistenteOpen(false);
  }

  return {
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
  };
}
