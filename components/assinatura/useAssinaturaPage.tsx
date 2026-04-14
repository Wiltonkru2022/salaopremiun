"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getResumoAssinatura } from "@/lib/assinatura-utils";
import {
  PLANOS_INFO,
  type AssinaturaRow,
  type BillingType,
  type CardForm,
  type CheckoutResponse,
  type HistoricoCobrancaRow,
  type SalaoRow,
} from "./types";

type PermissoesMock = {
  assinatura_ver: boolean;
};

export function useAssinaturaPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [salao, setSalao] = useState<SalaoRow | null>(null);
  const [assinatura, setAssinatura] = useState<AssinaturaRow | null>(null);

  const [planoSelecionado, setPlanoSelecionado] = useState<string>("pro");
  const [billingType, setBillingType] = useState<BillingType>("PIX");

  const [renovacaoAutomatica, setRenovacaoAutomatica] = useState(false);
  const [salvandoRenovacaoAutomatica, setSalvandoRenovacaoAutomatica] =
    useState(false);

  const [tipoMudancaPlano, setTipoMudancaPlano] = useState<
    "upgrade" | "downgrade" | null
  >(null);

  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);

  const podeGerenciar = true;

  const [cardForm, setCardForm] = useState<CardForm>({
    holderName: "",
    number: "",
    expiryMonth: "",
    expiryYear: "",
    ccv: "",
  });

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSalao(null);
        setAssinatura(null);
        return;
      }

      const { data: usuario, error: usuarioError } = await supabase
        .from("usuarios")
        .select("id_salao")
        .eq("auth_user_id", user.id)
        .single();

      if (usuarioError) {
        throw usuarioError;
      }

      const idSalao = String(usuario?.id_salao || "").trim();

      if (!idSalao) {
        throw new Error("Salão não encontrado para o usuário logado.");
      }

      const { data: salaoData, error: salaoError } = await supabase
        .from("saloes")
        .select("*")
        .eq("id", idSalao)
        .single();

      if (salaoError) {
        throw salaoError;
      }

      const { data: assinaturaData, error: assinaturaError } = await supabase
        .from("assinaturas")
        .select("*")
        .eq("id_salao", idSalao)
        .maybeSingle();

      if (assinaturaError) {
        throw assinaturaError;
      }

      const salaoFinal = salaoData as SalaoRow;
      const assinaturaFinal = (assinaturaData as AssinaturaRow | null) ?? null;

      setSalao(salaoFinal);
      setAssinatura(assinaturaFinal);
      setRenovacaoAutomatica(Boolean(assinaturaFinal?.renovacao_automatica));

      if (assinaturaFinal?.plano) {
        setPlanoSelecionado(assinaturaFinal.plano);
      }
    } catch (error: unknown) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar assinatura."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!assinatura?.plano) return;

    const atual = assinatura.plano;
    const novo = planoSelecionado;

    if (!atual || atual === novo) {
      setTipoMudancaPlano(null);
      return;
    }

    const ordem = ["basico", "pro", "premium"];
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
  }, [planoSelecionado, assinatura]);

  async function atualizarRenovacaoAutomatica(value: boolean) {
    try {
      setSalvandoRenovacaoAutomatica(true);
      setErro("");

      if (!assinatura?.id) {
        throw new Error("Assinatura não encontrada.");
      }

      const { error } = await supabase
        .from("assinaturas")
        .update({
          renovacao_automatica: value,
        })
        .eq("id", assinatura.id);

      if (error) {
        throw error;
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

  async function criarCobrancaAssinatura() {
    try {
      setErro("");

      if (!salao?.id) {
        throw new Error("Salão não carregado.");
      }

      const response = await fetch("/api/assinatura/criar-cobranca", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
          plano: planoSelecionado,
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
      });

      const data = (await response.json()) as CheckoutResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar cobrança.");
      }

      setCheckout(data);
    } catch (error: unknown) {
      setErro(
        error instanceof Error ? error.message : "Erro ao criar cobrança."
      );
    }
  }

  async function copiarPix(): Promise<void> {
    if (!checkout?.pixCopiaCola) return;

    await navigator.clipboard.writeText(checkout.pixCopiaCola);
  }

  const resumoAssinatura = getResumoAssinatura({
    status: assinatura?.status,
    vencimentoEm: assinatura?.vencimento_em,
    trialFimEm: assinatura?.trial_fim_em,
  });

  const planoAtualNome =
    PLANOS_INFO[assinatura?.plano || ""]?.nome || assinatura?.plano || "-";

  const valorAtual = PLANOS_INFO[assinatura?.plano || ""]?.valor || 0;

  return {
    loading,
    erro,
    salao,
    assinatura,
    planoSelecionado,
    setPlanoSelecionado,
    billingType,
    setBillingType,
    checkout,
    criarCobrancaAssinatura,
    resumoAssinatura,
    renovacaoAutomatica,
    salvandoRenovacaoAutomatica,
    atualizarRenovacaoAutomatica,
    tipoMudancaPlano,
    podeGerenciar,

    gerandoCobranca: false,
    verificandoAgora: false,
    iniciandoTrial: false,
    aguardandoPagamento: false,
    permissoes: { assinatura_ver: true } as PermissoesMock,
    acessoCarregado: true,
    cardForm,
    setCardForm,
    verificarPagamentoAgora: () => {},
    copiarPix,
    iniciarTrial: () => {},
    planoAtualNome,
    valorAtual,
    mostrarBotaoRegularizar: false,
    mostrarBotaoIniciarTrial: false,
    esconderBotaoPadraoRenovacao: false,
    mostrarSecaoRenovacao: true,
    historicoModalOpen: false,
    abrirHistoricoModal: () => {},
    fecharHistoricoModal: () => {},
    carregandoHistorico: false,
    historicoCobrancas: [] as HistoricoCobrancaRow[],
  };
}