"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleAlert, CreditCard, WalletCards } from "lucide-react";
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
      <div className="h-screen overflow-hidden bg-[#f4f5f7] text-[var(--app-ink)]">
        <div className="mx-auto h-full max-w-[1880px] p-4">
          <div className="flex h-full flex-col gap-4 overflow-hidden xl:flex-row">
            <div className="min-w-0 flex-1">
              <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
                <CaixaHeader
                  agendamentosPendentes={agendamentosFila.length}
                  comandasAtivas={comandasFila.length}
                  comandasFechadasHoje={comandasFechadas.length}
                  totalEmAberto={comandasFila.length + agendamentosFila.length}
                />

                <div className="grid gap-2.5 lg:grid-cols-3">
                  <GuideCard
                    icon={<WalletCards size={16} />}
                    title={caixaAberto ? "Caixa em operacao" : "Abra o caixa"}
                    description={
                      caixaAberto
                        ? "A sessao esta pronta para receber, movimentar e fechar vendas."
                        : "Abra a sessao do caixa no botao da lateral para liberar a operacao."
                    }
                    tone={caixaAberto ? "emerald" : "amber"}
                  />
                  <GuideCard
                    icon={<CreditCard size={16} />}
                    title={comandaSelecionada ? "Receba pelo modal" : "Escolha uma comanda"}
                    description={
                      comandaSelecionada
                        ? "Pagamento fica em modal para voce receber sem poluir a tela principal."
                        : "Selecione uma comanda na fila para abrir a venda no centro da tela."
                    }
                    tone={comandaSelecionada ? "sky" : "zinc"}
                  />
                  <GuideCard
                    icon={faltaReceber > 0 ? <CircleAlert size={16} /> : <CheckCircle2 size={16} />}
                    title={faltaReceber > 0 ? "Fechamento pendente" : "Pronto para finalizar"}
                    description={
                      faltaReceber > 0
                        ? `Ainda faltam ${faltaReceber.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })} para encerrar a comanda selecionada.`
                        : comandaSelecionada
                          ? "Com a falta a receber zerada, a finalizacao fica simples e direta."
                          : "Quando uma venda entrar em foco, esta faixa mostra se ja pode finalizar."
                    }
                    tone={faltaReceber > 0 ? "amber" : "emerald"}
                  />
                </div>

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

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
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
                </div>
              </div>
            </div>

            <div className="min-h-0 xl:w-[456px] xl:min-w-[456px]">
              <CaixaSidebar
                comandaSelecionada={comandaSelecionada}
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

function GuideCard({
  icon,
  title,
  description,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: "amber" | "emerald" | "sky" | "zinc";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : tone === "sky"
          ? "border-sky-200 bg-sky-50 text-sky-900"
          : "border-zinc-200 bg-white text-zinc-900";

  return (
    <div className={`rounded-[20px] border px-3.5 py-3 shadow-sm ${toneClass}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-white/70 p-2">{icon}</div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-current/75">
            Operacao
          </div>
          <div className="mt-1 text-sm font-semibold text-current">{title}</div>
          <div className="mt-1 text-sm leading-5 text-current/80">{description}</div>
        </div>
      </div>
    </div>
  );
}
