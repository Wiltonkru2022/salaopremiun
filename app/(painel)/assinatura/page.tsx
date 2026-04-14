"use client";

import AssinaturaCheckoutBox from "@/components/assinatura/AssinaturaCheckoutBox";
import AssinaturaHero from "@/components/assinatura/AssinaturaHero";
import AssinaturaHistoricoModal from "@/components/assinatura/AssinaturaHistoricoModal";
import AssinaturaPlanoAtual from "@/components/assinatura/AssinaturaPlanoAtual";
import AssinaturaPlanosPagamento from "@/components/assinatura/AssinaturaPlanoPagamento";
import AssinaturaStatusCard from "@/components/assinatura/AssinaturaStatusCard";
import { useAssinaturaPage } from "@/components/assinatura/useAssinaturaPage";

export default function AssinaturaPage() {
  const {
    loading,
    gerandoCobranca,
    verificandoAgora,
    iniciandoTrial,
    erro,
    salao,
    assinatura,
    checkout,
    planoSelecionado,
    setPlanoSelecionado,
    billingType,
    setBillingType,
    aguardandoPagamento,
    permissoes,
    acessoCarregado,
    cardForm,
    setCardForm,
    podeGerenciar,
    verificarPagamentoAgora,
    criarCobrancaAssinatura,
    copiarPix,
    iniciarTrial,
    planoAtualNome,
    valorAtual,
    resumoAssinatura,
    mostrarBotaoRegularizar,
    mostrarBotaoIniciarTrial,
    esconderBotaoPadraoRenovacao,
    mostrarSecaoRenovacao,
    historicoModalOpen,
    abrirHistoricoModal,
    fecharHistoricoModal,
    carregandoHistorico,
    historicoCobrancas,
    renovacaoAutomatica,
    salvandoRenovacaoAutomatica,
    atualizarRenovacaoAutomatica,
    tipoMudancaPlano,
  } = useAssinaturaPage();

  if (loading || !acessoCarregado) {
    return (
      <div className="rounded-[28px] border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm">
        Carregando dados da assinatura...
      </div>
    );
  }

  if (permissoes && !permissoes.assinatura_ver) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
        Você não tem permissão para acessar Assinatura.
      </div>
    );
  }

  const statusNormalizado = String(assinatura?.status || "").toLowerCase();

  const trialAtivo =
    ["teste_gratis", "trial"].includes(statusNormalizado) &&
    !resumoAssinatura.vencida;

  const assinaturaAtiva =
    ["ativo", "ativa", "pago"].includes(statusNormalizado) &&
    !resumoAssinatura.vencida;

  const mostrarCardAssinaturaAtiva =
    !mostrarSecaoRenovacao && (trialAtivo || assinaturaAtiva);

  return (
    <div className="space-y-6">
      <AssinaturaHero
        assinaturaStatus={assinatura?.status}
        planoAtualNome={planoAtualNome}
        bloqueioTotal={resumoAssinatura.bloqueioTotal}
        vencendoLogo={resumoAssinatura.vencendoLogo}
        renovacaoAutomatica={renovacaoAutomatica}
        onToggleRenovacaoAutomatica={atualizarRenovacaoAutomatica}
        salvandoRenovacaoAutomatica={salvandoRenovacaoAutomatica}
        podeGerenciar={podeGerenciar}
        tipoMudancaPlano={tipoMudancaPlano}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={abrirHistoricoModal}
          className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
        >
          Ver histórico de pagamentos
        </button>
      </div>

      <AssinaturaStatusCard
        podeGerenciar={podeGerenciar}
        erro={erro}
        resumoAssinatura={resumoAssinatura}
        mostrarBotaoRegularizar={mostrarBotaoRegularizar}
        mostrarBotaoIniciarTrial={mostrarBotaoIniciarTrial}
        gerandoCobranca={gerandoCobranca}
        iniciandoTrial={iniciandoTrial}
        billingType={billingType}
        criarCobrancaAssinatura={criarCobrancaAssinatura}
        iniciarTrial={iniciarTrial}
        aguardandoPagamento={aguardandoPagamento}
        verificandoAgora={verificandoAgora}
        verificarPagamentoAgora={verificarPagamentoAgora}
      />

      <AssinaturaPlanoAtual
        assinatura={assinatura}
        salao={salao}
        planoAtualNome={planoAtualNome}
        valorAtual={valorAtual}
      />

      {mostrarSecaoRenovacao && !trialAtivo ? (
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <AssinaturaPlanosPagamento
            podeGerenciar={podeGerenciar}
            planoSelecionado={planoSelecionado}
            setPlanoSelecionado={setPlanoSelecionado}
            planoAtual={assinatura?.plano || null}
            billingType={billingType}
            setBillingType={setBillingType}
            cardForm={cardForm}
            setCardForm={setCardForm}
            esconderBotaoPadraoRenovacao={esconderBotaoPadraoRenovacao}
            gerandoCobranca={gerandoCobranca}
            criarCobrancaAssinatura={criarCobrancaAssinatura}
          />

          <AssinaturaCheckoutBox
            checkout={checkout}
            copiarPix={copiarPix}
          />
        </section>
      ) : mostrarCardAssinaturaAtiva ? (
        <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-zinc-950">
            {trialAtivo ? "Teste grátis ativo" : "Assinatura ativa"}
          </h2>

          <p className="mt-2 text-sm text-zinc-500">
            {trialAtivo
              ? "Seu teste está liberado. A área de renovação aparecerá quando o período terminar."
              : "Seu acesso está liberado. A área de renovação aparecerá apenas quando estiver perto do vencimento ou se houver cobrança pendente."}
          </p>

          {resumoAssinatura.diasRestantes != null ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Restam {resumoAssinatura.diasRestantes} dia(s) para o vencimento.
            </div>
          ) : null}
        </section>
      ) : null}

      <AssinaturaHistoricoModal
        open={historicoModalOpen}
        onClose={fecharHistoricoModal}
        loading={carregandoHistorico}
        historico={historicoCobrancas}
      />
    </div>
  );
}