"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useRef,
  useState,
} from "react";
import {
  INITIAL_MODAL_ITEM_STATE,
  type ModalItemState,
} from "@/components/caixa/page-types";
import type {
  ComandaDetalhe,
  ComandaItem,
  ConfigCaixaSalao,
  TipoItemComanda,
} from "@/components/caixa/types";
import { imprimirRelatorioFechamentoCaixa } from "@/components/caixa/printFechamentoReport";
import { parseMoney } from "@/components/caixa/utils";
import { getErrorMessage } from "@/components/caixa/useCaixaApi";
import type {
  CaixaMovimentacaoTipo,
  CaixaSessao,
} from "@/lib/caixa/sessaoCaixa";
import { obterTaxaConfigurada } from "@/lib/caixa/taxas";
import type {
  ProcessarCaixaResponse,
  ProcessarCaixaParams,
} from "@/types/caixa";
import type {
  ProcessarComandaParams,
  ProcessarComandaResponse,
} from "@/types/comandas";

type UseCaixaOperationsParams = {
  idSalao: string;
  caixaSchemaReady: boolean;
  caixaAberto: boolean;
  sessaoCaixa: CaixaSessao | null;
  comandaSelecionada: ComandaDetalhe | null;
  configCaixa: ConfigCaixaSalao | null;
  formaPagamento: string;
  parcelas: string;
  valorPagamento: string;
  observacaoPagamento: string;
  descontoInput: string;
  acrescimoInput: string;
  podeOperarCaixa: boolean;
  podeEditarCaixa: boolean;
  podeGerenciarPagamentos: boolean;
  podeFinalizarCaixa: boolean;
  aplicarDetalheComanda: (idComanda: string) => Promise<void>;
  carregarSessaoOperacional: () => Promise<void>;
  carregarTudo: () => Promise<void>;
  limparComandaSelecionada: () => void;
  gerarChaveOperacao: (scope: string) => string;
  limparChaveOperacao: (scope: string) => void;
  processarCaixa: (
    params: ProcessarCaixaParams
  ) => Promise<ProcessarCaixaResponse>;
  processarComanda: (
    params: ProcessarComandaParams
  ) => Promise<ProcessarComandaResponse>;
  setErroTela: (value: string) => void;
  setMsg: (value: string) => void;
  setTaxaPercentual: (value: string) => void;
  setValorPagamento: (value: string) => void;
  setParcelas: (value: string) => void;
  setObservacaoPagamento: (value: string) => void;
};

export function useCaixaOperations({
  idSalao,
  caixaSchemaReady,
  caixaAberto,
  sessaoCaixa,
  comandaSelecionada,
  configCaixa,
  formaPagamento,
  parcelas,
  valorPagamento,
  observacaoPagamento,
  descontoInput,
  acrescimoInput,
  podeOperarCaixa,
  podeEditarCaixa,
  podeGerenciarPagamentos,
  podeFinalizarCaixa,
  aplicarDetalheComanda,
  carregarSessaoOperacional,
  carregarTudo,
  limparComandaSelecionada,
  gerarChaveOperacao,
  limparChaveOperacao,
  processarCaixa,
  processarComanda,
  setErroTela,
  setMsg,
  setTaxaPercentual,
  setValorPagamento,
  setParcelas,
  setObservacaoPagamento,
}: UseCaixaOperationsParams) {
  const [saving, setSaving] = useState(false);
  const [itemParaRemover, setItemParaRemover] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [itemModalState, setItemModalState] =
    useState<ModalItemState>(INITIAL_MODAL_ITEM_STATE);
  const actionLocksRef = useRef<Record<string, boolean>>({});

  const syncItemModal = useCallback(
    (
      updater: SetStateAction<ModalItemState>
    ) => {
      if (typeof updater === "function") {
        setItemModalState((current) => updater(current));
        return;
      }

      setItemModalState(updater);
    },
    []
  );

  const tryLockAction = useCallback((action: string) => {
    if (actionLocksRef.current[action]) {
      return false;
    }

    actionLocksRef.current[action] = true;
    return true;
  }, []);

  const unlockAction = useCallback((action: string) => {
    delete actionLocksRef.current[action];
  }, []);

  const exigirCaixaAberto = useCallback(() => {
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
  }, [caixaAberto, caixaSchemaReady, sessaoCaixa, setErroTela]);

  const abrirCaixa = useCallback(
    async (payload: { valorAbertura: number; observacoes: string }) => {
      if (!podeOperarCaixa) {
        setErroTela("Você não tem permissão para abrir o caixa.");
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
      } catch (error: unknown) {
        console.error(error);
        setErroTela(getErrorMessage(error, "Erro ao abrir caixa."));
      } finally {
        setSaving(false);
      }
    },
    [carregarSessaoOperacional, podeOperarCaixa, processarCaixa, setErroTela, setMsg]
  );

  const fecharCaixa = useCallback(
    async (payload: { valorFechamento: number; observacoes: string }) => {
      if (!sessaoCaixa) return;
      if (!podeFinalizarCaixa) {
        setErroTela("Você não tem permissão para fechar o caixa.");
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
        await imprimirRelatorioFechamentoCaixa({
          idSalao,
          sessao: {
            ...sessaoCaixa,
            fechado_em: new Date().toISOString(),
          },
          valorFechamento: payload.valorFechamento,
          observacoes: payload.observacoes,
        });
        setMsg("Caixa fechado com sucesso. O relatorio de fechamento foi enviado para impressao.");
      } catch (error: unknown) {
        console.error(error);
        setErroTela(getErrorMessage(error, "Erro ao fechar caixa."));
      } finally {
        setSaving(false);
      }
    },
    [
      carregarSessaoOperacional,
      idSalao,
      podeFinalizarCaixa,
      processarCaixa,
      sessaoCaixa,
      setErroTela,
      setMsg,
    ]
  );

  const lancarMovimentoCaixa = useCallback(
    async (payload: {
      tipo: CaixaMovimentacaoTipo;
      valor: number;
      descricao: string;
      idProfissional?: string | null;
    }) => {
      if (!exigirCaixaAberto() || !sessaoCaixa) return;

      if (payload.valor <= 0) {
        setErroTela("Informe um valor válido para o movimento.");
        return;
      }

      if (payload.tipo === "vale_profissional" && !payload.idProfissional) {
        setErroTela("Selecione o profissional para lançar o vale.");
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
            ? "Vale lançado e preparado para desconto no fechamento de comissão."
            : "Movimento do caixa lançado."
        );
      } catch (error: unknown) {
        console.error(error);
        setErroTela(getErrorMessage(error, "Erro ao lançar movimento do caixa."));
      } finally {
        if (completed) {
          limparChaveOperacao(operationScope);
        }
        setSaving(false);
      }
    },
    [
      carregarSessaoOperacional,
      exigirCaixaAberto,
      gerarChaveOperacao,
      limparChaveOperacao,
      processarCaixa,
      sessaoCaixa,
      setErroTela,
      setMsg,
    ]
  );

  const abrirComanda = useCallback(
    async (idComanda: string) => {
      if (!podeOperarCaixa) {
        setErroTela("Você não tem permissão para operar o caixa.");
        return;
      }
      if (!exigirCaixaAberto()) return;

      try {
        setSaving(true);
        setErroTela("");
        setMsg("");
        await aplicarDetalheComanda(idComanda);
      } catch (error: unknown) {
        console.error(error);
        setErroTela(getErrorMessage(error, "Erro ao abrir comanda."));
      } finally {
        setSaving(false);
      }
    },
    [aplicarDetalheComanda, exigirCaixaAberto, podeOperarCaixa, setErroTela, setMsg]
  );

  const abrirAgendamentoSemComanda = useCallback(
    async (agendamentoId: string) => {
      if (!podeOperarCaixa) {
        setErroTela("Você não tem permissão para operar o caixa.");
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
          throw new Error("Não foi possível obter a comanda criada.");
        }

        await carregarTudo();
        await aplicarDetalheComanda(idComanda);
        setMsg(
          result.jaExistia
            ? "Comanda existente aberta com sucesso."
            : "Comanda criada a partir do agendamento."
        );
      } catch (error: unknown) {
        console.error(error);
        setErroTela(getErrorMessage(error, "Erro ao abrir agendamento no caixa."));
      } finally {
        setSaving(false);
      }
    },
    [
      aplicarDetalheComanda,
      carregarTudo,
      exigirCaixaAberto,
      podeOperarCaixa,
      processarComanda,
      setErroTela,
      setMsg,
    ]
  );

  const salvarDescontoAcrescimo = useCallback(async () => {
    if (!comandaSelecionada) return;
    if (!podeEditarCaixa) {
      setErroTela("Você não tem permissão para editar o caixa.");
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
    } catch (error: unknown) {
      console.error(error);
      setErroTela(getErrorMessage(error, "Erro ao atualizar resumo."));
    } finally {
      setSaving(false);
    }
  }, [
    acrescimoInput,
    aplicarDetalheComanda,
    carregarTudo,
    comandaSelecionada,
    descontoInput,
    exigirCaixaAberto,
    podeEditarCaixa,
    processarComanda,
    setErroTela,
    setMsg,
  ]);

  const adicionarPagamento = useCallback(async (options?: {
    destinoExcedente?: "troco" | "credito_cliente";
  }) => {
    if (!comandaSelecionada) return;
    if (!podeGerenciarPagamentos) {
      setErroTela("Você não tem permissão para lançar pagamentos.");
      return;
    }
    if (!exigirCaixaAberto()) return;
    if (!tryLockAction("adicionar_pagamento")) {
      return;
    }

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
        options?.destinoExcedente || "padrao",
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
          destinoExcedente: options?.destinoExcedente,
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
        result.creditoClienteUsado && Number(result.creditoClienteUsado) > 0
          ? `Pagamento concluído com crédito da cliente (${Number(
              result.creditoClienteUsado
            ).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}).`
            : result.valorCreditoGerado && Number(result.valorCreditoGerado) > 0
            ? `Pagamento adicionado e ${Number(
                result.valorCreditoGerado
              ).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })} ficou salvo como crédito da cliente.`
            : result.repassaTaxaCliente && Number(result.taxaValor || 0) > 0
              ? `Pagamento adicionado com taxa repassada ao cliente (${Number(
                  result.taxaValor || 0
                ).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}).`
              : "Pagamento adicionado."
      );
      limparChaveOperacao(operationScope);
    } catch (error: unknown) {
      console.error(error);
      setErroTela(getErrorMessage(error, "Erro ao adicionar pagamento."));
    } finally {
      unlockAction("adicionar_pagamento");
      setSaving(false);
    }
  }, [
    aplicarDetalheComanda,
    carregarSessaoOperacional,
    carregarTudo,
    comandaSelecionada,
    configCaixa,
    exigirCaixaAberto,
    formaPagamento,
    gerarChaveOperacao,
    limparChaveOperacao,
    observacaoPagamento,
    parcelas,
    podeGerenciarPagamentos,
    processarCaixa,
    setObservacaoPagamento,
    setParcelas,
    setTaxaPercentual,
    setValorPagamento,
    setErroTela,
    setMsg,
    tryLockAction,
    unlockAction,
    valorPagamento,
  ]);

  const removerPagamento = useCallback(
    async (idPagamento: string) => {
      if (!comandaSelecionada) return;
      if (!podeGerenciarPagamentos) {
        setErroTela("Você não tem permissão para remover pagamentos.");
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
      } catch (error: unknown) {
        console.error(error);
        setErroTela(getErrorMessage(error, "Erro ao remover pagamento."));
      } finally {
        setSaving(false);
      }
    },
    [
      aplicarDetalheComanda,
      carregarSessaoOperacional,
      comandaSelecionada,
      exigirCaixaAberto,
      podeGerenciarPagamentos,
      processarCaixa,
      setErroTela,
      setMsg,
    ]
  );

  const finalizarComanda = useCallback(async () => {
    if (!comandaSelecionada) return;
    if (!podeFinalizarCaixa) {
      setErroTela("Você não tem permissão para finalizar vendas.");
      return;
    }
    if (!exigirCaixaAberto()) return;
    if (!tryLockAction("finalizar_comanda")) {
      return;
    }

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      if (configCaixa?.exigir_cliente_na_venda && !comandaSelecionada.id_cliente) {
        throw new Error("Esta venda exige cliente vinculado antes da finalização.");
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
    } catch (error: unknown) {
      console.error(error);
      setErroTela(getErrorMessage(error, "Erro ao finalizar comanda."));
    } finally {
      unlockAction("finalizar_comanda");
      setSaving(false);
    }
  }, [
    carregarSessaoOperacional,
    carregarTudo,
    comandaSelecionada,
    configCaixa?.exigir_cliente_na_venda,
    exigirCaixaAberto,
    limparComandaSelecionada,
    podeFinalizarCaixa,
    processarCaixa,
    setErroTela,
    setMsg,
    tryLockAction,
    unlockAction,
  ]);

  const abrirModalCancelamento = useCallback(() => {
    if (!comandaSelecionada) return;
    if (!podeFinalizarCaixa) {
      setErroTela("Você não tem permissão para cancelar comandas.");
      return;
    }

    setCancelModalOpen(true);
  }, [comandaSelecionada, podeFinalizarCaixa, setErroTela]);

  const fecharModalCancelamento = useCallback(() => {
    if (saving) return;
    setCancelModalOpen(false);
  }, [saving]);

  const confirmarCancelamentoComanda = useCallback(
    async (motivoFinal: string | null) => {
      if (!comandaSelecionada) return;
      if (!podeFinalizarCaixa) {
        setErroTela("Você não tem permissão para cancelar comandas.");
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
      } catch (error: unknown) {
        console.error(error);
        setErroTela(getErrorMessage(error, "Erro ao cancelar comanda."));
      } finally {
        setSaving(false);
      }
    },
    [
      carregarTudo,
      comandaSelecionada,
      limparComandaSelecionada,
      podeFinalizarCaixa,
      processarCaixa,
      setErroTela,
      setMsg,
    ]
  );

  const abrirModalNovoItem = useCallback(
    (tipo: TipoItemComanda) => {
      if (!comandaSelecionada) return;
      if (!podeEditarCaixa) {
        setErroTela("Você não tem permissão para adicionar itens.");
        return;
      }
      if (!exigirCaixaAberto()) return;

      setItemModalState({
        ...INITIAL_MODAL_ITEM_STATE,
        open: true,
        tipoItem: tipo,
      });
    },
    [comandaSelecionada, exigirCaixaAberto, podeEditarCaixa, setErroTela]
  );

  const abrirModalEditarItem = useCallback(
    (item: ComandaItem) => {
      if (!podeEditarCaixa) {
        setErroTela("Você não tem permissão para editar itens.");
        return;
      }
      if (!exigirCaixaAberto()) return;

      setItemModalState({
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
    },
    [exigirCaixaAberto, podeEditarCaixa, setErroTela]
  );

  const fecharModalItem = useCallback(() => {
    if (saving) return;
    setItemModalState(INITIAL_MODAL_ITEM_STATE);
  }, [saving]);

  const salvarItemComanda = useCallback(async () => {
    if (!comandaSelecionada) return;
    if (!podeEditarCaixa) {
      setErroTela("Você não tem permissão para editar itens.");
      return;
    }
    if (!exigirCaixaAberto()) return;

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const quantidade = Math.max(Number(itemModalState.quantidade || 1), 1);
      const valorUnitario = parseMoney(itemModalState.valorUnitario);
      if (!itemModalState.descricao.trim()) {
        throw new Error("Informe a descrição do item.");
      }

      if (valorUnitario < 0) {
        throw new Error("Informe um valor unitário válido.");
      }

      const itemPayload = {
        idItem: itemModalState.itemId,
        tipo_item: itemModalState.tipoItem,
        id_servico:
          itemModalState.tipoItem === "servico"
            ? itemModalState.catalogoId || null
            : null,
        id_produto:
          itemModalState.tipoItem === "produto"
            ? itemModalState.catalogoId || null
            : null,
        descricao: itemModalState.descricao.trim(),
        quantidade,
        valor_unitario: valorUnitario,
        custo_total:
          itemModalState.tipoItem === "ajuste" ||
          itemModalState.tipoItem === "extra"
            ? 0
            : undefined,
        id_profissional: itemModalState.idProfissional || null,
        id_assistente: itemModalState.idAssistente || null,
        origem: "caixa_manual",
      };

      await processarComanda({
        acao:
          itemModalState.mode === "edit" && itemModalState.itemId
            ? "editar_item"
            : "adicionar_item",
        item: itemPayload,
      });

      await aplicarDetalheComanda(comandaSelecionada.id);
      await carregarTudo();
      fecharModalItem();
      setMsg(
        itemModalState.mode === "edit" && itemModalState.itemId
          ? "Item atualizado com sucesso."
          : "Item adicionado com sucesso."
      );
    } catch (error: unknown) {
      console.error(error);
      setErroTela(getErrorMessage(error, "Erro ao salvar item da comanda."));
    } finally {
      setSaving(false);
    }
  }, [
    aplicarDetalheComanda,
    carregarTudo,
    comandaSelecionada,
    exigirCaixaAberto,
    fecharModalItem,
    itemModalState,
    podeEditarCaixa,
    processarComanda,
    setErroTela,
    setMsg,
  ]);

  const removerItemComanda = useCallback(
    async (idItem: string) => {
      if (!comandaSelecionada) return;
      if (!podeEditarCaixa) {
        setErroTela("Você não tem permissão para remover itens.");
        return;
      }
      if (!exigirCaixaAberto()) return;

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

        setItemParaRemover(null);
        await aplicarDetalheComanda(comandaSelecionada.id);
        setMsg("Item removido com sucesso.");
      } catch (error: unknown) {
        console.error(error);
        setErroTela(getErrorMessage(error, "Erro ao remover item da comanda."));
      } finally {
        setSaving(false);
      }
    },
    [
      aplicarDetalheComanda,
      comandaSelecionada,
      exigirCaixaAberto,
      podeEditarCaixa,
      processarComanda,
      setErroTela,
      setItemParaRemover,
      setMsg,
    ]
  );

  return {
    saving,
    itemParaRemover,
    setItemParaRemover,
    cancelModalOpen,
    itemModal: itemModalState,
    setItemModal: syncItemModal as Dispatch<SetStateAction<ModalItemState>>,
    abrirCaixa,
    fecharCaixa,
    lancarMovimentoCaixa,
    abrirComanda,
    abrirAgendamentoSemComanda,
    salvarDescontoAcrescimo,
    adicionarPagamento,
    removerPagamento,
    finalizarComanda,
    abrirModalCancelamento,
    fecharModalCancelamento,
    confirmarCancelamentoComanda,
    abrirModalNovoItem,
    abrirModalEditarItem,
    fecharModalItem,
    salvarItemComanda,
    removerItemComanda,
  };
}
