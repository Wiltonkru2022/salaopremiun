"use client";

import type { MutableRefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  captureClientEvent,
  monitorClientOperation,
} from "@/lib/monitoring/client";
import type {
  AssinaturaRow,
  BillingType,
  CardForm,
  CheckoutResponse,
  SalaoRow,
} from "./types";
import {
  normalizarPlanoCobravel,
  type PlanoCobravel,
} from "./plan-utils";

type UseAssinaturaCheckoutParams = {
  supabase: ReturnType<typeof import("@/lib/supabase/client").createClient>;
  salao: SalaoRow | null;
  checkout: CheckoutResponse | null;
  planoSelecionado: string;
  planoSelecionadoRef: MutableRefObject<PlanoCobravel>;
  billingType: BillingType;
  cardForm: CardForm;
  aguardandoPagamento: boolean;
  podeGerenciar: boolean;
  setErro: (message: string) => void;
  setPlanoSelecionado: (value: PlanoCobravel) => void;
  setAssinatura: (value: AssinaturaRow | null) => void;
  setCheckout: (value: CheckoutResponse | null) => void;
  setAguardandoPagamento: (value: boolean) => void;
  carregarCheckoutAtual: (
    idSalao: string,
    assinaturaAtual?: AssinaturaRow | null
  ) => Promise<void>;
  carregarDados: () => Promise<void>;
};

export function useAssinaturaCheckout({
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
  setPlanoSelecionado,
  setAssinatura,
  setCheckout,
  setAguardandoPagamento,
  carregarCheckoutAtual,
  carregarDados,
}: UseAssinaturaCheckoutParams) {
  const [gerandoCobranca, setGerandoCobranca] = useState(false);
  const [verificandoAgora, setVerificandoAgora] = useState(false);
  const [iniciandoTrial, setIniciandoTrial] = useState(false);
  const cobrancaRequestKeyRef = useRef<string | null>(null);

  const verificarPagamentoAgora = useCallback(
    async (silencioso = false): Promise<void> => {
      try {
        if (!salao?.id) return;

        if (!silencioso) {
          setVerificandoAgora(true);
          setErro("");
        }

        const { data, error } = await monitorClientOperation(
          {
            module: "assinatura",
            action: "verificar_pagamento",
            screen: "assinatura",
            entity: "salao",
            entityId: salao.id,
            details: {
              silencioso,
            },
            successMessage: "Status do pagamento verificado.",
            errorMessage: "Falha ao verificar status do pagamento.",
          },
          async () =>
            await supabase
              .from("assinaturas")
              .select("asaas_credit_card_brand, asaas_credit_card_last4, asaas_credit_card_token, asaas_credit_card_tokenized_at, asaas_customer_id, asaas_payment_id, asaas_subscription_id, asaas_subscription_status, created_at, forma_pagamento_atual, gateway, id, id_cobranca_atual, id_salao, limite_profissionais, limite_usuarios, pago_em, plano, referencia_atual, renovacao_automatica, status, trial_ativo, trial_fim_em, trial_inicio_em, updated_at, valor, vencimento_em")
              .eq("id_salao", salao.id)
              .maybeSingle()
        );

        if (error) {
          throw error;
        }

        const assinaturaAtual = (data as AssinaturaRow | null) ?? null;
        setAssinatura(assinaturaAtual);

        const statusAtual = String(assinaturaAtual?.status || "").toLowerCase();

        if (["ativo", "ativa", "pago"].includes(statusAtual)) {
          setAguardandoPagamento(false);
          setCheckout(null);
          await carregarDados();
          return;
        }

        if (["pendente", "aguardando_pagamento"].includes(statusAtual)) {
          setAguardandoPagamento(true);
          await carregarCheckoutAtual(salao.id, assinaturaAtual);
        } else if (["cancelada", "vencida"].includes(statusAtual)) {
          setAguardandoPagamento(false);
        }

        if (!silencioso && !["ativo", "ativa", "pago"].includes(statusAtual)) {
          setErro(
            "Pagamento ainda não confirmado. Tente novamente em alguns segundos."
          );
        }
      } catch (error: unknown) {
        if (!silencioso) {
          setErro(
            error instanceof Error
              ? error.message
              : "Erro ao verificar pagamento."
          );
        }
      } finally {
        if (!silencioso) {
          setVerificandoAgora(false);
        }
      }
    },
    [
      carregarCheckoutAtual,
      carregarDados,
      salao?.id,
      setAguardandoPagamento,
      setAssinatura,
      setCheckout,
      setErro,
      supabase,
    ]
  );

  useEffect(() => {
    if (!aguardandoPagamento || !salao?.id) return;

    const interval = setInterval(() => {
      void verificarPagamentoAgora(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [aguardandoPagamento, salao?.id, verificarPagamentoAgora]);

  const criarCobrancaAssinatura = useCallback(async (): Promise<void> => {
    try {
      if (cobrancaRequestKeyRef.current) {
        return;
      }

      setGerandoCobranca(true);
      setErro("");

      if (!salao?.id) {
        throw new Error("Salão não carregado.");
      }

      const idempotencyKey =
        globalThis.crypto?.randomUUID?.() ||
        `assinatura-${salao.id}-${Date.now()}`;
      cobrancaRequestKeyRef.current = idempotencyKey;

      const planoParaCobranca = normalizarPlanoCobravel(
        planoSelecionadoRef.current || planoSelecionado,
        "basico"
      );

      if (planoSelecionado !== planoParaCobranca) {
        planoSelecionadoRef.current = planoParaCobranca;
        setPlanoSelecionado(planoParaCobranca);
      }

      const response = await monitorClientOperation(
        {
          module: "assinatura",
          action: "criar_cobranca",
          route: "/api/assinatura/criar-cobranca",
          screen: "assinatura_checkout",
          entity: "salao",
          entityId: salao.id,
          details: {
            billingType,
            plano: planoParaCobranca,
            idempotencyKey,
          },
          successMessage: "Cobranca de assinatura criada.",
          errorMessage: "Falha ao criar cobranca de assinatura.",
        },
        () =>
          fetch("/api/assinatura/criar-cobranca", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": idempotencyKey,
            },
            body: JSON.stringify({
              idSalao: salao.id,
              nomeSalao: salao.nome || "Salão",
              responsavelNome: salao.responsavel || salao.nome || "Responsável",
              responsavelEmail: salao.email || "",
              responsavelCpfCnpj: salao.cpf_cnpj || "",
              responsavelTelefone: salao.telefone || "",
              cep: salao.cep || "",
              numero: salao.numero || "",
              complemento: salao.complemento || "",
              plano: planoParaCobranca,
              billingType,
              creditCard:
                billingType === "CREDIT_CARD"
                  ? {
                      holderName: cardForm.holderName.trim(),
                      number: cardForm.number.replace(/\D/g, ""),
                      expiryMonth: cardForm.expiryMonth.replace(/\D/g, ""),
                      expiryYear: cardForm.expiryYear.replace(/\D/g, ""),
                      ccv: cardForm.ccv.replace(/\D/g, ""),
                    }
                  : undefined,
            }),
          })
      );

      const data = (await response.json()) as CheckoutResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar cobrança.");
      }

      const statusCobranca = String(data.status || "").toUpperCase();
      const pagamentoConfirmado = [
        "CONFIRMED",
        "RECEIVED",
        "RECEIVED_IN_CASH",
      ].includes(statusCobranca);

      setCheckout(pagamentoConfirmado ? null : data);
      setAguardandoPagamento(!pagamentoConfirmado);

      if (pagamentoConfirmado) {
        await carregarDados();
      }
    } catch (error: unknown) {
      setErro(
        error instanceof Error ? error.message : "Erro ao criar cobrança."
      );
    } finally {
      cobrancaRequestKeyRef.current = null;
      setGerandoCobranca(false);
    }
  }, [
    billingType,
    cardForm.ccv,
    cardForm.expiryMonth,
    cardForm.expiryYear,
    cardForm.holderName,
    cardForm.number,
    carregarDados,
    planoSelecionado,
    planoSelecionadoRef,
    salao,
    setAguardandoPagamento,
    setCheckout,
    setErro,
    setPlanoSelecionado,
  ]);

  const iniciarTrial = useCallback(async (): Promise<void> => {
    try {
      if (!podeGerenciar) {
        setErro("Você não tem permissão para iniciar o trial.");
        return;
      }

      if (!salao?.id) {
        throw new Error("Salão não carregado.");
      }

      setIniciandoTrial(true);
      setErro("");

      const response = await monitorClientOperation(
        {
          module: "assinatura",
          action: "iniciar_trial",
          route: "/api/assinatura/iniciar-trial",
          screen: "assinatura",
          entity: "salao",
          entityId: salao.id,
          successMessage: "Trial iniciado com sucesso.",
          errorMessage: "Falha ao iniciar trial.",
        },
        () =>
          fetch("/api/assinatura/iniciar-trial", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idSalao: salao.id,
            }),
          })
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Erro ao iniciar teste grátis.");
      }

      await carregarDados();
    } catch (error: unknown) {
      setErro(
        error instanceof Error ? error.message : "Erro ao iniciar teste grátis."
      );
    } finally {
      setIniciandoTrial(false);
    }
  }, [carregarDados, podeGerenciar, salao?.id, setErro]);

  const copiarPix = useCallback(async (): Promise<void> => {
    if (!checkout?.pixCopiaCola) return;

    await navigator.clipboard.writeText(checkout.pixCopiaCola);
    await captureClientEvent({
      module: "assinatura",
      eventType: "ui_event",
      action: "copiar_pix",
      screen: "assinatura_checkout",
      entity: "cobranca",
      entityId: checkout.paymentId,
      message: "Codigo Pix copiado pelo usuario.",
      details: {
        idSalao: salao?.id || null,
        billingType: checkout.billingType,
      },
      success: true,
    });
  }, [checkout, salao?.id]);

  return {
    gerandoCobranca,
    verificandoAgora,
    iniciandoTrial,
    verificarPagamentoAgora,
    criarCobrancaAssinatura,
    iniciarTrial,
    copiarPix,
  };
}
