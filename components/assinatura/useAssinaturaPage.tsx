"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getResumoAssinatura } from "@/lib/assinatura-utils";
import {
  buildPermissoesByNivel,
  sanitizePermissoesDb,
} from "@/lib/auth/permissions";
import {
  PLANOS_INFO,
  type AssinaturaRow,
  type BillingType,
  type CardForm,
  type CheckoutResponse,
  type HistoricoCobrancaRow,
  type Permissoes,
  type SalaoRow,
  type UsuarioSistemaRow,
  type UsuarioSupabase,
} from "./types";

type CobrancaAtualRow = {
  id: string;
  valor: number | null;
  status: string | null;
  forma_pagamento: BillingType | null;
  data_expiracao: string | null;
  invoice_url: string | null;
  bank_slip_url: string | null;
  asaas_payment_id: string | null;
  txid: string | null;
};

const PLANOS_COBRAVEIS = ["basico", "pro", "premium"] as const;
type PlanoCobravel = (typeof PLANOS_COBRAVEIS)[number];

function normalizarCodigoPlano(value?: string | null) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-\s]+/g, "_")
    .trim()
    .toLowerCase();

  return normalized.startsWith("plano_")
    ? normalized.replace(/^plano_/, "")
    : normalized;
}

function isPlanoCobravel(value?: string | null): value is PlanoCobravel {
  return PLANOS_COBRAVEIS.includes(normalizarCodigoPlano(value) as PlanoCobravel);
}

function normalizarPlanoCobravel(
  value?: string | null,
  fallback: PlanoCobravel = "basico"
): PlanoCobravel {
  const normalized = normalizarCodigoPlano(value);

  if (
    !normalized ||
    ["teste_gratis", "testegratis", "trial", "gratis"].includes(normalized)
  ) {
    return fallback;
  }

  return isPlanoCobravel(normalized) ? normalized : fallback;
}

export function useAssinaturaPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [usuario, setUsuario] = useState<UsuarioSupabase | null>(null);
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
  const [iniciandoTrial, setIniciandoTrial] = useState(false);
  const [aguardandoPagamento, setAguardandoPagamento] = useState(false);

  const [permissoes, setPermissoes] = useState<Permissoes | null>(null);
  const [acessoCarregado, setAcessoCarregado] = useState(false);
  const [nivel, setNivel] = useState("");

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
  const cobrancaRequestKeyRef = useRef<string | null>(null);
  const planoSelecionadoRef = useRef<PlanoCobravel>("pro");
  const planoEscolhidoManualmenteRef = useRef(false);

  const podeGerenciar = nivel === "admin";
  const planoUrl = searchParams.get("plano");

  const selecionarPlano = useCallback<Dispatch<SetStateAction<string>>>(
    (value) => {
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
    },
    []
  );

  useEffect(() => {
    if (!planoUrl) return;

    const planoDaUrl = normalizarPlanoCobravel(planoUrl, "basico");
    planoEscolhidoManualmenteRef.current = true;
    planoSelecionadoRef.current = planoDaUrl;
    setPlanoSelecionado(planoDaUrl);
  }, [planoUrl]);

  const carregarAcesso = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    if (!user) {
      router.replace("/login");
      return null;
    }

    const { data: usuarioDb, error: usuarioError } = await supabase
      .from("usuarios")
      .select("id, id_salao, nivel, status")
      .eq("auth_user_id", user.id)
      .maybeSingle<UsuarioSistemaRow>();

    if (usuarioError || !usuarioDb?.id || !usuarioDb?.id_salao) {
      throw new Error("Não foi possível localizar o usuário do sistema.");
    }

    if (String(usuarioDb.status || "").toLowerCase() !== "ativo") {
      throw new Error("Usuário inativo.");
    }

    const { data: permissoesDb } = await supabase
      .from("usuarios_permissoes")
      .select("*")
      .eq("id_usuario", usuarioDb.id)
      .eq("id_salao", usuarioDb.id_salao)
      .maybeSingle<Record<string, unknown>>();

    const permissoesFinais = {
      ...buildPermissoesByNivel(usuarioDb.nivel),
      ...sanitizePermissoesDb(permissoesDb),
      assinatura_ver:
        String(usuarioDb.nivel || "").toLowerCase() === "admin" &&
        Boolean(
          permissoesDb?.assinatura_ver ??
            buildPermissoesByNivel(usuarioDb.nivel).assinatura_ver
        ),
    } as Permissoes;

    setUsuario(user as UsuarioSupabase);
    setPermissoes(permissoesFinais);
    setNivel(String(usuarioDb.nivel || "").toLowerCase());
    setAcessoCarregado(true);

    if (!permissoesFinais.assinatura_ver) {
      router.replace("/dashboard");
      return null;
    }

    return {
      user: user as UsuarioSupabase,
      usuarioDb,
    };
  }, [router, supabase]);

  const montarCheckoutDaCobranca = useCallback(
    (cobranca: CobrancaAtualRow): CheckoutResponse => {
      const billing =
        cobranca.forma_pagamento === "PIX" ||
        cobranca.forma_pagamento === "BOLETO" ||
        cobranca.forma_pagamento === "CREDIT_CARD"
          ? cobranca.forma_pagamento
          : "PIX";

      return {
        ok: true,
        customerId: assinatura?.asaas_customer_id || "",
        paymentId:
          cobranca.asaas_payment_id ||
          cobranca.txid ||
          assinatura?.asaas_payment_id ||
          "",
        valor: Number(cobranca.valor || 0),
        plano: normalizarPlanoCobravel(assinatura?.plano),
        billingType: billing,
        status: cobranca.status || "PENDING",
        qrCodeBase64: null,
        pixCopiaCola: null,
        vencimento: cobranca.data_expiracao || "",
        invoiceUrl: cobranca.invoice_url || null,
        bankSlipUrl: cobranca.bank_slip_url || null,
      };
    },
    [assinatura?.asaas_customer_id, assinatura?.asaas_payment_id, assinatura?.plano]
  );

  const carregarCheckoutAtual = useCallback(
    async (idSalao: string) => {
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

      setCheckout(montarCheckoutDaCobranca(data));
    },
    [montarCheckoutDaCobranca, supabase]
  );

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
      setRenovacaoAutomatica(Boolean(assinaturaFinal?.renovacao_automatica));

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
        await carregarCheckoutAtual(idSalaoAtual);
      } else {
        setCheckout(null);
      }
    } catch (error: unknown) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar assinatura."
      );
    } finally {
      setLoading(false);
    }
  }, [carregarAcesso, carregarCheckoutAtual, supabase]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

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

  const verificarPagamentoAgora = useCallback(
    async (silencioso = false): Promise<void> => {
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

        const statusAtual = String(assinaturaAtual?.status || "").toLowerCase();

        if (["ativo", "ativa", "pago"].includes(statusAtual)) {
          setAguardandoPagamento(false);
          setCheckout(null);
          await carregarDados();
          return;
        }

        if (["pendente", "aguardando_pagamento"].includes(statusAtual)) {
          setAguardandoPagamento(true);
          await carregarCheckoutAtual(salao.id);
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
    [carregarCheckoutAtual, carregarDados, salao?.id, supabase]
  );

  useEffect(() => {
    if (!aguardandoPagamento || !salao?.id) return;

    const interval = setInterval(() => {
      void verificarPagamentoAgora(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [aguardandoPagamento, salao?.id, verificarPagamentoAgora]);

  async function atualizarRenovacaoAutomatica(value: boolean) {
    try {
      setSalvandoRenovacaoAutomatica(true);
      setErro("");

      if (!assinatura?.id || !salao?.id) {
        throw new Error("Assinatura não encontrada.");
      }

      const response = await fetch("/api/assinatura/toggle-renovacao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idSalao: salao.id,
          renovacaoAutomatica: value,
        }),
      });

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

  async function criarCobrancaAssinatura(): Promise<void> {
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

      const response = await fetch("/api/assinatura/criar-cobranca", {
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
      });

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

      await carregarDados();
    } catch (error: unknown) {
      setErro(
        error instanceof Error ? error.message : "Erro ao criar cobrança."
      );
    } finally {
      cobrancaRequestKeyRef.current = null;
      setGerandoCobranca(false);
    }
  }

  async function iniciarTrial(): Promise<void> {
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

      const response = await fetch("/api/assinatura/iniciar-trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idSalao: salao.id,
        }),
      });

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

  const valorAtual =
    assinatura?.valor ??
    PLANOS_INFO[assinatura?.plano || ""]?.valor ??
    PLANOS_INFO[planoSelecionado]?.valor ??
    0;

  const statusNormalizado = String(assinatura?.status || "").toLowerCase();
  const semAssinatura = !assinatura;
  const ehStatusTrial = ["teste_gratis", "trial"].includes(statusNormalizado);
  const trialAtivo = ehStatusTrial && !resumoAssinatura.vencida;
  const trialVencido = ehStatusTrial && resumoAssinatura.vencida;
  const assinaturaAtivaPaga =
    ["ativo", "ativa", "pago"].includes(statusNormalizado) &&
    !resumoAssinatura.vencida;

  const mostrarBotaoIniciarTrial = semAssinatura && podeGerenciar;

  const mostrarBotaoRegularizar =
    podeGerenciar &&
    (
      aguardandoPagamento ||
      trialVencido ||
      (!ehStatusTrial &&
        (resumoAssinatura.vencida || resumoAssinatura.vencendoLogo))
    );

  const esconderBotaoPadraoRenovacao =
    trialAtivo || (assinaturaAtivaPaga && !resumoAssinatura.vencendoLogo);

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
    historicoModalOpen,
    abrirHistoricoModal,
    fecharHistoricoModal,
    carregandoHistorico,
    historicoCobrancas,
    renovacaoAutomatica,
    salvandoRenovacaoAutomatica,
    atualizarRenovacaoAutomatica,
    tipoMudancaPlano,
  };
}

