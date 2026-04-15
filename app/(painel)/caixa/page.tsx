"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CaixaCancelModal from "@/components/caixa/CaixaCancelModal";
import CaixaDetalhe from "@/components/caixa/CaixaDetalhe";
import CaixaFila from "@/components/caixa/CaixaFila";
import CaixaHeader from "@/components/caixa/CaixaHeader";
import CaixaItemModal from "@/components/caixa/CaixaItemModal";
import CaixaPagamentos from "@/components/caixa/CaixaPagamentos";
import CaixaResumo from "@/components/caixa/CaixaResumo";
import {
  INITIAL_MODAL_ITEM_STATE,
  type ModalItemState,
} from "@/components/caixa/page-types";
import { type Permissoes } from "@/components/caixa/permissions";
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
  obterTaxaConfigurada,
  parseMoney,
} from "@/components/caixa/utils";
import { buildComandaItemPayload } from "@/lib/caixa/buildComandaItemPayload";
import {
  carregarAcessoCaixa,
  carregarCatalogosCaixa,
  carregarComandaDetalhe,
  carregarConfiguracoesCaixa as carregarConfiguracoesCaixaData,
  carregarListasCaixa,
} from "@/lib/caixa/loadCaixaData";
import { createClient } from "@/lib/supabase/client";

export default function CaixaPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erroTela, setErroTela] = useState("");
  const [msg, setMsg] = useState("");
  const [idSalao, setIdSalao] = useState("");

  const [permissoes, setPermissoes] = useState<Permissoes | null>(null);
  const [acessoCarregado, setAcessoCarregado] = useState(false);

  const [configCaixa, setConfigCaixa] = useState<ConfigCaixaSalao | null>(null);

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

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      ]);
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

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const { data, error } = await supabase.rpc("fn_criar_comanda_por_agendamento", {
        p_id_agendamento: agendamentoId,
      });

      if (error) {
        throw new Error(error.message || "Erro ao criar comanda do agendamento.");
      }

      const idComanda = data?.id_comanda;
      if (!idComanda) {
        throw new Error("Nao foi possivel obter a comanda criada.");
      }

      await carregarTudo();
      await aplicarDetalheComanda(idComanda);
      setMsg(
        data?.ja_existia
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

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const desconto = parseMoney(descontoInput);
      const acrescimo = parseMoney(acrescimoInput);

      const { error } = await supabase
        .from("comandas")
        .update({
          desconto,
          acrescimo,
        })
        .eq("id", comandaSelecionada.id);

      if (error) {
        throw new Error("Erro ao atualizar desconto/acrescimo.");
      }

      await supabase.rpc("fn_recalcular_total_comanda", {
        p_id_comanda: comandaSelecionada.id,
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

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const valorBase = parseMoney(valorPagamento);
      const numeroParcelas = Math.max(Number(parcelas || 1), 1);

      if (valorBase <= 0) {
        throw new Error("Informe um valor de pagamento valido.");
      }

      const taxa = obterTaxaConfigurada(formaPagamento, numeroParcelas, configCaixa);
      const taxaValor = Number(((valorBase * taxa) / 100).toFixed(2));

      const repassaTaxaCliente = Boolean(configCaixa?.repassa_taxa_cliente);
      const valorFinalCobrado = repassaTaxaCliente
        ? Number((valorBase + taxaValor).toFixed(2))
        : valorBase;

      const { error } = await supabase.from("comanda_pagamentos").insert({
        id_salao: idSalao,
        id_comanda: comandaSelecionada.id,
        forma_pagamento: formaPagamento,
        valor: valorFinalCobrado,
        parcelas: numeroParcelas,
        taxa_maquininha_percentual: taxa,
        taxa_maquininha_valor: taxaValor,
        observacoes: observacaoPagamento || null,
      });

      if (error) {
        throw new Error(error.message || "Erro ao adicionar pagamento.");
      }

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
      setMsg(
        repassaTaxaCliente && taxaValor > 0
          ? `Pagamento adicionado com taxa repassada ao cliente (${taxaValor.toLocaleString(
              "pt-BR",
              {
                style: "currency",
                currency: "BRL",
              }
            )}).`
          : "Pagamento adicionado."
      );
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

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const { error } = await supabase
        .from("comanda_pagamentos")
        .delete()
        .eq("id", idPagamento)
        .eq("id_comanda", comandaSelecionada.id);

      if (error) {
        throw new Error("Erro ao remover pagamento.");
      }

      await aplicarDetalheComanda(comandaSelecionada.id);
      setMsg("Pagamento removido.");
    } catch (error: any) {
      console.error(error);
      setErroTela(error?.message || "Erro ao remover pagamento.");
    } finally {
      setSaving(false);
    }
  }

  async function recalcularTaxaProfissionalAposFechamento(idComanda: string) {
    const response = await fetch("/api/comissoes/recalcular-taxa-profissional", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idSalao,
        idComanda,
      }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(result?.error || "nao foi possivel recalcular a taxa da comissao.");
    }
  }

  async function finalizarComanda() {
    if (!comandaSelecionada) return;
    if (!podeFinalizarCaixa) {
      setErroTela("Voce nao tem permissao para finalizar vendas.");
      return;
    }

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      if (configCaixa?.exigir_cliente_na_venda && !comandaSelecionada.id_cliente) {
        throw new Error("Esta venda exige cliente vinculado antes da finalizacao.");
      }

      const numeroAtual = comandaSelecionada.numero;

      const { error } = await supabase.rpc("fn_fechar_comanda", {
        p_id_comanda: comandaSelecionada.id,
      });

      if (error) {
        throw new Error(error.message || "Erro ao finalizar comanda.");
      }

      let avisoRecalculo = "";

      try {
        await recalcularTaxaProfissionalAposFechamento(comandaSelecionada.id);
      } catch (recalculoError: any) {
        avisoRecalculo =
          recalculoError?.message || "nao foi possivel recalcular a taxa da comissao.";
      }

      await carregarTudo();
      limparComandaSelecionada();
      setMsg(
        avisoRecalculo
          ? `Comanda #${numeroAtual} finalizada, mas ${avisoRecalculo}`
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

      const { error } = await supabase.rpc("fn_cancelar_comanda", {
        p_id_comanda: comandaSelecionada.id,
        p_motivo: motivoFinal,
      });

      if (error) {
        throw new Error(error.message || "Erro ao cancelar comanda.");
      }

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

    setItemModal({
      ...INITIAL_MODAL_ITEM_STATE,
      open: true,
      mode: "edit",
      itemId: item.id,
      tipoItem: item.tipo_item,
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

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const quantidade = Math.max(Number(itemModal.quantidade || 1), 1);
      const valorUnitario = parseMoney(itemModal.valorUnitario);
      const valorTotal = Number((quantidade * valorUnitario).toFixed(2));

      if (!itemModal.descricao.trim()) {
        throw new Error("Informe a descricao do item.");
      }

      if (valorUnitario < 0) {
        throw new Error("Informe um valor unitario valido.");
      }

      const payloadBase = await buildComandaItemPayload({
        supabase,
        idSalao,
        idComanda: comandaSelecionada.id,
        itemModal,
        servicosCatalogo,
        profissionaisCatalogo,
        quantidade,
        valorUnitario,
        valorTotal,
      });

      if (itemModal.mode === "edit" && itemModal.itemId) {
        const { error } = await supabase
          .from("comanda_itens")
          .update({
            ...payloadBase,
            updated_at: new Date().toISOString(),
          })
          .eq("id", itemModal.itemId)
          .eq("id_comanda", comandaSelecionada.id);

        if (error) {
          console.error(error);
          throw new Error(error.message || "Erro ao atualizar item.");
        }

        await supabase.rpc("fn_recalcular_total_comanda", {
          p_id_comanda: comandaSelecionada.id,
        });

        await aplicarDetalheComanda(comandaSelecionada.id);
        await carregarTudo();
        fecharModalItem();
        setMsg("Item atualizado com sucesso.");
        return;
      }

      const { error } = await supabase.from("comanda_itens").insert(payloadBase);

      if (error) {
        console.error(error);
        throw new Error(error.message || "Erro ao adicionar item.");
      }

      await supabase.rpc("fn_recalcular_total_comanda", {
        p_id_comanda: comandaSelecionada.id,
      });

      await aplicarDetalheComanda(comandaSelecionada.id);
      await carregarTudo();
      fecharModalItem();
      setMsg("Item adicionado com sucesso.");
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

    const confirmar = window.confirm("Deseja remover este item da comanda?");
    if (!confirmar) return;

    try {
      setSaving(true);
      setErroTela("");
      setMsg("");

      const { error } = await supabase
        .from("comanda_itens")
        .delete()
        .eq("id", idItem)
        .eq("id_comanda", comandaSelecionada.id);

      if (error) {
        throw new Error(error.message || "Erro ao remover item.");
      }

      await supabase.rpc("fn_recalcular_total_comanda", {
        p_id_comanda: comandaSelecionada.id,
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
      <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
        <div className="mx-auto max-w-[1700px] space-y-5">
          <CaixaHeader totalEmAberto={comandasFila.length + agendamentosFila.length} />

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

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)_380px]">
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

            <div className="space-y-5">
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
