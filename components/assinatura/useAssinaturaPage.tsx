"use client";

import {
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getResumoAssinatura } from "@/lib/assinatura-utils";
import { useAssinaturaAccess } from "./useAssinaturaAccess";
import { useAssinaturaCheckout } from "./useAssinaturaCheckout";
import { useAssinaturaHistorico } from "./useAssinaturaHistorico";
import { useRenovacaoAutomatica } from "./useRenovacaoAutomatica";
import { useAssinaturaStatus } from "./useAssinaturaStatus";
import {
  PLANOS_INFO,
  type BillingType,
  type CardForm,
} from "./types";
import {
  normalizarPlanoCobravel,
  type PlanoCobravel,
} from "./plan-utils";

export function useAssinaturaPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [planoSelecionado, setPlanoSelecionado] = useState<string>("pro");
  const [billingType, setBillingType] = useState<BillingType>("PIX");
  const [tipoMudancaPlano, setTipoMudancaPlano] = useState<
    "upgrade" | "downgrade" | null
  >(null);
  const [cardForm, setCardForm] = useState<CardForm>({
    holderName: "",
    number: "",
    expiryMonth: "",
    expiryYear: "",
    ccv: "",
  });

  const planoSelecionadoRef = useRef<PlanoCobravel>("pro");
  const planoEscolhidoManualmenteRef = useRef(false);
  const sincronizacaoCartaoRef = useRef<string | null>(null);

  const {
    usuario,
    permissoes,
    acessoCarregado,
    nivel,
    carregarAcesso,
  } = useAssinaturaAccess({ supabase });

  const podeGerenciar = nivel === "admin";
  const planoUrl = searchParams.get("plano");

  const selecionarPlano = useCallback((value: SetStateAction<string>) => {
    planoEscolhidoManualmenteRef.current = true;

    if (typeof value !== "function") {
      const normalized = normalizarPlanoCobravel(
        value,
        planoSelecionadoRef.current
      );
      planoSelecionadoRef.current = normalized;
      setPlanoSelecionado(normalized);
      return;
    }

    setPlanoSelecionado((current) => {
      const nextValue = value(current);
      const normalized = normalizarPlanoCobravel(
        nextValue,
        normalizarPlanoCobravel(current, planoSelecionadoRef.current)
      );
      planoSelecionadoRef.current = normalized;
      return normalized;
    });
  }, []);

  useEffect(() => {
    if (!planoUrl) return;

    const planoDaUrl = normalizarPlanoCobravel(planoUrl, "basico");
    planoEscolhidoManualmenteRef.current = true;
    planoSelecionadoRef.current = planoDaUrl;
    setPlanoSelecionado(planoDaUrl);
  }, [planoUrl]);

  const {
    salao,
    assinatura,
    checkout,
    aguardandoPagamento,
    setAssinatura,
    setCheckout,
    setAguardandoPagamento,
    carregarCheckoutAtual,
    carregarStatusAssinatura,
  } = useAssinaturaStatus({
    supabase,
    planoEscolhidoManualmenteRef,
    planoSelecionadoRef,
    setPlanoSelecionado: selecionarPlano,
  });

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");

      const acesso = await carregarAcesso();
      if (!acesso) return;

      const idSalaoAtual = String(acesso.usuarioDb.id_salao || "").trim();

      if (!idSalaoAtual) {
        throw new Error("Salão não encontrado para o usuário logado.");
      }

      await carregarStatusAssinatura(idSalaoAtual);
    } catch (error: unknown) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar assinatura."
      );
    } finally {
      setLoading(false);
    }
  }, [carregarAcesso, carregarStatusAssinatura]);

  const {
    gerandoCobranca,
    verificandoAgora,
    iniciandoTrial,
    verificarPagamentoAgora,
    criarCobrancaAssinatura,
    iniciarTrial,
    copiarPix,
  } = useAssinaturaCheckout({
    supabase,
    salao,
    checkout,
    planoSelecionado,
    planoSelecionadoRef,
    billingType,
    cardForm,
    aguardandoPagamento,
    podeGerenciar,
    setErro,
    setPlanoSelecionado: selecionarPlano,
    setAssinatura,
    setCheckout,
    setAguardandoPagamento,
    carregarCheckoutAtual,
    carregarDados,
  });

  const {
    renovacaoAutomatica,
    setRenovacaoAutomatica,
    renovacaoInfo,
    salvandoRenovacaoAutomatica,
    atualizarRenovacaoAutomatica,
  } = useRenovacaoAutomatica({
    assinatura,
    salao,
    setErro,
  });

  const {
    historicoModalOpen,
    abrirHistoricoModal,
    fecharHistoricoModal,
    carregandoHistorico,
    historicoCobrancas,
  } = useAssinaturaHistorico({
    salao,
    setErro,
  });

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    setRenovacaoAutomatica(Boolean(assinatura?.renovacao_automatica));
  }, [assinatura?.renovacao_automatica, setRenovacaoAutomatica]);

  useEffect(() => {
    const formaPagamentoAtual = String(
      assinatura?.forma_pagamento_atual || ""
    ).toUpperCase();
    const tokenCartao = String(assinatura?.asaas_credit_card_token || "").trim();
    const paymentId = String(assinatura?.asaas_payment_id || "").trim();
    const salaoId = String(salao?.id || "").trim();

    if (
      !salaoId ||
      formaPagamentoAtual !== "CREDIT_CARD" ||
      !paymentId ||
      tokenCartao
    ) {
      return;
    }

    const syncKey = `${salaoId}:${paymentId}`;
    if (sincronizacaoCartaoRef.current === syncKey) {
      return;
    }

    sincronizacaoCartaoRef.current = syncKey;

    void (async () => {
      try {
        const response = await fetch("/api/assinatura/sincronizar-cartao", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idSalao: salaoId,
          }),
        });

        const data = (await response.json().catch(() => null)) as
          | { updated?: boolean; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(
            data?.error || "Erro ao sincronizar cartao da assinatura."
          );
        }

        if (data?.updated) {
          await carregarDados();
        }
      } catch (error) {
        console.error("Falha ao sincronizar token do cartao da assinatura:", error);
      }
    })();
  }, [
    assinatura?.asaas_credit_card_token,
    assinatura?.asaas_payment_id,
    assinatura?.forma_pagamento_atual,
    carregarDados,
    salao?.id,
  ]);

  useEffect(() => {
    if (!assinatura?.plano) return;

    const atual = assinatura.plano;
    const novo = planoSelecionado;

    if (!atual || atual === novo) {
      setTipoMudancaPlano(null);
      return;
    }

    const ordem = ["teste_gratis", "trial", "basico", "pro", "premium"];
    const atualIndex = ordem.indexOf(atual);
    const novoIndex = ordem.indexOf(novo);

    if (atualIndex === -1 || novoIndex === -1) {
      setTipoMudancaPlano(null);
      return;
    }

    if (novoIndex > atualIndex) {
      setTipoMudancaPlano("upgrade");
    } else if (novoIndex < atualIndex) {
      setTipoMudancaPlano("downgrade");
    } else {
      setTipoMudancaPlano(null);
    }
  }, [assinatura, planoSelecionado]);

  const resumoAssinatura = getResumoAssinatura({
    status: assinatura?.status,
    vencimentoEm: assinatura?.vencimento_em,
    trialFimEm: assinatura?.trial_fim_em,
  });

  const planoAtualNome =
    PLANOS_INFO[assinatura?.plano || ""]?.nome || assinatura?.plano || "-";

  const valorAtual =
    assinatura?.valor ??
    PLANOS_INFO[assinatura?.plano || ""]?.valor ??
    PLANOS_INFO[planoSelecionado]?.valor ??
    0;

  const statusNormalizado = String(assinatura?.status || "").toLowerCase();
  const semAssinatura = !assinatura;
  const jaPossuiAssinatura = Boolean(assinatura?.id);
  const jaUsouTrial = Boolean(
    jaPossuiAssinatura ||
      salao?.trial_inicio_em ||
      salao?.trial_fim_em ||
      assinatura?.trial_inicio_em ||
      assinatura?.trial_fim_em
  );
  const ehStatusTrial = ["teste_gratis", "trial"].includes(statusNormalizado);
  const trialAtivo = ehStatusTrial && !resumoAssinatura.vencida;
  const trialVencido = ehStatusTrial && resumoAssinatura.vencida;
  const assinaturaAtivaPaga =
    ["ativo", "ativa", "pago"].includes(statusNormalizado) &&
    !resumoAssinatura.vencida;

  const mostrarBotaoIniciarTrial = semAssinatura && podeGerenciar && !jaUsouTrial;

  const mostrarBotaoRegularizar =
    podeGerenciar &&
    (
      aguardandoPagamento ||
      trialVencido ||
      (!ehStatusTrial &&
        (resumoAssinatura.vencida || resumoAssinatura.vencendoLogo))
    );

  const esconderBotaoPadraoRenovacao =
    trialAtivo ||
    (assinaturaAtivaPaga &&
      !resumoAssinatura.vencendoLogo &&
      tipoMudancaPlano == null);

  const mostrarSecaoRenovacao = true;

  return {
    loading,
    gerandoCobranca,
    verificandoAgora,
    iniciandoTrial,
    erro,
    usuario,
    salao,
    assinatura,
    checkout,
    planoSelecionado,
    setPlanoSelecionado: selecionarPlano,
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
  };
}
