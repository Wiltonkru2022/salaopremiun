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
import AppLoading from "@/components/ui/AppLoading";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import { useCaixaApi } from "@/components/caixa/useCaixaApi";
import { useCaixaLoaders } from "@/components/caixa/useCaixaLoaders";
import { useCaixaOperations } from "@/components/caixa/useCaixaOperations";
import { useCaixaPageState } from "@/components/caixa/useCaixaPageState";

export default function CaixaPage() {
  const router = useRouter();
  const [pagamentosOpen, setPagamentosOpen] = useState(false);
  const [sessaoOpen, setSessaoOpen] = useState(false);
  const {
    supabase,
    requestedComandaId,
    requestedAgendamentoId,
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

  const {
    gerarChaveOperacao,
    limparChaveOperacao,
    processarComanda,
    processarCaixa,
  } = useCaixaApi({ idSalao, comandaSelecionada, sessaoCaixa });

  const {
    aplicarDetalheComanda,
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

      void carregarTudo(idSalao);
      void carregarSessaoOperacional(idSalao);

      if (comandaSelecionada?.id) {
        void aplicarDetalheComanda(comandaSelecionada.id);
      }
    };

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void carregarTudo(idSalao);
      void carregarSessaoOperacional(idSalao);

      if (comandaSelecionada?.id) {
        void aplicarDetalheComanda(comandaSelecionada.id);
      }
    }, 15000);

    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [
    acessoCarregado,
    idSalao,
    loading,
    saving,
    carregarTudo,
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

  if (loading || !acessoCarregado) {
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
      <div className="h-screen overflow-hidden bg-[#f4f5f7] text-[var(--app-ink)]">
        <div className="mx-auto h-full max-w-[1920px] p-4">
          <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
            <CaixaHeader
              agendamentosPendentes={agendamentosFila.length}
              comandasAtivas={comandasFila.length}
              comandasFechadasHoje={comandasFechadas.length}
              totalEmAberto={comandasFila.length + agendamentosFila.length}
              caixaAberto={caixaAberto}
              onAbrirSessao={() => setSessaoOpen(true)}
            />

            {!podeOperarCaixa || erroTela || msg || comandaSelecionada ? (
              <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
                <div className="flex min-h-[48px] items-center rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-600 shadow-sm">
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
                          "Abrindo comanda..."
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
                    className={`flex min-h-[48px] items-center rounded-2xl border px-4 py-2.5 text-sm shadow-sm ${
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

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[330px_minmax(0,1fr)_360px]">
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
                onNovoProduto={() => abrirModalNovoItem("produto")}
                onNovoExtra={() => abrirModalNovoItem("extra")}
                onNovoAjuste={() => abrirModalNovoItem("ajuste")}
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
