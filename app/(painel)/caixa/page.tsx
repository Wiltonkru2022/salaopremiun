"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CaixaCancelModal from "@/components/caixa/CaixaCancelModal";
import CaixaDetalhe from "@/components/caixa/CaixaDetalhe";
import CaixaFila from "@/components/caixa/CaixaFila";
import CaixaHeader from "@/components/caixa/CaixaHeader";
import CaixaItemModal from "@/components/caixa/CaixaItemModal";
import CaixaPagamentos from "@/components/caixa/CaixaPagamentos";
import CaixaResumo from "@/components/caixa/CaixaResumo";
import CaixaSessaoPanel from "@/components/caixa/CaixaSessaoPanel";
import {
  INITIAL_MODAL_ITEM_STATE,
  type ModalItemState,
} from "@/components/caixa/page-types";
import { type Permissoes } from "@/lib/auth/permissions";
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
  TipoItemComanda,
} from "@/components/caixa/types";
import {
  agendamentosFiltradosBase,
  getJoinedName,
  parseMoney,
} from "@/components/caixa/utils";
import {
  carregarAcessoCaixa,
  carregarCatalogosCaixa,
  carregarComandaDetalhe,
  carregarConfiguracoesCaixa as carregarConfiguracoesCaixaData,
  carregarListasCaixa,
} from "@/lib/caixa/loadCaixaData";
import {
  carregarSessaoCaixa,
  type CaixaMovimentacao,
  type CaixaMovimentacaoTipo,
  type CaixaSessao,
} from "@/lib/caixa/sessaoCaixa";
import { obterTaxaConfigurada } from "@/lib/caixa/taxas";
import { createClient } from "@/lib/supabase/client";

type ProcessarComandaAcao =
  | "salvar_base"
  | "adicionar_item"
  | "editar_item"
  | "remover_item"
  | "enviar_pagamento"
  | "criar_por_agendamento";

type ProcessarComandaResponse = {
  ok: boolean;
  idComanda?: string;
  idItem?: string;
  status?: string;
  jaExistia?: boolean;
};

type ProcessarComandaErrorResponse = {
  error?: string;
};

type ProcessarCaixaAcao =
  | "abrir_caixa"
  | "fechar_caixa"
  | "lancar_movimentacao"
  | "adicionar_pagamento"
  | "remover_pagamento"
  | "finalizar_comanda"
  | "cancelar_comanda";

type ProcessarCaixaResponse = {
  ok: boolean;
  warning?: string | null;
  taxaPercentual?: number;
  taxaValor?: number;
  valorFinalCobrado?: number;
  repassaTaxaCliente?: boolean;
  idempotentReplay?: boolean;
};

type ProcessarCaixaErrorResponse = {
  error?: string;
};

export default function CaixaPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const pendingOperationKeysRef = useRef<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
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
  const [agendamentosFila, setAgendamentosFila] = useState<AgendamentoFila[]>([]);
  const [comandasFechadas, setComandasFechadas] = useState<ComandaFila[]>([]);
  const [comandasCanceladas, setComandasCanceladas] = useState<ComandaFila[]>([]);

  const [comandaSelecionada, setComandaSelecionada] = useState<ComandaDetalhe | null>(null);
  const [itens, setItens] = useState<ComandaItem[]>([]);
  const [pagamentos, setPagamentos] = useState<ComandaPagamento[]>([]);

  const [descontoInput, setDescontoInput] = useState("0,00");
  const [acrescimoInput, setAcrescimoInput] = useState("0,00");

  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [valorPagamento, setValorPagamento] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [taxaPercentual, setTaxaPercentual] = useState("0,00");
  const [observacaoPagamento, setObservacaoPagamento] = useState("");

  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const [servicosCatalogo, setServicosCatalogo] = useState<CatalogoServico[]>([]);
  const [produtosCatalogo, setProdutosCatalogo] = useState<CatalogoProduto[]>([]);
  const [extrasCatalogo, setExtrasCatalogo] = useState<CatalogoExtra[]>([]);
  const [profissionaisCatalogo, setProfissionaisCatalogo] = useState<ProfissionalResumo[]>([]);

  const [itemModal, setItemModal] = useState<ModalItemState>(INITIAL_MODAL_ITEM_STATE);
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

  function gerarChaveOperacao(scope: string) {
    const existente = pendingOperationKeysRef.current[scope];
    if (existente) return existente;

    const novaChave =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    pendingOperationKeysRef.current[scope] = novaChave;
    return novaChave;
  }

  function limparChaveOperacao(scope: string) {
    delete pendingOperationKeysRef.current[scope];
  }

  async function processarComanda(params: {
    acao: ProcessarComandaAcao;
    item?: Record<string, unknown>;
    desconto?: number;
    acrescimo?: number;
    status?: string;
  }) {
    const response = await fetch("/api/comandas/processar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idSalao,
        acao: params.acao,
        comanda: {
          idComanda: comandaSelecionada?.id || null,
          numero: comandaSelecionada?.numero || null,
          idCliente: comandaSelecionada?.id_cliente || null,
          status: params.status || comandaSelecionada?.status || "aberta",
          observacoes: comandaSelecionada?.observacoes || null,
          desconto:
            params.desconto ?? Number(comandaSelecionada?.desconto || 0),
          acrescimo:
            params.acrescimo ?? Number(comandaSelecionada?.acrescimo || 0),
        },
        item: params.item,
      }),
    });

    const result = (await response.json().catch(() => ({}))) as Partial<
      ProcessarComandaResponse
    > &
      ProcessarComandaErrorResponse;

    if (!response.ok) {
      throw new Error(result.error || "Erro ao processar comanda.");
    }

    return result as ProcessarComandaResponse;
  }

  async function processarCaixa(params: {
    acao: ProcessarCaixaAcao;
    idempotencyKey?: string | null;
    sessao?: Record<string, unknown>;
    movimento?: Record<string, unknown>;
    pagamento?: Record<string, unknown>;
    motivo?: string | null;
  }) {
    const response = await fetch("/api/caixa/processar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idSalao,
        acao: params.acao,
        idempotencyKey: params.idempotencyKey || null,
        comanda: {
          idComanda: comandaSelecionada?.id || null,
        },
        sessao: params.sessao,
        movimento: params.movimento,
        pagamento: params.pagamento,
        motivo: params.motivo,
      }),
    });

    const result = (await response.json().catch(() => ({}))) as Partial<
      ProcessarCaixaResponse
    > &
      ProcessarCaixaErrorResponse;

    if (!response.ok) {
      throw new Error(result.error || "Erro ao processar o caixa.");
    }

    return result as ProcessarCaixaResponse;
  }

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedComandaId]);

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
  }, [formaPagamento, parcelas, configCaixa]);

  function limparComandaSelecionada() {
    setComandaSelecionada(null);
    setItens([]);
    setPagamentos([]);
  }

  async function aplicarDetalheComanda(idComanda: string) {
    const detalhe = await carregarComandaDetalhe(supabase, idComanda);

    setComandaSelecionada(detalhe.comandaSelecionada);
    setItens(detalhe.itens);
    setPagamentos(detalhe.pagamentos);
    setDescontoInput(detalhe.descontoInput);
    setAcrescimoInput(detalhe.acrescimoInput);
  }

  async function carregarAcesso() {
    const acesso = await carregarAcessoCaixa(supabase);

    if (acesso.precisaLogin) {
      router.replace("/login");
      return null;
    }

    setPermissoes(acesso.permissoes);
    setAcessoCarregado(true);

    if (!acesso.permissoes.caixa_ver) {
      router.replace("/dashboard");
      return null;
    }

    return acesso;
  }

  async function carregarConfiguracoesCaixa(salaoIdParam?: string) {
    const salaoId = salaoIdParam || idSalao;
    if (!salaoId) return;

    const config = await carregarConfiguracoesCaixaData(supabase, salaoId);
    setConfigCaixa(config);
  }

  async function carregarSessaoOperacional(salaoIdParam?: string) {
    const salaoId = salaoIdParam || idSalao;
    if (!salaoId) return;

    const resultado = await carregarSessaoCaixa(supabase, salaoId);
    setCaixaSchemaReady(resultado.schemaReady);
    setCaixaSchemaError(resultado.error || "");
    setSessaoCaixa(resultado.sessao);
    setMovimentacoesCaixa(resultado.movimentacoes);
  }

  async function carregarCatalogos(salaoIdParam?: string) {
    const salaoId = salaoIdParam || idSalao;
    if (!salaoId) return;

    const catalogos = await carregarCatalogosCaixa(supabase, salaoId);

    setServicosCatalogo(catalogos.servicosCatalogo);
    setProdutosCatalogo(catalogos.produtosCatalogo);
    setExtrasCatalogo(catalogos.extrasCatalogo);
    setProfissionaisCatalogo(catalogos.profissionaisCatalogo);
  }

  async function carregarTudo(salaoIdParam?: string) {
    const salaoId = salaoIdParam || idSalao;
    if (!salaoId) return;

    const listas = await carregarListasCaixa(supabase, salaoId);

    setComandasFila(listas.comandasFila);
    setAgendamentosFila(listas.agendamentosFila);
    setComandasFechadas(listas.comandasFechadas);
    setComandasCanceladas(listas.comandasCanceladas);
  }

  function exigirCaixaAberto() {
    if (!caixaSchemaReady) {
      setErroTela(
        "Aplique a migration de caixa operacional no Supabase antes de vender."
      );
      return false;
    }

    if (!caixaAberto || !sessaoCaixa) {
      setErroTela("Abra o caixa antes de vender, receber ou finalizar comanda.");
      return false;
    }

    return true;
  }

  async function abrirCaixa(payload: {
    valorAbertura: number;
    observacoes: string;
  }) {
    if (!podeOperarCaixa) {
      setErroTela("Voce nao tem permissao para abrir o caixa.");
      return;
    }

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");
      await processarCaixa({
        acao: "abrir_caixa",
        sessao: {
          valorAbertura: payload.valorAbertura,
          observacoes: payload.observacoes,
        },
      });
      await carregarSessaoOperacional();
      setMsg("Caixa aberto. Agora as vendas podem ser recebidas.");
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao abrir caixa.");
    } finally {
      setSaving(false);
    }
  }

  async function fecharCaixa(payload: {
    valorFechamento: number;
    observacoes: string;
  }) {
    if (!sessaoCaixa) return;
    if (!podeFinalizarCaixa) {
      setErroTela("Voce nao tem permissao para fechar o caixa.");
      return;
    }

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");
      await processarCaixa({
        acao: "fechar_caixa",
        sessao: {
          idSessao: sessaoCaixa.id,
          valorFechamento: payload.valorFechamento,
          observacoes: payload.observacoes,
        },
      });
      await carregarSessaoOperacional();
      setMsg("Caixa fechado com sucesso.");
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao fechar caixa.");
    } finally {
      setSaving(false);
    }
  }

  async function lancarMovimentoCaixa(payload: {
    tipo: CaixaMovimentacaoTipo;
    valor: number;
    descricao: string;
    idProfissional?: string | null;
  }) {
    if (!exigirCaixaAberto() || !sessaoCaixa) return;

    if (payload.valor <= 0) {
      setErroTela("Informe um valor valido para o movimento.");
      return;
    }

    if (payload.tipo === "vale_profissional" && !payload.idProfissional) {
      setErroTela("Selecione o profissional para lancar o vale.");
      return;
    }

    const operationScope = [
      "movimento",
      sessaoCaixa.id,
      payload.tipo,
      payload.idProfissional || "sem-profissional",
      payload.valor,
      payload.descricao.trim(),
    ].join(":");
    const idempotencyKey = gerarChaveOperacao(operationScope);
    let completed = false;

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");
      await processarCaixa({
        acao: "lancar_movimentacao",
        idempotencyKey,
        sessao: {
          idSessao: sessaoCaixa.id,
        },
        movimento: {
          tipo: payload.tipo,
          valor: payload.valor,
          descricao: payload.descricao,
          idProfissional: payload.idProfissional,
        },
      });
      completed = true;
      await carregarSessaoOperacional();
      setMsg(
        payload.tipo === "vale_profissional"
          ? "Vale lancado e preparado para desconto no fechamento de comissao."
          : "Movimento do caixa lancado."
      );
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao lancar movimento do caixa.");
    } finally {
      if (completed) {
        limparChaveOperacao(operationScope);
      }
      setSaving(false);
    }
  }

  async function init() {
    try {
      setLoading(true);
      setErroTela("");
      setMsg("");

      const acesso = await carregarAcesso();
      if (!acesso) return;

      const salaoId = acesso.usuario.id_salao;
      setIdSalao(salaoId);

      await Promise.all([
        carregarTudo(salaoId),
        carregarCatalogos(salaoId),
        carregarConfiguracoesCaixa(salaoId),
        carregarSessaoOperacional(salaoId),
      ]);

      if (requestedComandaId) {
        await aplicarDetalheComanda(requestedComandaId);
        setAba("fila");
      }
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao carregar caixa.");
    } finally {
      setLoading(false);
    }
  }

  async function abrirComanda(idComanda: string) {
    if (!podeOperarCaixa) {
      setErroTela("Voce nao tem permissao para operar o caixa.");
      return;
    }
    if (!exigirCaixaAberto()) return;

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");
      await aplicarDetalheComanda(idComanda);
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao abrir comanda.");
    } finally {
      setSaving(false);
    }
  }

  async function abrirAgendamentoSemComanda(agendamentoId: string) {
    if (!podeOperarCaixa) {
      setErroTela("Voce nao tem permissao para operar o caixa.");
      return;
    }
    if (!exigirCaixaAberto()) return;

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const result = await processarComanda({
        acao: "criar_por_agendamento",
        item: {
          id_agendamento: agendamentoId,
        },
      });

      const idComanda = result.idComanda;
      if (!idComanda) {
        throw new Error("Nao foi possivel obter a comanda criada.");
      }

      await carregarTudo();
      await aplicarDetalheComanda(idComanda);
      setMsg(
        result.jaExistia
          ? "Comanda existente aberta com sucesso."
          : "Comanda criada a partir do agendamento."
      );
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao abrir agendamento no caixa.");
    } finally {
      setSaving(false);
    }
  }

  async function salvarDescontoAcrescimo() {
    if (!comandaSelecionada) return;
    if (!podeEditarCaixa) {
      setErroTela("Voce nao tem permissao para editar o caixa.");
      return;
    }
    if (!exigirCaixaAberto()) return;

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const desconto = parseMoney(descontoInput);
      const acrescimo = parseMoney(acrescimoInput);

      await processarComanda({
        acao: "salvar_base",
        desconto,
        acrescimo,
      });

      await aplicarDetalheComanda(comandaSelecionada.id);
      await carregarTudo();
      setMsg("Resumo financeiro atualizado.");
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao atualizar resumo.");
    } finally {
      setSaving(false);
    }
  }

  async function adicionarPagamento() {
    if (!comandaSelecionada) return;
    if (!podeGerenciarPagamentos) {
      setErroTela("Voce nao tem permissao para lancar pagamentos.");
      return;
    }
    if (!exigirCaixaAberto()) return;

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const valorBase = parseMoney(valorPagamento);
      const numeroParcelas = Math.max(Number(parcelas || 1), 1);

      if (valorBase <= 0) {
        throw new Error("Informe um valor de pagamento valido.");
      }

      const operationScope = [
        "pagamento",
        comandaSelecionada.id,
        formaPagamento,
        valorBase,
        numeroParcelas,
        observacaoPagamento.trim(),
      ].join(":");
      const idempotencyKey = gerarChaveOperacao(operationScope);

      const result = await processarCaixa({
        acao: "adicionar_pagamento",
        idempotencyKey,
        pagamento: {
          formaPagamento,
          valorBase,
          parcelas: numeroParcelas,
          observacoes: observacaoPagamento || null,
        },
      });

      setValorPagamento("");
      setParcelas("1");
      setObservacaoPagamento("");

      const taxaAuto = obterTaxaConfigurada(formaPagamento, 1, configCaixa);
      setTaxaPercentual(
        Number(taxaAuto || 0).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );

      await aplicarDetalheComanda(comandaSelecionada.id);
      await carregarSessaoOperacional();
      await carregarTudo();
      setMsg(
        result.repassaTaxaCliente && Number(result.taxaValor || 0) > 0
          ? `Pagamento adicionado com taxa repassada ao cliente (${Number(
              result.taxaValor || 0
            ).toLocaleString(
              "pt-BR",
              {
                style: "currency",
                currency: "BRL",
              }
            )}).`
          : "Pagamento adicionado."
      );
      limparChaveOperacao(operationScope);
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao adicionar pagamento.");
    } finally {
      setSaving(false);
    }
  }

  async function removerPagamento(idPagamento: string) {
    if (!comandaSelecionada) return;
    if (!podeGerenciarPagamentos) {
      setErroTela("Voce nao tem permissao para remover pagamentos.");
      return;
    }
    if (!exigirCaixaAberto()) return;

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      await processarCaixa({
        acao: "remover_pagamento",
        pagamento: {
          idPagamento,
        },
      });

      await aplicarDetalheComanda(comandaSelecionada.id);
      await carregarSessaoOperacional();
      setMsg("Pagamento removido.");
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao remover pagamento.");
    } finally {
      setSaving(false);
    }
  }

  async function finalizarComanda() {
    if (!comandaSelecionada) return;
    if (!podeFinalizarCaixa) {
      setErroTela("Voce nao tem permissao para finalizar vendas.");
      return;
    }
    if (!exigirCaixaAberto()) return;

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      if (configCaixa?.exigir_cliente_na_venda && !comandaSelecionada.id_cliente) {
        throw new Error("Esta venda exige cliente vinculado antes da finalizacao.");
      }

      const numeroAtual = comandaSelecionada.numero;
      const result = await processarCaixa({
        acao: "finalizar_comanda",
      });

      await carregarTudo();
      await carregarSessaoOperacional();
      limparComandaSelecionada();
      const avisos = [result.warning].filter(Boolean);
      setMsg(
        avisos.length > 0
          ? `Comanda #${numeroAtual} finalizada, mas ${avisos.join(" / ")}`
          : `Comanda #${numeroAtual} finalizada com sucesso.`
      );
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao finalizar comanda.");
    } finally {
      setSaving(false);
    }
  }

  function abrirModalCancelamento() {
    if (!comandaSelecionada) return;
    if (!podeFinalizarCaixa) {
      setErroTela("Voce nao tem permissao para cancelar comandas.");
      return;
    }

    setCancelModalOpen(true);
  }

  function fecharModalCancelamento() {
    if (saving) return;
    setCancelModalOpen(false);
  }

  async function confirmarCancelamentoComanda(motivoFinal: string | null) {
    if (!comandaSelecionada) return;
    if (!podeFinalizarCaixa) {
      setErroTela("Voce nao tem permissao para cancelar comandas.");
      return;
    }

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      await processarCaixa({
        acao: "cancelar_comanda",
        motivo: motivoFinal,
      });

      await carregarTudo();
      limparComandaSelecionada();
      setCancelModalOpen(false);
      setMsg("Comanda cancelada com sucesso.");
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao cancelar comanda.");
    } finally {
      setSaving(false);
    }
  }

  function abrirModalNovoItem(tipo: TipoItemComanda) {
    if (!comandaSelecionada) return;
    if (!podeEditarCaixa) {
      setErroTela("Voce nao tem permissao para adicionar itens.");
      return;
    }
    if (!exigirCaixaAberto()) return;

    setItemModal({
      ...INITIAL_MODAL_ITEM_STATE,
      open: true,
      tipoItem: tipo,
    });
  }

  function abrirModalEditarItem(item: ComandaItem) {
    if (!podeEditarCaixa) {
      setErroTela("Voce nao tem permissao para editar itens.");
      return;
    }
    if (!exigirCaixaAberto()) return;

    setItemModal({
      ...INITIAL_MODAL_ITEM_STATE,
      open: true,
      mode: "edit",
      itemId: item.id,
      tipoItem: item.tipo_item,
      catalogoId:
        item.tipo_item === "servico"
          ? item.id_servico || ""
          : item.tipo_item === "produto"
          ? item.id_produto || ""
          : item.id_extra || "",
      descricao: item.descricao || "",
      quantidade: String(Number(item.quantidade || 1)),
      valorUnitario: Number(item.valor_unitario || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      idProfissional: item.id_profissional || "",
      idAssistente: item.id_assistente || "",
    });
  }

  function fecharModalItem() {
    if (saving) return;
    setItemModal(INITIAL_MODAL_ITEM_STATE);
  }

  async function salvarItemComanda() {
    if (!comandaSelecionada) return;
    if (!podeEditarCaixa) {
      setErroTela("Voce nao tem permissao para editar itens.");
      return;
    }
    if (!exigirCaixaAberto()) return;

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const quantidade = Math.max(Number(itemModal.quantidade || 1), 1);
      const valorUnitario = parseMoney(itemModal.valorUnitario);
      if (!itemModal.descricao.trim()) {
        throw new Error("Informe a descricao do item.");
      }

      if (valorUnitario < 0) {
        throw new Error("Informe um valor unitario valido.");
      }

      const itemPayload = {
        idItem: itemModal.itemId,
        tipo_item: itemModal.tipoItem,
        id_servico:
          itemModal.tipoItem === "servico" ? itemModal.catalogoId || null : null,
        id_produto:
          itemModal.tipoItem === "produto" ? itemModal.catalogoId || null : null,
        descricao: itemModal.descricao.trim(),
        quantidade,
        valor_unitario: valorUnitario,
        custo_total:
          itemModal.tipoItem === "ajuste" || itemModal.tipoItem === "extra"
            ? 0
            : undefined,
        id_profissional: itemModal.idProfissional || null,
        id_assistente: itemModal.idAssistente || null,
        origem: "caixa_manual",
      };

      await processarComanda({
        acao:
          itemModal.mode === "edit" && itemModal.itemId
            ? "editar_item"
            : "adicionar_item",
        item: itemPayload,
      });

      await aplicarDetalheComanda(comandaSelecionada.id);
      await carregarTudo();
      fecharModalItem();
      setMsg(
        itemModal.mode === "edit" && itemModal.itemId
          ? "Item atualizado com sucesso."
          : "Item adicionado com sucesso."
      );
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao salvar item da comanda.");
    } finally {
      setSaving(false);
    }
  }

  async function removerItemComanda(idItem: string) {
    if (!comandaSelecionada) return;
    if (!podeEditarCaixa) {
      setErroTela("Voce nao tem permissao para remover itens.");
      return;
    }
    if (!exigirCaixaAberto()) return;

    const confirmar = window.confirm("Deseja remover este item da comanda?");
    if (!confirmar) return;

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      await processarComanda({
        acao: "remover_item",
        item: {
          idItem,
        },
      });

      await aplicarDetalheComanda(comandaSelecionada.id);
      await carregarTudo();
      setMsg("Item removido com sucesso.");
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao remover item da comanda.");
    } finally {
      setSaving(false);
    }
  }

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

  if (loading || !acessoCarregado) {
    return <div className="p-6">Carregando caixa...</div>;
  }

  if (!podeVerCaixa) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Voce nao tem permissao para acessar o caixa.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white">
        <div className="mx-auto max-w-[1700px] space-y-5">
          <CaixaHeader
            agendamentosPendentes={agendamentosFila.length}
            comandasAtivas={comandasFila.length}
            comandasFechadasHoje={comandasFechadas.length}
            totalEmAberto={comandasFila.length + agendamentosFila.length}
          />

          <CaixaSessaoPanel
            sessao={sessaoCaixa}
            movimentacoes={movimentacoesCaixa}
            schemaReady={caixaSchemaReady}
            schemaError={caixaSchemaError}
            profissionais={profissionaisCatalogo}
            saving={saving || !podeOperarCaixa}
            onAbrirCaixa={(payload) => void abrirCaixa(payload)}
            onFecharCaixa={(payload) => void fecharCaixa(payload)}
            onLancamento={(payload) => void lancarMovimentoCaixa(payload)}
          />

          {!podeOperarCaixa ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              Voce esta em modo de <strong>somente leitura</strong> no caixa.
            </div>
          ) : null}

          {erroTela ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {erroTela}
            </div>
          ) : null}

          {msg ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {msg}
            </div>
          ) : null}

          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)_380px]">
            <CaixaFila
              aba={aba}
              setAba={setAba}
              busca={busca}
              setBusca={setBusca}
              comandasFiltradas={comandasFiltradas}
              agendamentosFiltrados={agendamentosFiltrados}
              comandasFechadas={comandasFechadas}
              comandasCanceladas={comandasCanceladas}
              comandaSelecionada={comandaSelecionada}
              onAbrirComanda={abrirComanda}
              onAbrirAgendamentoSemComanda={abrirAgendamentoSemComanda}
            />

            <CaixaDetalhe
              comandaSelecionada={comandaSelecionada}
              itens={itens}
              saving={saving || !podeEditarCaixa}
              faltaReceber={faltaReceber}
              onCancelarComanda={abrirModalCancelamento}
              onFinalizarComanda={finalizarComanda}
              onNovoServico={() => abrirModalNovoItem("servico")}
              onNovoProduto={() => abrirModalNovoItem("produto")}
              onNovoExtra={() => abrirModalNovoItem("extra")}
              onNovoAjuste={() => abrirModalNovoItem("ajuste")}
              onEditarItem={abrirModalEditarItem}
              onRemoverItem={removerItemComanda}
            />

            <div className="space-y-5 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto xl:pr-1">
              <CaixaResumo
                comandaSelecionada={comandaSelecionada}
                descontoInput={descontoInput}
                acrescimoInput={acrescimoInput}
                setDescontoInput={setDescontoInput}
                setAcrescimoInput={setAcrescimoInput}
                onSalvar={salvarDescontoAcrescimo}
                saving={saving || !podeEditarCaixa}
              />

              <CaixaPagamentos
                comandaSelecionada={comandaSelecionada}
                repassaTaxaCliente={Boolean(configCaixa?.repassa_taxa_cliente)}
                pagamentos={pagamentos}
                formaPagamento={formaPagamento}
                setFormaPagamento={setFormaPagamento}
                valorPagamento={valorPagamento}
                setValorPagamento={setValorPagamento}
                parcelas={parcelas}
                setParcelas={setParcelas}
                taxaPercentual={taxaPercentual}
                setTaxaPercentual={setTaxaPercentual}
                observacaoPagamento={observacaoPagamento}
                setObservacaoPagamento={setObservacaoPagamento}
                totalPago={totalPago}
                faltaReceber={faltaReceber}
                troco={troco}
                saving={saving || !podeGerenciarPagamentos}
                onAdicionarPagamento={adicionarPagamento}
                onRemoverPagamento={removerPagamento}
              />
            </div>
          </div>
        </div>
      </div>

      <CaixaCancelModal
        open={cancelModalOpen}
        comandaNumero={comandaSelecionada?.numero}
        saving={saving}
        podeConfirmar={podeFinalizarCaixa}
        onClose={fecharModalCancelamento}
        onConfirm={confirmarCancelamentoComanda}
      />

      <CaixaItemModal
        open={itemModal.open}
        itemModal={itemModal}
        setItemModal={setItemModal}
        comandaSelecionada={comandaSelecionada}
        servicosCatalogo={servicosCatalogo}
        produtosCatalogo={produtosCatalogo}
        extrasCatalogo={extrasCatalogo}
        profissionaisCatalogo={profissionaisCatalogo}
        saving={saving}
        podeEditar={podeEditarCaixa}
        onClose={fecharModalItem}
        onSave={salvarItemComanda}
      />
    </>
  );
}
