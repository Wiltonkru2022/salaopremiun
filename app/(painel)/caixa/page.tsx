"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import CaixaCancelModal from "@/components/caixa/CaixaCancelModal";
import CaixaDetalhe from "@/components/caixa/CaixaDetalhe";
import CaixaFila from "@/components/caixa/CaixaFila";
import CaixaHeader from "@/components/caixa/CaixaHeader";
import CaixaItemModal from "@/components/caixa/CaixaItemModal";
import CaixaPagamentos from "@/components/caixa/CaixaPagamentos";
import CaixaResumo from "@/components/caixa/CaixaResumo";
import CaixaSessaoPanel from "@/components/caixa/CaixaSessaoPanel";
import AppLoading from "@/components/ui/AppLoading";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import { useCaixaApi } from "@/components/caixa/useCaixaApi";
import { useCaixaLoaders } from "@/components/caixa/useCaixaLoaders";
import { useCaixaOperations } from "@/components/caixa/useCaixaOperations";
import { useCaixaPageState } from "@/components/caixa/useCaixaPageState";

export default function CaixaPage() {
  const router = useRouter();
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
    setMovimentacoesCaixa,
    setAba,
    setComandasFila,
    setAgendamentosFila,
    setComandasFechadas,
    setComandasCanceladas,
    setComandaSelecionada,
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
        message="Aguarde enquanto preparamos comandas, fila, pagamentos e resumo financeiro da operacao."
        fullHeight={false}
      />
    );
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
              onRemoverItem={setItemParaRemover}
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
