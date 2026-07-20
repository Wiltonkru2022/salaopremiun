"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleAlert } from "lucide-react";
import CaixaCancelModal from "@/components/caixa/CaixaCancelModal";
import CaixaDetalhe from "@/components/caixa/CaixaDetalhe";
import CaixaFila from "@/components/caixa/CaixaFila";
import CaixaHeader from "@/components/caixa/CaixaHeader";
import CaixaItemModal from "@/components/caixa/CaixaItemModal";
import CaixaSidebar from "@/components/caixa/CaixaSidebar";
import { usePainelSession } from "@/components/layout/PainelSessionProvider";
import AppLoading from "@/components/ui/AppLoading";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import { useCaixaApi } from "@/components/caixa/useCaixaApi";
import { useCaixaLoaders } from "@/components/caixa/useCaixaLoaders";
import { useCaixaOperations } from "@/components/caixa/useCaixaOperations";
import { useCaixaPageState } from "@/components/caixa/useCaixaPageState";
import type { ComandaDetalhe } from "@/components/caixa/types";

function montarAvisoReabertura(comanda: ComandaDetalhe) {
  const observacoes = String(comanda.observacoes || "");
  const usuarioMatch = observacoes.match(/\[reabertura\]\s*usuario=(.*?)(?:\s+motivo=|$)/i);
  const usuario = usuarioMatch?.[1]?.trim();

  if (usuario) {
    return `Comanda #${comanda.numero} reaberta pelo usuário ${usuario}.`;
  }

  return `Comanda #${comanda.numero} reaberta para o caixa.`;
}

export default function CaixaPage() {
  const router = useRouter();
  const { snapshot: painelSession } = usePainelSession();
  const [pagamentosOpen, setPagamentosOpen] = useState(false);
  const [sessaoOpen, setSessaoOpen] = useState(false);
  const {
    supabase,
    requestedComandaId,
    requestedAgendamentoId,
    requestedReaberta,
    loading,
    setLoading,
    erroTela,
    setErroTela,
    msg,
    setMsg,
    idSalao,
    setIdSalao,
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
    ultimaSessaoFechadaCaixa,
    setUltimaSessaoFechadaCaixa,
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
    comandaCarregandoId,
    setComandaCarregandoId,
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
    totalCreditoGerado,
    faltaReceber,
    troco,
    creditoClienteDisponivel,
    comandasFiltradas,
    agendamentosFiltrados,
  } = useCaixaPageState();
  const vendaProdutoBloqueadaNoPlano = painelSession?.planoCodigo === "basico";

  const {
    gerarChaveOperacao,
    limparChaveOperacao,
    processarComanda,
    processarCaixa,
  } = useCaixaApi({ idSalao, comandaSelecionada, sessaoCaixa });

  const {
    aplicarDetalheComanda,
    carregarFilaOperacional,
    carregarHistorico,
    carregarSessaoOperacional,
    carregarTudo,
    init,
    limparComandaSelecionada,
  } = useCaixaLoaders({
    supabase,
    router,
    idSalao,
    requestedComandaId,
    setLoading,
    setErroTela,
    setMsg,
    setIdSalao,
    setPermissoes,
    setAcessoCarregado,
    setConfigCaixa,
    setCaixaSchemaReady,
    setCaixaSchemaError,
    setSessaoCaixa,
    setUltimaSessaoFechadaCaixa,
    setMovimentacoesCaixa,
    setAba,
    setComandasFila,
    setAgendamentosFila,
    setComandasFechadas,
    setComandasCanceladas,
    setComandaSelecionada,
    setComandaCarregandoId,
    setItens,
    setPagamentos,
    setDescontoInput,
    setAcrescimoInput,
    setServicosCatalogo,
    setProdutosCatalogo,
    setExtrasCatalogo,
    setProfissionaisCatalogo,
  });

  const {
    saving,
    itemParaRemover,
    setItemParaRemover,
    cancelModalOpen,
    itemModal,
    setItemModal,
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
  } = useCaixaOperations({
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
    totalPago,
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
  });

  const agendamentoAutoOpenRef = useRef<string | null>(null);
  const avisoReaberturaRef = useRef<string | null>(null);
  const lastFocusRefreshAtRef = useRef(0);

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedComandaId, requestedAgendamentoId]);

  useEffect(() => {
    if (!acessoCarregado || !idSalao || loading || saving) {
      return;
    }

    const refreshOnReturn = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      const now = Date.now();
      if (now - lastFocusRefreshAtRef.current < 30000) {
        return;
      }
      lastFocusRefreshAtRef.current = now;

      void carregarTudo(idSalao);
      void carregarSessaoOperacional(idSalao);

      if (comandaSelecionada?.id) {
        void aplicarDetalheComanda(comandaSelecionada.id);
      }
    };

    const hotInterval = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void carregarFilaOperacional(idSalao);
      void carregarSessaoOperacional(idSalao);

      if (comandaSelecionada?.id) {
        void aplicarDetalheComanda(comandaSelecionada.id);
      }
    }, 45000);

    const coldInterval = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void carregarHistorico(idSalao);
    }, 180000);

    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);

    return () => {
      window.clearInterval(hotInterval);
      window.clearInterval(coldInterval);
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [
    acessoCarregado,
    idSalao,
    loading,
    saving,
    carregarTudo,
    carregarFilaOperacional,
    carregarHistorico,
    carregarSessaoOperacional,
    aplicarDetalheComanda,
    comandaSelecionada?.id,
  ]);

  useEffect(() => {
    if (!acessoCarregado || !idSalao || loading || saving) {
      return;
    }

    const refreshFila = () => {
      void carregarFilaOperacional(idSalao);
      void carregarSessaoOperacional(idSalao);

      if (comandaSelecionada?.id) {
        void aplicarDetalheComanda(comandaSelecionada.id);
      }
    };

    const channel = supabase
      .channel(`caixa-comandas-${idSalao}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comandas",
          filter: `id_salao=eq.${idSalao}`,
        },
        refreshFila
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    acessoCarregado,
    idSalao,
    loading,
    saving,
    supabase,
    carregarFilaOperacional,
    carregarSessaoOperacional,
    aplicarDetalheComanda,
    comandaSelecionada?.id,
  ]);

  useEffect(() => {
    if (!requestedAgendamentoId || !acessoCarregado || !caixaAberto || loading) {
      return;
    }

    if (agendamentoAutoOpenRef.current === requestedAgendamentoId) {
      return;
    }

    agendamentoAutoOpenRef.current = requestedAgendamentoId;
    void abrirAgendamentoSemComanda(requestedAgendamentoId);
  }, [
    acessoCarregado,
    abrirAgendamentoSemComanda,
    caixaAberto,
    loading,
    requestedAgendamentoId,
  ]);

  useEffect(() => {
    if (!requestedReaberta || !comandaSelecionada?.id) {
      return;
    }

    if (avisoReaberturaRef.current === comandaSelecionada.id) {
      return;
    }

    avisoReaberturaRef.current = comandaSelecionada.id;
    setMsg(montarAvisoReabertura(comandaSelecionada));
  }, [requestedReaberta, comandaSelecionada, setMsg]);

  if (!acessoCarregado) {
    return (
      <AppLoading
        title="Carregando caixa"
        message="Aguarde enquanto preparamos comandas, fila, pagamentos e resumo financeiro da operação."
        fullHeight={false}
      />
    );
  }

  if (!podeVerCaixa) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          Você não tem permissão para acessar o caixa.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#f6f8fb] text-[var(--app-ink)]">
        <div className="mx-auto max-w-[1680px] p-4 xl:p-6">
          <div className="flex min-h-[calc(100vh-3rem)] flex-col gap-5">
            <CaixaHeader
              agendamentosPendentes={agendamentosFila.length}
              comandasAtivas={comandasFila.length}
              comandasFechadasHoje={comandasFechadas.length}
              totalEmAberto={comandasFila.length + agendamentosFila.length}
              caixaAberto={caixaAberto}
              onAbrirSessao={() => setSessaoOpen(true)}
            />

            {!podeOperarCaixa || erroTela || msg || comandaSelecionada ? (
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="flex min-h-10 items-center rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 shadow-sm">
                  {!podeOperarCaixa ? (
                    <>
                      <CircleAlert size={16} className="mr-2 text-zinc-500" />
                      Você está em modo de <strong className="ml-1">somente leitura</strong> no caixa.
                    </>
                  ) : erroTela ? (
                    <>
                      <CircleAlert size={16} className="mr-2 text-rose-500" />
                      <span className="text-rose-700">{erroTela}</span>
                    </>
                  ) : msg ? (
                    <>
                      <CheckCircle2 size={16} className="mr-2 text-emerald-500" />
                      <span className="text-emerald-700">{msg}</span>
                    </>
                  ) : comandaSelecionada ? (
                    <>
                      <CheckCircle2 size={16} className="mr-2 text-zinc-500" />
                      <span>
                        {comandaCarregandoId === comandaSelecionada.id ? (
                          <span className="inline-flex items-center gap-1 align-middle" aria-label="Abrindo comanda">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
                          </span>
                        ) : (
                          <>
                            Comanda em foco <strong>#{comandaSelecionada.numero}</strong>.{" "}
                          </>
                        )}
                        {faltaReceber > 0
                          ? `Ainda faltam ${faltaReceber.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })} para fechar.`
                          : "Pagamento conferido para finalizar."}
                      </span>
                    </>
                  ) : (
                    <span>Selecione uma comanda para operar no caixa.</span>
                  )}
                </div>
                {comandaSelecionada ? (
                  <div
                    className={`flex min-h-10 items-center rounded-2xl border px-3 py-2 text-xs shadow-sm ${
                      faltaReceber > 0
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800"
                    }`}
                  >
                    {faltaReceber > 0 ? <CircleAlert size={16} className="mr-2" /> : <CheckCircle2 size={16} className="mr-2" />}
                    {faltaReceber > 0 ? "Fechamento pendente" : "Pronto para finalizar"}
                  </div>
                ) : (
                  <div className="hidden xl:block" />
                )}
              </div>
            ) : null}

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
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
                comandaCarregandoId={comandaCarregandoId}
                onAbrirComanda={abrirComanda}
                onAbrirAgendamentoSemComanda={abrirAgendamentoSemComanda}
              />

              <CaixaDetalhe
                comandaSelecionada={comandaSelecionada}
                comandaCarregandoId={comandaCarregandoId}
                itens={itens}
                saving={saving || !podeEditarCaixa}
                faltaReceber={faltaReceber}
                onAbrirPagamento={() => setPagamentosOpen(true)}
                onCancelarComanda={abrirModalCancelamento}
                onFinalizarComanda={finalizarComanda}
                onNovoServico={() => abrirModalNovoItem("servico")}
                onEditarItem={abrirModalEditarItem}
                onRemoverItem={setItemParaRemover}
              />

              <CaixaSidebar
                comandaSelecionada={comandaSelecionada}
                pagamentosOpen={pagamentosOpen}
                setPagamentosOpen={setPagamentosOpen}
                sessaoOpen={sessaoOpen}
                setSessaoOpen={setSessaoOpen}
                configCaixa={configCaixa}
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
                totalCreditoGerado={totalCreditoGerado}
                faltaReceber={faltaReceber}
                troco={troco}
                creditoClienteDisponivel={creditoClienteDisponivel}
                descontoInput={descontoInput}
                setDescontoInput={setDescontoInput}
                acrescimoInput={acrescimoInput}
                setAcrescimoInput={setAcrescimoInput}
                saving={saving}
                podeEditarCaixa={podeEditarCaixa}
                podeGerenciarPagamentos={podeGerenciarPagamentos}
                onSalvarResumo={salvarDescontoAcrescimo}
                onAdicionarPagamento={adicionarPagamento}
                onRemoverPagamento={removerPagamento}
                sessao={sessaoCaixa || ultimaSessaoFechadaCaixa}
                movimentacoes={movimentacoesCaixa}
                schemaReady={caixaSchemaReady}
                schemaError={caixaSchemaError}
                profissionais={profissionaisCatalogo}
                podeOperarCaixa={podeOperarCaixa}
                onAbrirCaixa={(payload) => void abrirCaixa(payload)}
                onFecharCaixa={(payload) => void fecharCaixa(payload)}
                onLancamento={(payload) => void lancarMovimentoCaixa(payload)}
                showPanel={false}
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
        produtoBloqueado={vendaProdutoBloqueadaNoPlano}
        onClose={fecharModalItem}
        onSave={salvarItemComanda}
      />

      <ConfirmActionModal
        open={Boolean(itemParaRemover)}
        title="Remover item"
        description="Confirme a remoção deste item da comanda."
        confirmLabel="Remover item"
        tone="danger"
        loading={saving}
        onClose={() => {
          if (!saving) setItemParaRemover(null);
        }}
        onConfirm={() => {
          if (itemParaRemover) void removerItemComanda(itemParaRemover);
        }}
      />
    </>
  );
}
