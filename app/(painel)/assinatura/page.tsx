"use client";

import AssinaturaCheckoutBox from "@/components/assinatura/AssinaturaCheckoutBox";
import AssinaturaHero from "@/components/assinatura/AssinaturaHero";
import AssinaturaHistoricoModal from "@/components/assinatura/AssinaturaHistoricoModal";
import AssinaturaPlanoAtual from "@/components/assinatura/AssinaturaPlanoAtual";
import AssinaturaPlanosPagamento from "@/components/assinatura/AssinaturaPlanoPagamento";
import AssinaturaStatusCard from "@/components/assinatura/AssinaturaStatusCard";
import { useAssinaturaPage } from "@/components/assinatura/useAssinaturaPage";
import AppLoading from "@/components/ui/AppLoading";

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
    jaPossuiAssinatura,
    jaUsouTrial,
    historicoModalOpen,
    abrirHistoricoModal,
    fecharHistoricoModal,
    carregandoHistorico,
    historicoCobrancas,
    renovacaoAutomatica,
    renovacaoInfo,
    salvandoRenovacaoAutomatica,
    atualizarRenovacaoAutomatica,
    tipoMudancaPlano,
  } = useAssinaturaPage();

  if (loading || !acessoCarregado) {
    return (
      <AppLoading
        title="Carregando assinatura"
        message="Aguarde enquanto consultamos plano, cobrancas, renovacao e historico de pagamentos."
        fullHeight={false}
      />
    );
  }

  if (permissoes && !permissoes.assinatura_ver) {
    return (
      <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm">
        Voce nao tem permissao para acessar Assinatura.
      </div>
    );
  }

  const statusNormalizado = String(assinatura?.status || "").toLowerCase();

  const trialAtivo =
    ["teste_gratis", "trial", "trialing"].includes(statusNormalizado) &&
    !resumoAssinatura.vencida;

  const assinaturaAtiva =
    ["ativo", "ativa", "pago", "active", "paid"].includes(statusNormalizado) &&
    !resumoAssinatura.vencida;

  const mostrarCardAssinaturaAtiva =
    !mostrarSecaoRenovacao && (trialAtivo || assinaturaAtiva);

  return (
    <div className="space-y-4">
      <AssinaturaHero
        assinaturaStatus={assinatura?.status}
        planoAtualNome={planoAtualNome}
        bloqueioTotal={resumoAssinatura.bloqueioTotal}
        vencendoLogo={resumoAssinatura.vencendoLogo}
        renovacaoAutomatica={renovacaoAutomatica}
        renovacaoPodeAlternar={renovacaoInfo.podeAlternar}
        renovacaoTitulo={renovacaoInfo.titulo}
        renovacaoDescricao={renovacaoInfo.descricao}
        renovacaoObservacao={renovacaoInfo.observacao}
        renovacaoTone={renovacaoInfo.tone}
        onToggleRenovacaoAutomatica={atualizarRenovacaoAutomatica}
        salvandoRenovacaoAutomatica={salvandoRenovacaoAutomatica}
        podeGerenciar={podeGerenciar}
        tipoMudancaPlano={tipoMudancaPlano}
      />

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={abrirHistoricoModal}
          className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
        >
          Ver historico de pagamentos
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

      {jaPossuiAssinatura ? (
        <section className="rounded-[24px] border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900 shadow-sm">
          <strong>Voce ja possui uma assinatura.</strong> Escolha o pacote
          desejado abaixo e conclua a cobranca para registrar o upgrade,
          downgrade ou a renovacao do plano atual.
        </section>
      ) : !mostrarBotaoIniciarTrial && jaUsouTrial ? (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 shadow-sm">
          <strong>O teste gratis ja foi usado neste salao.</strong> Agora a
          contratacao segue pelos planos pagos.
        </section>
      ) : null}

      <AssinaturaPlanoAtual
        assinatura={assinatura}
        salao={salao}
        planoAtualNome={planoAtualNome}
        valorAtual={valorAtual}
      />

      {mostrarSecaoRenovacao && !trialAtivo ? (
        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
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
            planoAtual={assinatura?.plano || null}
            planoSelecionado={planoSelecionado}
          />
        </section>
      ) : mostrarCardAssinaturaAtiva ? (
        <section className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-bold text-zinc-950">
            {trialAtivo ? "Teste gratis ativo" : "Assinatura ativa"}
          </h2>

          <p className="mt-2 text-sm text-zinc-500">
            {trialAtivo
              ? "Seu teste esta liberado. A area de renovacao aparecera quando o periodo terminar."
              : "Seu acesso esta liberado. A area de renovacao aparecera apenas quando estiver perto do vencimento ou se houver cobranca pendente."}
          </p>

          {resumoAssinatura.diasRestantes != null ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
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
