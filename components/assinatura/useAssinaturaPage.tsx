"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getResumoAssinatura } from "@/lib/assinatura-utils";
import type {
  AssinaturaRow,
  BillingType,
  CardForm,
  CheckoutResponse,
  HistoricoCobrancaRow,
  Permissoes,
  SalaoRow,
  UsuarioSupabase,
} from "./types";
import { PLANOS_INFO } from "./types";

export function useAssinaturaPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [gerandoCobranca, setGerandoCobranca] = useState(false);
  const [verificandoAgora, setVerificandoAgora] = useState(false);
  const [iniciandoTrial, setIniciandoTrial] = useState(false);
  const [erro, setErro] = useState("");

  const [usuario, setUsuario] = useState<UsuarioSupabase | null>(null);
  const [idSalao, setIdSalao] = useState("");
  const [salao, setSalao] = useState<SalaoRow | null>(null);
  const [assinatura, setAssinatura] = useState<AssinaturaRow | null>(null);

  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const [planoSelecionado, setPlanoSelecionado] = useState<string>("pro");
  const [billingType, setBillingType] = useState<BillingType>("PIX");

  const [aguardandoPagamento, setAguardandoPagamento] = useState(false);

  const [permissoes, setPermissoes] = useState<Permissoes | null>(null);
  const [nivel, setNivel] = useState("");
  const [acessoCarregado, setAcessoCarregado] = useState(false);

  const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [historicoCobrancas, setHistoricoCobrancas] = useState<HistoricoCobrancaRow[]>([]);

  const [cardForm, setCardForm] = useState<CardForm>({
    holderName: "",
    number: "",
    expiryMonth: "",
    expiryYear: "",
    ccv: "",
  });

  const podeGerenciar = nivel === "admin";

  const carregarAcesso = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;

    if (!user) {
      router.replace("/login");
      return null;
    }

    const { data: usuarioDb, error: usuarioError } = await supabase
      .from("usuarios")
      .select("id, id_salao, nivel, status")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (usuarioError || !usuarioDb?.id || !usuarioDb?.id_salao) {
      throw new Error("Não foi possível localizar o usuário do sistema.");
    }

    if (usuarioDb.status && usuarioDb.status !== "ativo") {
      throw new Error("Usuário inativo.");
    }

    const { data: permissoesDb } = await supabase
      .from("usuarios_permissoes")
      .select("*")
      .eq("id_usuario", usuarioDb.id)
      .eq("id_salao", usuarioDb.id_salao)
      .maybeSingle();

    const permissoesFinal: Permissoes =
      permissoesDb || {
        dashboard_ver: true,
        agenda_ver: true,
        clientes_ver: true,
        profissionais_ver: true,
        servicos_ver: true,
        produtos_ver: true,
        estoque_ver: true,
        comandas_ver: true,
        vendas_ver: true,
        caixa_ver: true,
        comissoes_ver: true,
        relatorios_ver: true,
        marketing_ver: true,
        configuracoes_ver: String(usuarioDb.nivel).toLowerCase() === "admin",
        assinatura_ver: true,
      };

    setPermissoes(permissoesFinal);
    setNivel(String(usuarioDb.nivel || "").toLowerCase());
    setAcessoCarregado(true);

    if (!permissoesFinal.assinatura_ver) {
      router.replace("/dashboard");
      return null;
    }

    return { user, usuarioDb };
  }, [router, supabase]);

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      setErro("");

      const acesso = await carregarAcesso();
      if (!acesso) return;

      const user = acesso.user;
      const usuarioAtual = user as unknown as UsuarioSupabase;
      setUsuario(usuarioAtual);

      const idSalaoAtual = String(acesso.usuarioDb.id_salao || "");
      if (!idSalaoAtual) {
        throw new Error("Não foi possível localizar o salão logado.");
      }

      setIdSalao(idSalaoAtual);

      const { data: salaoData, error: salaoError } = await supabase
        .from("saloes")
        .select(`
          id,
          nome,
          email,
          telefone,
          cpf_cnpj,
          responsavel,
          cep,
          numero,
          complemento,
          created_at
        `)
        .eq("id", idSalaoAtual)
        .single();

      if (salaoError) throw salaoError;
      setSalao(salaoData as SalaoRow);

      const { data: assinaturaData, error: assinaturaError } = await supabase
        .from("assinaturas")
        .select(`
          id,
          id_salao,
          plano,
          status,
          valor,
          created_at,
          pago_em,
          vencimento_em,
          trial_ativo,
          trial_inicio_em,
          trial_fim_em,
          limite_profissionais,
          limite_usuarios,
          asaas_customer_id,
          asaas_payment_id,
          gateway,
          forma_pagamento_atual
        `)
        .eq("id_salao", idSalaoAtual)
        .maybeSingle();

      if (assinaturaError) throw assinaturaError;

      const assinaturaFinal = (assinaturaData as AssinaturaRow) || null;
      setAssinatura(assinaturaFinal);

      if (
        assinaturaFinal?.plano &&
        PLANOS_INFO[assinaturaFinal.plano] &&
        assinaturaFinal.plano !== "teste_gratis"
      ) {
        setPlanoSelecionado(assinaturaFinal.plano);
      }
    } catch (e) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao carregar assinatura.");
    } finally {
      setLoading(false);
    }
  }, [carregarAcesso, supabase]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (!aguardandoPagamento || !idSalao || !podeGerenciar) return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from("assinaturas")
          .select(`
            id,
            id_salao,
            plano,
            status,
            valor,
            created_at,
            pago_em,
            vencimento_em,
            trial_ativo,
            trial_inicio_em,
            trial_fim_em,
            limite_profissionais,
            limite_usuarios,
            asaas_customer_id,
            asaas_payment_id,
            gateway,
            forma_pagamento_atual
          `)
          .eq("id_salao", idSalao)
          .maybeSingle();

        if (error || !data) return;

        const assinaturaAtual = data as AssinaturaRow;
        setAssinatura(assinaturaAtual);

        const statusAtual = String(assinaturaAtual.status || "").toLowerCase();

        if (["ativo", "ativa", "pago"].includes(statusAtual)) {
          setAguardandoPagamento(false);
          setCheckout(null);
          await carregarDados();
        }
      } catch (err) {
        console.error("Erro no polling da assinatura:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [aguardandoPagamento, idSalao, podeGerenciar, supabase, carregarDados]);

async function carregarHistoricoCobrancas() {
  try {
    if (!idSalao) return;

    setCarregandoHistorico(true);
    setErro("");

    const response = await fetch("/api/assinatura/historico", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idSalao }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error || "Erro ao carregar histórico.");
    }

    setHistoricoCobrancas((result?.historico as HistoricoCobrancaRow[]) || []);
  } catch (e) {
    console.error(e);
    setErro(e instanceof Error ? e.message : "Erro ao carregar histórico.");
    setHistoricoCobrancas([]);
  } finally {
    setCarregandoHistorico(false);
  }
}

  async function abrirHistoricoModal() {
    setHistoricoModalOpen(true);
    await carregarHistoricoCobrancas();
  }

  function fecharHistoricoModal() {
    setHistoricoModalOpen(false);
  }

  async function iniciarTrial() {
    if (!podeGerenciar) {
      setErro("Você não tem permissão para iniciar o trial.");
      return;
    }

    try {
      if (!idSalao) throw new Error("Salão não localizado.");

      setIniciandoTrial(true);
      setErro("");

      const response = await fetch("/api/assinatura/iniciar-trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idSalao }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao iniciar teste grátis.");
      }

      await carregarDados();
    } catch (e) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao iniciar teste grátis.");
    } finally {
      setIniciandoTrial(false);
    }
  }

  async function verificarPagamentoAgora() {
    if (!podeGerenciar) {
      setErro("Você não tem permissão para verificar pagamentos.");
      return;
    }

    try {
      if (!idSalao) return;

      setVerificandoAgora(true);
      setErro("");

      const { data, error } = await supabase
        .from("assinaturas")
        .select(`
          id,
          id_salao,
          plano,
          status,
          valor,
          created_at,
          pago_em,
          vencimento_em,
          trial_ativo,
          trial_inicio_em,
          trial_fim_em,
          limite_profissionais,
          limite_usuarios,
          asaas_customer_id,
          asaas_payment_id,
          gateway,
          forma_pagamento_atual
        `)
        .eq("id_salao", idSalao)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error("Assinatura ainda não encontrada para este salão.");
      }

      const assinaturaAtual = data as AssinaturaRow;
      setAssinatura(assinaturaAtual);

      const statusAtual = String(assinaturaAtual.status || "").toLowerCase();

      if (["ativo", "ativa", "pago"].includes(statusAtual)) {
        setAguardandoPagamento(false);
        setCheckout(null);
        await carregarDados();
      } else {
        setErro("Pagamento ainda não confirmado. Tente novamente em alguns segundos.");
      }
    } catch (e) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao verificar pagamento.");
    } finally {
      setVerificandoAgora(false);
    }
  }

  async function criarCobrancaAssinatura() {
    if (!podeGerenciar) {
      setErro("Você não tem permissão para gerar cobrança.");
      return;
    }

    try {
      if (!usuario?.email) throw new Error("Usuário logado sem e-mail.");
      if (!idSalao || !salao) throw new Error("Dados do salão não carregados.");

      setGerandoCobranca(true);
      setErro("");
      setCheckout(null);

      const responsavelNome =
        salao.responsavel ||
        String((usuario.user_metadata?.nome as string) || "") ||
        salao.nome ||
        "Responsável";

      const responsavelEmail = salao.email || usuario.email || "";
      const responsavelCpfCnpj =
        salao.cpf_cnpj ||
        String((usuario.user_metadata?.cpf_cnpj as string) || "") ||
        undefined;

      const responsavelTelefone =
        salao.telefone ||
        String((usuario.user_metadata?.telefone as string) || "") ||
        undefined;

      const response = await fetch("/api/assinatura/criar-cobranca", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idSalao,
          nomeSalao: salao.nome || "Salão",
          responsavelNome,
          responsavelEmail,
          responsavelCpfCnpj,
          responsavelTelefone,
          cep: salao?.cep || "",
          numero: salao?.numero || "",
          complemento: salao?.complemento || "",
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao criar cobrança.");
      }

      setCheckout(data as CheckoutResponse);
      setAguardandoPagamento(true);
      await carregarDados();
    } catch (e) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao criar cobrança.");
    } finally {
      setGerandoCobranca(false);
    }
  }

  async function copiarPix() {
    try {
      if (!checkout?.pixCopiaCola) return;
      await navigator.clipboard.writeText(checkout.pixCopiaCola);
      alert("Código PIX copiado.");
    } catch {
      alert("Não foi possível copiar o PIX.");
    }
  }

  const planoAtualNome = assinatura?.plano
    ? PLANOS_INFO[assinatura.plano]?.nome || assinatura.plano
    : "-";

  const valorAtual =
    assinatura?.valor ??
    (assinatura?.plano
      ? PLANOS_INFO[assinatura.plano]?.valor
      : PLANOS_INFO[planoSelecionado]?.valor) ??
    0;

  const resumoAssinatura = getResumoAssinatura({
    status: assinatura?.status,
    vencimentoEm: assinatura?.vencimento_em,
    trialFimEm: assinatura?.trial_fim_em,
  });

  const semAssinatura = !assinatura;
  const statusNormalizado = String(assinatura?.status || "").toLowerCase();

  const ehStatusTrial = ["teste_gratis", "trial"].includes(statusNormalizado);
  const trialAtivo = ehStatusTrial && !resumoAssinatura.vencida;
  const trialVencido = ehStatusTrial && resumoAssinatura.vencida;

  const assinaturaAtivaPaga =
    ["ativo", "ativa", "pago"].includes(statusNormalizado) &&
    !resumoAssinatura.vencida;

  const mostrarBotaoIniciarTrial = semAssinatura && podeGerenciar;

  const mostrarBotaoRegularizar =
    podeGerenciar &&
    (trialVencido ||
      (!ehStatusTrial &&
        (resumoAssinatura.vencida || resumoAssinatura.vencendoLogo)));

  const esconderBotaoPadraoRenovacao =
    trialAtivo || (assinaturaAtivaPaga && !resumoAssinatura.vencendoLogo);

  const mostrarSecaoRenovacao =
    Boolean(checkout) ||
    aguardandoPagamento ||
    mostrarBotaoRegularizar ||
    mostrarBotaoIniciarTrial ||
    resumoAssinatura.vencida ||
    resumoAssinatura.vencendoLogo ||
    trialVencido ||
    semAssinatura;

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
  };
}