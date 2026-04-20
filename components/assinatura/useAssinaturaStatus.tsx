"use client";

import { useCallback, useState } from "react";
import type {
  AssinaturaRow,
  CheckoutResponse,
  SalaoRow,
} from "./types";
import {
  montarCheckoutDaCobranca,
  normalizarPlanoCobravel,
  type CobrancaAtualRow,
  type PlanoCobravel,
} from "./plan-utils";

type UseAssinaturaStatusParams = {
  supabase: ReturnType<typeof import("@/lib/supabase/client").createClient>;
  planoEscolhidoManualmenteRef: React.MutableRefObject<boolean>;
  planoSelecionadoRef: React.MutableRefObject<PlanoCobravel>;
  setPlanoSelecionado: (value: PlanoCobravel) => void;
};

export function useAssinaturaStatus({
  supabase,
  planoEscolhidoManualmenteRef,
  planoSelecionadoRef,
  setPlanoSelecionado,
}: UseAssinaturaStatusParams) {
  const [salao, setSalao] = useState<SalaoRow | null>(null);
  const [assinatura, setAssinatura] = useState<AssinaturaRow | null>(null);
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const [aguardandoPagamento, setAguardandoPagamento] = useState(false);

  const carregarCheckoutAtual = useCallback(
    async (idSalao: string, assinaturaAtual?: AssinaturaRow | null) => {
      const { data, error } = await supabase
        .from("assinaturas_cobrancas")
        .select(`
          id,
          valor,
          status,
          forma_pagamento,
          data_expiracao,
          invoice_url,
          bank_slip_url,
          asaas_payment_id,
          txid
        `)
        .eq("id_salao", idSalao)
        .in("status", ["pendente", "pending", "PENDING"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<CobrancaAtualRow>();

      if (error) {
        throw error;
      }

      if (!data) {
        setCheckout(null);
        return;
      }

      setCheckout(
        montarCheckoutDaCobranca({
          cobranca: data,
          assinatura: assinaturaAtual || assinatura,
        })
      );
    },
    [assinatura, supabase]
  );

  const carregarStatusAssinatura = useCallback(
    async (idSalaoAtual: string) => {
      const { data: salaoData, error: salaoError } = await supabase
        .from("saloes")
        .select("*")
        .eq("id", idSalaoAtual)
        .single();

      if (salaoError) {
        throw salaoError;
      }

      const { data: assinaturaData, error: assinaturaError } = await supabase
        .from("assinaturas")
        .select("*")
        .eq("id_salao", idSalaoAtual)
        .maybeSingle();

      if (assinaturaError) {
        throw assinaturaError;
      }

      const salaoFinal = salaoData as SalaoRow;
      const assinaturaFinal = (assinaturaData as AssinaturaRow | null) ?? null;

      setSalao(salaoFinal);
      setAssinatura(assinaturaFinal);

      const planoInicial = normalizarPlanoCobravel(
        assinaturaFinal?.plano || salaoFinal.plano,
        "basico"
      );

      if (!planoEscolhidoManualmenteRef.current) {
        planoSelecionadoRef.current = planoInicial;
        setPlanoSelecionado(planoInicial);
      }

      const statusNormalizado = String(assinaturaFinal?.status || "").toLowerCase();
      const estaAguardando = ["pendente", "aguardando_pagamento"].includes(
        statusNormalizado
      );

      setAguardandoPagamento(estaAguardando);

      if (estaAguardando) {
        await carregarCheckoutAtual(idSalaoAtual, assinaturaFinal);
      } else {
        setCheckout(null);
      }
    },
    [
      carregarCheckoutAtual,
      planoEscolhidoManualmenteRef,
      planoSelecionadoRef,
      setPlanoSelecionado,
      supabase,
    ]
  );

  return {
    salao,
    assinatura,
    checkout,
    aguardandoPagamento,
    setAssinatura,
    setCheckout,
    setAguardandoPagamento,
    carregarCheckoutAtual,
    carregarStatusAssinatura,
  };
}
