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

type UsuarioSalaoRow = {
  id_salao: string | null;
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

  const [gerandoCobranca, setGerandoCobranca] = useState(false);
  const [verificandoAgora, setVerificandoAgora] = useState(false);
  const [aguardandoPagamento, setAguardandoPagamento] = useState(false);

  const [cardForm, setCardForm] = useState<CardForm>({
    holderName: "",
    number: "",
    expiryMonth: "",
    expiryYear: "",
    ccv: "",
  });

  const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [historicoCobrancas, setHistoricoCobrancas] = useState<
    HistoricoCobrancaRow[]
  >([]);

  const podeGerenciar = true;

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
        .single<UsuarioSalaoRow>();

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

      const statusNormalizado = String(assinaturaFinal?.status || "").toLowerCase();
      setAguardandoPagamento(
        ["pendente", "aguardando_pagamento"].includes(statusNormalizado)
      );
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

  useEffect(() => {
    if (!aguardandoPagamento || !salao?.id) return;

    const interval = setInterval(() => {
      void verificarPagamentoAgora(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [aguardandoPagamento, salao?.id]);

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

  async function criarCobrancaAssinatura(): Promise<void> {
    try {
      setGerandoCobranca(true);
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
      setAguardandoPagamento(true);

      await carregar();
    } catch (error: unknown) {
      setErro(
        error instanceof Error ? error.message : "Erro ao criar cobrança."
      );
    } finally {
      setGerandoCobranca(false);
    }
  }

  async function verificarPagamentoAgora(
    silencioso = false
  ): Promise<void> {
    try {
      if (!salao?.id) return;

      if (!silencioso) {
        setVerificandoAgora(true);
        setErro("");
      }

      const { data, error } = await supabase
        .from("assinaturas")
        .select("*")
        .eq("id_salao", salao.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const assinaturaAtual = (data as AssinaturaRow | null) ?? null;
      setAssinatura(assinaturaAtual);

      const statusNormalizado = String(assinaturaAtual?.status || "").toLowerCase();

      if (["ativo", "ativa", "pago"].includes(statusNormalizado)) {
        setAguardandoPagamento(false);
        setCheckout(null);
        await carregar();
        return;
      }

      if (
        ["cancelada", "vencida"].includes(statusNormalizado)
      ) {
        setAguardandoPagamento(false);
      }

      if (!silencioso) {
        setErro("Pagamento ainda não confirmado. Tente novamente em alguns segundos.");
      }
    } catch (error: unknown) {
      if (!silencioso) {
        setErro(
          error instanceof Error ? error.message : "Erro ao verificar pagamento."
        );
      }
    } finally {
      if (!silencioso) {
        setVerificandoAgora(false);
      }
    }
  }

  async function copiarPix(): Promise<void> {
    if (!checkout?.pixCopiaCola) return;
    await navigator.clipboard.writeText(checkout.pixCopiaCola);
  }

  async function carregarHistoricoCobrancas(): Promise<void> {
    try {
      setCarregandoHistorico(true);
      setErro("");

      if (!salao?.id) {
        setHistoricoCobrancas([]);
        return;
      }

      const response = await fetch("/api/assinatura/historico", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idSalao: salao.id,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        historico?: HistoricoCobrancaRow[];
      };

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar histórico.");
      }

      setHistoricoCobrancas(Array.isArray(data.historico) ? data.historico : []);
    } catch (error: unknown) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar histórico."
      );
      setHistoricoCobrancas([]);
    } finally {
      setCarregandoHistorico(false);
    }
  }

  async function abrirHistoricoModal(): Promise<void> {
    setHistoricoModalOpen(true);
    await carregarHistoricoCobrancas();
  }

  function fecharHistoricoModal(): void {
    setHistoricoModalOpen(false);
  }

  const resumoAssinatura = getResumoAssinatura({
    status: assinatura?.status,
    vencimentoEm: assinatura?.vencimento_em,
    trialFimEm: assinatura?.trial_fim_em,
  });

  const planoAtualNome =
    PLANOS_INFO[assinatura?.plano || ""]?.nome || assinatura?.plano || "-";

  const valorAtual = PLANOS_INFO[assinatura?.plano || ""]?.valor || 0;

  const statusNormalizado = String(assinatura?.status || "").toLowerCase();
  const semAssinatura = !assinatura;
  const ehStatusTrial = ["teste_gratis", "trial"].includes(statusNormalizado);
  const trialVencido = ehStatusTrial && resumoAssinatura.vencida;

  const mostrarBotaoIniciarTrial = semAssinatura && podeGerenciar;

  const mostrarBotaoRegularizar =
    podeGerenciar &&
    (
      aguardandoPagamento ||
      trialVencido ||
      (!ehStatusTrial &&
        (resumoAssinatura.vencida || resumoAssinatura.vencendoLogo))
    );

  const esconderBotaoPadraoRenovacao = false;
  const mostrarSecaoRenovacao = true;

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

    gerandoCobranca,
    verificandoAgora,
    iniciandoTrial: false,
    aguardandoPagamento,
    permissoes: { assinatura_ver: true } as PermissoesMock,
    acessoCarregado: true,
    cardForm,
    setCardForm,
    verificarPagamentoAgora,
    copiarPix,
    iniciarTrial: () => {},
    planoAtualNome,
    valorAtual,
    mostrarBotaoRegularizar,
    mostrarBotaoIniciarTrial,
    esconderBotaoPadraoRenovacao,
    mostrarSecaoRenovacao,

    historicoModalOpen,
    abrirHistoricoModal,
    fecharHistoricoModal,
    carregandoHistorico,
    historicoCobrancas,
  };
}