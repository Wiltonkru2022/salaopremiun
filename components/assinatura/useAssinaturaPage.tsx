"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getResumoAssinatura } from "@/lib/assinatura-utils";
import { PLANOS_INFO } from "./types";

export function useAssinaturaPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [salao, setSalao] = useState<any>(null);
  const [assinatura, setAssinatura] = useState<any>(null);

  const [planoSelecionado, setPlanoSelecionado] = useState("pro");
  const [billingType, setBillingType] = useState<"PIX" | "BOLETO" | "CREDIT_CARD">("PIX");

  const [renovacaoAutomatica, setRenovacaoAutomatica] = useState(false);
  const [salvandoRenovacaoAutomatica, setSalvandoRenovacaoAutomatica] =
    useState(false);

  const [tipoMudancaPlano, setTipoMudancaPlano] = useState<
    "upgrade" | "downgrade" | null
  >(null);

  const [checkout, setCheckout] = useState<any>(null);

  const podeGerenciar = true; // mantém compatível com seu sistema atual

  // 🔥 CARREGAMENTO INICIAL
  const carregar = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("id_salao")
        .eq("auth_user_id", user.id)
        .single();

      const idSalao = usuario?.id_salao;

      const { data: salaoData } = await supabase
        .from("saloes")
        .select("*")
        .eq("id", idSalao)
        .single();

      const { data: assinaturaData } = await supabase
        .from("assinaturas")
        .select("*")
        .eq("id_salao", idSalao)
        .maybeSingle();

      setSalao(salaoData);
      setAssinatura(assinaturaData);

      setRenovacaoAutomatica(
        Boolean(assinaturaData?.renovacao_automatica)
      );

      if (assinaturaData?.plano) {
        setPlanoSelecionado(assinaturaData.plano);
      }
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // 🔥 DETECTAR UPGRADE / DOWNGRADE
  useEffect(() => {
    if (!assinatura?.plano) return;

    const atual = assinatura.plano;
    const novo = planoSelecionado;

    if (atual === novo) {
      setTipoMudancaPlano(null);
      return;
    }

    const ordem = ["basico", "pro", "premium"];

    const atualIndex = ordem.indexOf(atual);
    const novoIndex = ordem.indexOf(novo);

    if (novoIndex > atualIndex) {
      setTipoMudancaPlano("upgrade");
    } else {
      setTipoMudancaPlano("downgrade");
    }
  }, [planoSelecionado, assinatura]);

  // 🔥 SALVAR RENOVAÇÃO AUTOMÁTICA
  async function atualizarRenovacaoAutomatica(value: boolean) {
    try {
      setSalvandoRenovacaoAutomatica(true);
      setErro("");

      if (!assinatura?.id) return;

      const { error } = await supabase
        .from("assinaturas")
        .update({
          renovacao_automatica: value,
        })
        .eq("id", assinatura.id);

      if (error) throw error;

      setRenovacaoAutomatica(value);
    } catch (e: any) {
      setErro("Erro ao salvar renovação automática");
    } finally {
      setSalvandoRenovacaoAutomatica(false);
    }
  }

  // 🔥 GERAR COBRANÇA (usa seu backend)
  async function criarCobrancaAssinatura() {
    try {
      setErro("");

      const response = await fetch("/api/assinatura/criar-cobranca", {
        method: "POST",
        body: JSON.stringify({
          idSalao: salao.id,
          plano: planoSelecionado,
          billingType: "PIX",
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setCheckout(data);
    } catch (e: any) {
      setErro(e.message);
    }
  }

  // 🔥 RESUMO
  const resumoAssinatura = getResumoAssinatura({
    status: assinatura?.status,
    vencimentoEm: assinatura?.vencimento_em,
    trialFimEm: assinatura?.trial_fim_em,
  });

  return {
    loading,
    erro,
    salao,
    assinatura,
    planoSelecionado,
    setPlanoSelecionado,
    checkout,
    criarCobrancaAssinatura,
    resumoAssinatura,
    renovacaoAutomatica,
    salvandoRenovacaoAutomatica,
    atualizarRenovacaoAutomatica,
    tipoMudancaPlano,
    podeGerenciar,

    // compatibilidade com seu layout
    gerandoCobranca: false,
    verificandoAgora: false,
    billingType,
    setBillingType,
    iniciandoTrial: false,
    aguardandoPagamento: false,
    permissoes: { assinatura_ver: true },
    acessoCarregado: true,
    cardForm: {} as any,
    setCardForm: () => {},
    verificarPagamentoAgora: () => {},
    copiarPix: async () => {
      if (!checkout?.pixCopiaCola) return;

      await navigator.clipboard.writeText(checkout.pixCopiaCola);
    },
    iniciarTrial: () => {},
    planoAtualNome:
      PLANOS_INFO[assinatura?.plano]?.nome || assinatura?.plano || "-",
    valorAtual:
      PLANOS_INFO[assinatura?.plano]?.valor || 0,
    mostrarBotaoRegularizar: false,
    mostrarBotaoIniciarTrial: false,
    esconderBotaoPadraoRenovacao: false,
    mostrarSecaoRenovacao: true,
    historicoModalOpen: false,
    abrirHistoricoModal: () => {},
    fecharHistoricoModal: () => {},
    carregandoHistorico: false,
    historicoCobrancas: [],
  };
}