"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Permissoes } from "@/lib/auth/permissions";
import type {
  AbaCaixa,
  AgendamentoFila,
  CatalogoExtra,
  CatalogoProduto,
  CatalogoServico,
  ComandaDetalhe,
  ComandaFila,
  ComandaItem,
  ComandaPagamento,
  ConfigCaixaSalao,
  ProfissionalResumo,
} from "@/components/caixa/types";
import {
  agendamentosFiltradosBase,
  getJoinedName,
  obterTaxaConfigurada,
} from "@/components/caixa/utils";
import {
  type CaixaMovimentacao,
  type CaixaSessao,
} from "@/lib/caixa/sessaoCaixa";
import { createClient } from "@/lib/supabase/client";

export function useCaixaPageState() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [erroTela, setErroTela] = useState("");
  const [msg, setMsg] = useState("");
  const [idSalao, setIdSalao] = useState("");

  const [permissoes, setPermissoes] = useState<Permissoes | null>(null);
  const [acessoCarregado, setAcessoCarregado] = useState(false);

  const [configCaixa, setConfigCaixa] = useState<ConfigCaixaSalao | null>(null);
  const [caixaSchemaReady, setCaixaSchemaReady] = useState(true);
  const [caixaSchemaError, setCaixaSchemaError] = useState("");
  const [sessaoCaixa, setSessaoCaixa] = useState<CaixaSessao | null>(null);
  const [movimentacoesCaixa, setMovimentacoesCaixa] = useState<
    CaixaMovimentacao[]
  >([]);

  const [aba, setAba] = useState<AbaCaixa>("fila");
  const [busca, setBusca] = useState("");

  const [comandasFila, setComandasFila] = useState<ComandaFila[]>([]);
  const [agendamentosFila, setAgendamentosFila] = useState<AgendamentoFila[]>(
    []
  );
  const [comandasFechadas, setComandasFechadas] = useState<ComandaFila[]>([]);
  const [comandasCanceladas, setComandasCanceladas] = useState<ComandaFila[]>(
    []
  );

  const [comandaSelecionada, setComandaSelecionada] =
    useState<ComandaDetalhe | null>(null);
  const [itens, setItens] = useState<ComandaItem[]>([]);
  const [pagamentos, setPagamentos] = useState<ComandaPagamento[]>([]);

  const [descontoInput, setDescontoInput] = useState("0,00");
  const [acrescimoInput, setAcrescimoInput] = useState("0,00");

  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [valorPagamento, setValorPagamento] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [taxaPercentual, setTaxaPercentual] = useState("0,00");
  const [observacaoPagamento, setObservacaoPagamento] = useState("");

  const [servicosCatalogo, setServicosCatalogo] = useState<CatalogoServico[]>(
    []
  );
  const [produtosCatalogo, setProdutosCatalogo] = useState<CatalogoProduto[]>(
    []
  );
  const [extrasCatalogo, setExtrasCatalogo] = useState<CatalogoExtra[]>([]);
  const [profissionaisCatalogo, setProfissionaisCatalogo] = useState<
    ProfissionalResumo[]
  >([]);

  const requestedComandaId = searchParams.get("comanda_id");

  const podeVerCaixa = !!permissoes?.caixa_ver;
  const podeOperarCaixa =
    !!permissoes?.caixa_editar ||
    !!permissoes?.caixa_operar ||
    !!permissoes?.caixa_pagamentos ||
    !!permissoes?.caixa_finalizar;
  const podeEditarCaixa =
    !!permissoes?.caixa_editar || !!permissoes?.caixa_operar;
  const podeGerenciarPagamentos =
    !!permissoes?.caixa_editar || !!permissoes?.caixa_pagamentos;
  const podeFinalizarCaixa =
    !!permissoes?.caixa_editar || !!permissoes?.caixa_finalizar;
  const caixaAberto = caixaSchemaReady && sessaoCaixa?.status === "aberto";

  useEffect(() => {
    if (!configCaixa) {
      setTaxaPercentual("0,00");
      return;
    }

    const numeroParcelas = Math.max(Number(parcelas || 1), 1);
    const taxa = obterTaxaConfigurada(formaPagamento, numeroParcelas, configCaixa);

    setTaxaPercentual(
      Number(taxa || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }, [configCaixa, formaPagamento, parcelas]);

  const totalPago = useMemo(
    () => pagamentos.reduce((acc, item) => acc + Number(item.valor || 0), 0),
    [pagamentos]
  );

  const totalComanda = Number(comandaSelecionada?.total || 0);
  const faltaReceber = Math.max(totalComanda - totalPago, 0);
  const troco = Math.max(totalPago - totalComanda, 0);

  const comandasFiltradas = useMemo(() => {
    const term = busca.trim().toLowerCase();
    if (!term) return comandasFila;

    return comandasFila.filter((item) => {
      const cliente = getJoinedName(item.clientes, "").toLowerCase();
      return String(item.numero).includes(term) || cliente.includes(term);
    });
  }, [busca, comandasFila]);

  const agendamentosFiltrados = useMemo(() => {
    const term = busca.trim().toLowerCase();
    if (!term) return agendamentosFila;

    return agendamentosFiltradosBase(agendamentosFila, term);
  }, [busca, agendamentosFila]);

  return {
    supabase,
    requestedComandaId,
    loading,
    setLoading,
    erroTela,
    setErroTela,
    msg,
    setMsg,
    idSalao,
    setIdSalao,
    permissoes,
    setPermissoes,
    acessoCarregado,
    setAcessoCarregado,
    configCaixa,
    setConfigCaixa,
    caixaSchemaReady,
    setCaixaSchemaReady,
    caixaSchemaError,
    setCaixaSchemaError,
    sessaoCaixa,
    setSessaoCaixa,
    movimentacoesCaixa,
    setMovimentacoesCaixa,
    aba,
    setAba,
    busca,
    setBusca,
    comandasFila,
    setComandasFila,
    agendamentosFila,
    setAgendamentosFila,
    comandasFechadas,
    setComandasFechadas,
    comandasCanceladas,
    setComandasCanceladas,
    comandaSelecionada,
    setComandaSelecionada,
    itens,
    setItens,
    pagamentos,
    setPagamentos,
    descontoInput,
    setDescontoInput,
    acrescimoInput,
    setAcrescimoInput,
    formaPagamento,
    setFormaPagamento,
    valorPagamento,
    setValorPagamento,
    parcelas,
    setParcelas,
    taxaPercentual,
    setTaxaPercentual,
    observacaoPagamento,
    setObservacaoPagamento,
    servicosCatalogo,
    setServicosCatalogo,
    produtosCatalogo,
    setProdutosCatalogo,
    extrasCatalogo,
    setExtrasCatalogo,
    profissionaisCatalogo,
    setProfissionaisCatalogo,
    podeVerCaixa,
    podeOperarCaixa,
    podeEditarCaixa,
    podeGerenciarPagamentos,
    podeFinalizarCaixa,
    caixaAberto,
    totalPago,
    faltaReceber,
    troco,
    comandasFiltradas,
    agendamentosFiltrados,
  };
}
