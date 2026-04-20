"use client";

import { useMemo, useState } from "react";
import { getRenovacaoAutomaticaInfo } from "@/lib/assinaturas/renovacao-automatica";
import { monitorClientOperation } from "@/lib/monitoring/client";
import type { AssinaturaRow, SalaoRow } from "./types";

type UseRenovacaoAutomaticaParams = {
  assinatura: AssinaturaRow | null;
  salao: SalaoRow | null;
  setErro: (message: string) => void;
};

export function useRenovacaoAutomatica({
  assinatura,
  salao,
  setErro,
}: UseRenovacaoAutomaticaParams) {
  const [renovacaoAutomatica, setRenovacaoAutomatica] = useState(false);
  const [salvandoRenovacaoAutomatica, setSalvandoRenovacaoAutomatica] =
    useState(false);

  const renovacaoInfo = useMemo(
    () =>
      getRenovacaoAutomaticaInfo({
        assinaturaExiste: Boolean(assinatura?.id),
        asaasCustomerId: assinatura?.asaas_customer_id,
        formaPagamentoAtual: assinatura?.forma_pagamento_atual,
        renovacaoAutomatica,
        asaasCreditCardToken: assinatura?.asaas_credit_card_token,
        asaasSubscriptionId: assinatura?.asaas_subscription_id,
      }),
    [
      assinatura?.asaas_credit_card_token,
      assinatura?.asaas_customer_id,
      assinatura?.asaas_subscription_id,
      assinatura?.forma_pagamento_atual,
      assinatura?.id,
      renovacaoAutomatica,
    ]
  );

  async function atualizarRenovacaoAutomatica(value: boolean) {
    try {
      setSalvandoRenovacaoAutomatica(true);
      setErro("");

      if (!assinatura?.id || !salao?.id) {
        throw new Error("Assinatura não encontrada.");
      }

      if (value && !renovacaoInfo.podeAtivar) {
        throw new Error(renovacaoInfo.observacao);
      }

      const response = await monitorClientOperation(
        {
          module: "assinatura",
          action: "toggle_renovacao_automatica",
          route: "/api/assinatura/toggle-renovacao",
          screen: "assinatura",
          entity: "assinatura",
          entityId: assinatura.id,
          details: {
            idSalao: salao.id,
            renovacaoAutomatica: value,
          },
          successMessage: "Renovacao automatica atualizada.",
          errorMessage: "Falha ao atualizar renovacao automatica.",
        },
        () =>
          fetch("/api/assinatura/toggle-renovacao", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idSalao: salao.id,
              renovacaoAutomatica: value,
            }),
          })
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar renovação automática.");
      }

      setRenovacaoAutomatica(value);
    } catch (error: unknown) {
      setErro(
        error instanceof Error
          ? error.message
          : "Erro ao salvar renovação automática."
      );
    } finally {
      setSalvandoRenovacaoAutomatica(false);
    }
  }

  return {
    renovacaoAutomatica,
    setRenovacaoAutomatica,
    renovacaoInfo,
    salvandoRenovacaoAutomatica,
    atualizarRenovacaoAutomatica,
  };
}
