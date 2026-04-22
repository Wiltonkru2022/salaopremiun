import { randomUUID } from "node:crypto";
import { addDays, format, isAfter } from "date-fns";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  captureSystemError,
  captureSystemEvent,
  registrarAcaoAutomaticaSistema,
  upsertSystemHealthCheck,
} from "@/lib/monitoring/server";
import {
  createAsaasSubscription,
  isAsaasSubscriptionNotFoundError,
  removeAsaasSubscription,
} from "@/lib/payments/asaas-subscriptions";
import type { Database, Json } from "@/types/database.generated";

export type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD";
type TipoMovimentoAssinatura = "upgrade" | "downgrade" | "renovacao";

export type CardPayload = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

export type BodyInput = {
  idSalao: string;
  nomeSalao?: string;
  responsavelNome: string;
  responsavelEmail: string;
  responsavelCpfCnpj?: string;
  responsavelTelefone?: string;
  cep?: string;
  numero?: string;
  complemento?: string;
  plano: "basico" | "pro" | "premium";
  billingType: BillingType;
  creditCard?: CardPayload;
};

type PlanoSaasRow = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  valor_mensal: number | string;
  limite_usuarios: number | null;
  limite_profissionais: number | null;
  ativo: boolean;
};

type CheckoutReservaRow = {
  checkout_lock_id: string | null;
  should_process: boolean;
  reason: string;
  existing_cobranca_id: string | null;
};

type AssinaturaInsert = Database["public"]["Tables"]["assinaturas"]["Insert"];

export type CheckoutResponsePayload = {
  ok: true;
  customerId: string;
  paymentId: string;
  valor: number;
  plano: string;
  billingType: BillingType;
  status: string;
  qrCodeBase64: string | null;
  pixCopiaCola: string | null;
  vencimento: string;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  reused?: boolean;
  reason?: string;
};

export class AssinaturaCheckoutServiceError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "AssinaturaCheckoutServiceError";
    this.status = status;
  }
}

export function createAssinaturaCheckoutService() {
  return {
    criarCobranca,
  };
}

export type AssinaturaCheckoutService = ReturnType<
  typeof createAssinaturaCheckoutService
>;
function responseJson<T>(body: T, init?: { status?: number }) {
  return {
    status: init?.status ?? 200,
    body,
  };
}

async function getSupabaseServer() {
  const cookieStore = await cookies();
  const headersList = await headers();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.");
  }

  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada.");
  }

  const cookieOptions = getSupabaseCookieOptions(headersList.get("host"));

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // route handler não precisa gravar cookie aqui
      },
    },
  });
}

async function validarSalaoDoUsuario(idSalao: string) {
  const supabase = await getSupabaseServer();
  const supabaseAdmin = getSupabaseAdmin();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new AssinaturaCheckoutServiceError("Erro ao validar usuário autenticado.", 401);
  }

  if (!user) {
    throw new AssinaturaCheckoutServiceError("Usuário não autenticado.", 401);
  }

  const { data: usuario, error: usuarioError } = await supabaseAdmin
    .from("usuarios")
    .select("id_salao, status, nivel")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError) {
    throw new AssinaturaCheckoutServiceError("Erro ao validar vínculo do usuário com o salão.", 500);
  }

  if (!usuario?.id_salao) {
    throw new AssinaturaCheckoutServiceError("Usuário sem salão vinculado.", 403);
  }

  if (String(usuario.status || "").toLowerCase() !== "ativo") {
    throw new AssinaturaCheckoutServiceError("Usuário inativo.", 403);
  }

  if (usuario.id_salao !== idSalao) {
    throw new AssinaturaCheckoutServiceError("Acesso negado para este salão.", 403);
  }

  if (String(usuario.nivel || "").toLowerCase() !== "admin") {
    throw new AssinaturaCheckoutServiceError("Somente administrador pode gerenciar assinatura.", 403);
  }

  return { user };
}

function getAsaasHeaders() {
  const apiKey = process.env.ASAAS_API_KEY;

  if (!apiKey) {
    throw new Error("ASAAS_API_KEY não configurado.");
  }

  return {
    accept: "application/json",
    "content-type": "application/json",
    access_token: apiKey,
  };
}

function getAsaasBaseUrl() {
  return process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";
}

function onlyNumbers(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function isEmailValido(email?: string | null) {
  return !!String(email || "")
    .trim()
    .match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
}

function mapBillingType(tipo: BillingType) {
  if (tipo === "PIX") return "PIX";
  if (tipo === "BOLETO") return "BOLETO";
  return "CREDIT_CARD";
}

function isAsaasPaymentPaid(status?: unknown) {
  return ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(
    String(status || "").toUpperCase()
  );
}

function getWebhookEventOrderFromAsaasStatus(status?: unknown) {
  return isAsaasPaymentPaid(status) ? 100 : 20;
}

function calcularVencimentoAssinaturaPaga(assinatura?: {
  vencimento_em?: string | null;
  trial_fim_em?: string | null;
}) {
  const agora = new Date();
  let baseDate = agora;

  if (assinatura?.vencimento_em) {
    const vencimentoAtual = new Date(`${assinatura.vencimento_em}T23:59:59`);

    if (
      !Number.isNaN(vencimentoAtual.getTime()) &&
      isAfter(vencimentoAtual, baseDate)
    ) {
      baseDate = vencimentoAtual;
    }
  }

  if (assinatura?.trial_fim_em) {
    const trialFimAtual = new Date(assinatura.trial_fim_em);

    if (
      !Number.isNaN(trialFimAtual.getTime()) &&
      isAfter(trialFimAtual, baseDate)
    ) {
      baseDate = trialFimAtual;
    }
  }

  return format(addDays(baseDate, 30), "yyyy-MM-dd");
}

function normalizarIdempotencyKey(value?: string | null) {
  const normalized = String(value || "")
    .trim()
    .replace(/[^\w:.-]/g, "")
    .slice(0, 160);

  return normalized || randomUUID();
}

export function getCheckoutIdempotencyKeyFromHeaders(headers: Headers) {
  return normalizarIdempotencyKey(
    headers.get("idempotency-key") || headers.get("x-idempotency-key")
  );
}

function isBillingType(value?: string | null): value is BillingType {
  return value === "PIX" || value === "BOLETO" || value === "CREDIT_CARD";
}

function normalizarPlanoCobranca(value?: string | null) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-\s]+/g, "_")
    .trim()
    .toLowerCase();
  const codigo = normalized.startsWith("plano_")
    ? normalized.replace(/^plano_/, "")
    : normalized;

  if (codigo === "basico" || codigo === "pro" || codigo === "premium") {
    return codigo;
  }

  if (
    !codigo ||
    codigo === "teste_gratis" ||
    codigo === "testegratis" ||
    codigo === "trial" ||
    codigo === "gratis"
  ) {
    return "basico";
  }

  return null;
}

function getPlanoOrdem(plano?: string | null) {
  const codigo = String(plano || "").toLowerCase();

  if (codigo === "basico") return 1;
  if (codigo === "pro") return 2;
  if (codigo === "premium") return 3;

  return 0;
}

function getTipoMovimento(
  planoOrigem?: string | null,
  planoDestino?: string | null
): TipoMovimentoAssinatura {
  const origem = String(planoOrigem || "").toLowerCase();
  const destino = String(planoDestino || "").toLowerCase();

  if (!origem || origem === destino) {
    return "renovacao";
  }

  const ordemOrigem = getPlanoOrdem(origem);
  const ordemDestino = getPlanoOrdem(destino);

  if (ordemDestino > ordemOrigem) {
    return "upgrade";
  }

  if (ordemDestino < ordemOrigem) {
    return "downgrade";
  }

  return "renovacao";
}

async function getRemoteIp() {
  const requestHeaders = await headers();

  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0]?.trim();
    if (ip) return ip;
  }

  const realIp = requestHeaders.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfConnectingIp = requestHeaders.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  return "127.0.0.1";
}

async function parseJsonSafe(response: Response) {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch {
    throw new Error("Resposta inválida recebida do Asaas.");
  }
}

async function buscarOuCriarCustomerAsaas(params: {
  nome: string;
  email: string;
  cpfCnpj?: string;
  telefone?: string;
  cep?: string;
  numero?: string;
  complemento?: string;
}) {
  const baseUrl = getAsaasBaseUrl();
  const headers = getAsaasHeaders();

  const cpfCnpj = onlyNumbers(params.cpfCnpj);
  const email = String(params.email || "").trim().toLowerCase();

  if (cpfCnpj) {
    const buscaPorCpf = await fetch(
      `${baseUrl}/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

    const buscaPorCpfJson = await parseJsonSafe(buscaPorCpf);

    if (!buscaPorCpf.ok) {
      throw new Error(
        (buscaPorCpfJson as { errors?: Array<{ description?: string }> })
          ?.errors?.[0]?.description || "Erro ao buscar customer no Asaas."
      );
    }

    if (
      Array.isArray((buscaPorCpfJson as { data?: unknown[] })?.data) &&
      (buscaPorCpfJson as { data: unknown[] }).data.length > 0
    ) {
      return (buscaPorCpfJson as { data: Array<Record<string, unknown>> }).data[0];
    }
  }

  if (email) {
    const buscaPorEmail = await fetch(
      `${baseUrl}/customers?email=${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

    const buscaPorEmailJson = await parseJsonSafe(buscaPorEmail);

    if (!buscaPorEmail.ok) {
      throw new Error(
        (buscaPorEmailJson as { errors?: Array<{ description?: string }> })
          ?.errors?.[0]?.description ||
          "Erro ao buscar customer por e-mail no Asaas."
      );
    }

    if (
      Array.isArray((buscaPorEmailJson as { data?: unknown[] })?.data) &&
      (buscaPorEmailJson as { data: unknown[] }).data.length > 0
    ) {
      return (buscaPorEmailJson as { data: Array<Record<string, unknown>> }).data[0];
    }
  }

  const payload = {
    name: params.nome,
    email: email || undefined,
    cpfCnpj: cpfCnpj || undefined,
    mobilePhone: onlyNumbers(params.telefone) || undefined,
    postalCode: onlyNumbers(params.cep) || undefined,
    addressNumber: params.numero || undefined,
    complement: params.complemento || undefined,
    notificationDisabled: false,
  };

  const createRes = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const createJson = await parseJsonSafe(createRes);

  if (!createRes.ok) {
    throw new Error(
      (createJson as { errors?: Array<{ description?: string }> })?.errors?.[0]
        ?.description || "Erro ao criar customer no Asaas."
    );
  }

  return createJson as Record<string, unknown>;
}

async function criarCobrancaAsaas(params: {
  customer: string;
  billingType: BillingType;
  value: number;
  dueDate: string;
  description: string;
  remoteIp?: string;
  creditCard?: CardPayload;
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj?: string;
    postalCode?: string;
    addressNumber?: string;
    phone?: string;
  };
}) {
  const baseUrl = getAsaasBaseUrl();
  const headers = getAsaasHeaders();

  const billingType = mapBillingType(params.billingType);

  const payload: Record<string, unknown> = {
    customer: params.customer,
    billingType,
    value: params.value,
    dueDate: params.dueDate,
    description: params.description,
  };

  if (billingType === "BOLETO") {
    payload.daysAfterDueDateToRegistrationCancellation = 1;
  }

  if (billingType === "CREDIT_CARD") {
    if (!params.creditCard || !params.creditCardHolderInfo) {
      throw new Error("Dados do cartão não enviados.");
    }

    payload.creditCard = {
      holderName: params.creditCard.holderName,
      number: onlyNumbers(params.creditCard.number),
      expiryMonth: onlyNumbers(params.creditCard.expiryMonth),
      expiryYear: onlyNumbers(params.creditCard.expiryYear),
      ccv: onlyNumbers(params.creditCard.ccv),
    };

    payload.creditCardHolderInfo = {
      name: params.creditCardHolderInfo.name,
      email: params.creditCardHolderInfo.email,
      cpfCnpj: onlyNumbers(params.creditCardHolderInfo.cpfCnpj),
      postalCode: onlyNumbers(params.creditCardHolderInfo.postalCode),
      addressNumber: params.creditCardHolderInfo.addressNumber,
      phone: onlyNumbers(params.creditCardHolderInfo.phone),
    };

    payload.remoteIp = params.remoteIp || "127.0.0.1";
  }

  const response = await fetch(`${baseUrl}/payments`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const json = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(
      (json as { errors?: Array<{ description?: string }> })?.errors?.[0]
        ?.description || "Erro ao criar cobrança no Asaas."
    );
  }

  return json as Record<string, unknown>;
}

async function buscarPayloadPix(paymentId: string) {
  const baseUrl = getAsaasBaseUrl();
  const headers = getAsaasHeaders();

  const response = await fetch(`${baseUrl}/payments/${paymentId}/pixQrCode`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const json = await parseJsonSafe(response);

  if (!response.ok) {
    throw new Error(
      (json as { errors?: Array<{ description?: string }> })?.errors?.[0]
        ?.description || "Erro ao buscar QR Code PIX."
    );
  }

  return json as Record<string, unknown>;
}

async function reservarCheckoutAssinatura(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  idSalao: string;
  planoCodigo: string;
  billingType: BillingType;
  valor: number;
  idempotencyKey: string;
  payload: Record<string, unknown>;
}) {
  const { data, error } = await params.supabaseAdmin.rpc(
    "fn_assinatura_reservar_checkout",
    {
      p_id_salao: params.idSalao,
      p_plano_codigo: params.planoCodigo,
      p_billing_type: params.billingType,
      p_valor: params.valor,
      p_idempotency_key: params.idempotencyKey,
      p_payload: params.payload as Json,
    }
  );

  if (error) {
    throw new AssinaturaCheckoutServiceError(
      error.message || "Erro ao reservar checkout da assinatura.",
      500
    );
  }

  const reserva = Array.isArray(data)
    ? (data[0] as CheckoutReservaRow | undefined)
    : (data as CheckoutReservaRow | null);

  if (!reserva) {
    throw new AssinaturaCheckoutServiceError("Erro ao reservar checkout da assinatura.", 500);
  }

  return reserva;
}

async function marcarCheckoutConcluido(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  checkoutLockId: string | null;
  idCobranca: string;
  paymentId: string;
  response: CheckoutResponsePayload;
}) {
  if (!params.checkoutLockId) return;

  const { error } = await params.supabaseAdmin.rpc(
    "fn_assinatura_concluir_checkout",
    {
      p_checkout_lock_id: params.checkoutLockId,
      p_id_cobranca: params.idCobranca,
      p_asaas_payment_id: params.paymentId,
      p_response_json: params.response,
    }
  );

  if (error) {
    console.error("Erro ao concluir lock de checkout:", error);
  }
}

async function marcarCheckoutFalho(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  checkoutLockId: string | null;
  paymentId?: string | null;
  errorMessage: string;
  response?: Record<string, unknown>;
}) {
  if (!params.checkoutLockId) return;

  const { error } = await params.supabaseAdmin.rpc(
    "fn_assinatura_falhar_checkout",
    {
      p_checkout_lock_id: params.checkoutLockId,
      p_erro_texto: params.errorMessage,
      p_asaas_payment_id: params.paymentId || undefined,
      p_response_json: (params.response || {}) as Json,
    }
  );

  if (error) {
    console.error("Erro ao marcar checkout como falho:", error);
  }
}

async function montarCheckoutExistente(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  idSalao: string;
  idCobranca: string;
  planoFallback: string;
  reason: string;
}) {
  const { data, error } = await params.supabaseAdmin
    .from("assinaturas_cobrancas")
    .select(`
      id,
      asaas_customer_id,
      asaas_payment_id,
      txid,
      valor,
      status,
      forma_pagamento,
      data_expiracao,
      invoice_url,
      bank_slip_url,
      plano_destino,
      plano_origem
    `)
    .eq("id", params.idCobranca)
    .eq("id_salao", params.idSalao)
    .maybeSingle();

  if (error || !data) {
    throw new AssinaturaCheckoutServiceError(
      error?.message || "Cobrança existente não encontrada.",
      500
    );
  }

  const billingCandidate = String(data.forma_pagamento || "").toUpperCase();
  const billingType = isBillingType(billingCandidate) ? billingCandidate : "PIX";
  const paymentId = String(data.asaas_payment_id || data.txid || "").trim();
  let qrCodeBase64: string | null = null;
  let pixCopiaCola: string | null = null;

  if (billingType === "PIX" && paymentId) {
    try {
      const pixPayload = await buscarPayloadPix(paymentId);
      qrCodeBase64 = String(pixPayload?.encodedImage || "") || null;
      pixCopiaCola = String(pixPayload?.payload || "") || null;
    } catch (error) {
      console.error("Erro ao recuperar Pix de cobrança existente:", error);
    }
  }

  return {
    ok: true,
    customerId: String(data.asaas_customer_id || ""),
    paymentId,
    valor: Number(data.valor || 0),
    plano:
      String(data.plano_destino || data.plano_origem || "").trim() ||
      params.planoFallback,
    billingType,
    status: String(data.status || "PENDING"),
    qrCodeBase64,
    pixCopiaCola,
    vencimento: String(data.data_expiracao || ""),
    invoiceUrl: String(data.invoice_url || "").trim() || null,
    bankSlipUrl: String(data.bank_slip_url || "").trim() || null,
    reused: true,
    reason: params.reason,
  } satisfies CheckoutResponsePayload;
}

function getCardSnapshot(payment: Record<string, unknown>) {
  const creditCard =
    payment.creditCard && typeof payment.creditCard === "object"
      ? (payment.creditCard as Record<string, unknown>)
      : null;
  const token = String(creditCard?.creditCardToken || "").trim() || null;
  const brand = String(creditCard?.creditCardBrand || "").trim() || null;
  const last4 = String(creditCard?.creditCardNumber || "").trim() || null;

  return {
    token,
    brand,
    last4,
    tokenizedAt: token ? new Date().toISOString() : null,
  };
}

async function limparAssinaturaRecorrenteCartao(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  assinaturaId: string;
  asaasSubscriptionId?: string | null;
  idSalao: string;
  route: string;
  reason: string;
}) {
  const subscriptionId = String(params.asaasSubscriptionId || "").trim();

  if (subscriptionId) {
    try {
      await removeAsaasSubscription(subscriptionId);
    } catch (error) {
      if (!isAsaasSubscriptionNotFoundError(error)) {
        await captureSystemError({
          module: "assinatura",
          action: "remover_assinatura_recorrente_cartao",
          origin: "integration",
          idSalao: params.idSalao,
          route: params.route,
          entity: "assinatura",
          entityId: params.assinaturaId,
          error,
          details: {
            asaasSubscriptionId: subscriptionId,
            reason: params.reason,
          },
          incidentKey: `assinatura_recorrente_cleanup:${params.assinaturaId}`,
          incidentTitle:
            "Falha ao remover assinatura recorrente do cartao no Asaas",
          suggestedAction:
            "Revisar a assinatura recorrente no Asaas antes de concluir a troca da forma de pagamento.",
          automationAvailable: false,
        });
        return false;
      }
    }
  }

  const { error: cleanupError } = await params.supabaseAdmin
    .from("assinaturas")
    .update({
      asaas_subscription_id: null,
      asaas_subscription_status: null,
    })
    .eq("id", params.assinaturaId)
    .eq("id_salao", params.idSalao);

  if (cleanupError) {
    await captureSystemError({
      module: "assinatura",
      action: "limpar_assinatura_recorrente_cartao_local",
      origin: "api",
      idSalao: params.idSalao,
      route: params.route,
      entity: "assinatura",
      entityId: params.assinaturaId,
      error: new Error(cleanupError.message),
      details: {
        asaasSubscriptionId: subscriptionId || null,
        reason: params.reason,
      },
      incidentKey: `assinatura_recorrente_cleanup_local:${params.assinaturaId}`,
      incidentTitle:
        "Falha ao limpar assinatura recorrente do cartao no sistema",
      suggestedAction:
        "Revisar o registro local da assinatura recorrente antes da proxima renovacao.",
      automationAvailable: false,
    });
    return false;
  }

  return true;
}

async function criarCobranca(params: {
  body: BodyInput;
  idempotencyKey: string;
}) {
  let supabaseAdmin: ReturnType<typeof getSupabaseAdmin> | null = null;
  let checkoutLockId: string | null = null;
  let checkoutPaymentId: string | null = null;
  let monitoredBody: BodyInput | null = null;
  const startedAt = Date.now();

  try {
    supabaseAdmin = getSupabaseAdmin();
    const body = params.body;
    monitoredBody = body;
    const idempotencyKey = params.idempotencyKey;

    const idSalao = String(body.idSalao || "").trim();
    const planoCodigo = normalizarPlanoCobranca(body.plano);
    const billingType = body.billingType;

    if (!idSalao) {
      return responseJson(
        { error: "idSalao é obrigatório." },
        { status: 400 }
      );
    }

    const acesso = await validarSalaoDoUsuario(idSalao);

    if (!planoCodigo) {
      return responseJson({ error: "Plano inválido." }, { status: 400 });
    }

    if (!["PIX", "BOLETO", "CREDIT_CARD"].includes(String(billingType))) {
      return responseJson(
        { error: "Forma de pagamento inválida." },
        { status: 400 }
      );
    }

    if (!body.responsavelNome?.trim()) {
      return responseJson(
        { error: "Nome do responsável é obrigatório." },
        { status: 400 }
      );
    }

    if (!isEmailValido(body.responsavelEmail)) {
      return responseJson(
        { error: "E-mail do responsável inválido." },
        { status: 400 }
      );
    }

    if (billingType === "CREDIT_CARD") {
      const cc = body.creditCard;

      if (
        !cc?.holderName?.trim() ||
        !cc?.number?.trim() ||
        !cc?.expiryMonth?.trim() ||
        !cc?.expiryYear?.trim() ||
        !cc?.ccv?.trim()
      ) {
        return responseJson(
          { error: "Preencha todos os dados do cartão." },
          { status: 400 }
        );
      }
    }

    const { data: salaoData, error: salaoError } = await supabaseAdmin
      .from("saloes")
      .select("id, nome, email, telefone, cpf_cnpj, cep, numero, complemento")
      .eq("id", idSalao)
      .maybeSingle();

    if (salaoError) {
      return responseJson(
        { error: salaoError.message || "Erro ao consultar salão." },
        { status: 500 }
      );
    }

    if (!salaoData?.id) {
      return responseJson(
        { error: "Salão não encontrado." },
        { status: 404 }
      );
    }

    const { data: assinaturaExistenteFull, error: assinaturaExistenteFullError } =
      await supabaseAdmin
        .from("assinaturas")
        .select(
          "id, plano, vencimento_em, trial_fim_em, renovacao_automatica, asaas_subscription_id"
        )
        .eq("id_salao", idSalao)
        .maybeSingle();

    if (assinaturaExistenteFullError) {
      return responseJson(
        {
          error:
            assinaturaExistenteFullError.message ||
            "Erro ao consultar assinatura atual.",
        },
        { status: 500 }
      );
    }

    const planoOrigem = String(assinaturaExistenteFull?.plano || "").trim() || null;
    const planoDestino = planoCodigo;
    const tipoMovimento = getTipoMovimento(planoOrigem, planoDestino);

    const { data: planoData, error: planoError } = await supabaseAdmin
      .from("planos_saas")
      .select(`
        id,
        codigo,
        nome,
        descricao,
        valor_mensal,
        limite_usuarios,
        limite_profissionais,
        ativo
      `)
      .eq("codigo", planoCodigo)
      .eq("ativo", true)
      .maybeSingle();

    if (planoError) {
      return responseJson(
        { error: planoError.message || "Erro ao consultar plano." },
        { status: 500 }
      );
    }

    const plano = planoData as PlanoSaasRow | null;

    if (!plano?.id) {
      return responseJson(
        { error: "Plano não encontrado ou inativo." },
        { status: 404 }
      );
    }

    const valor = Number(plano.valor_mensal || 0);
    const limiteUsuarios = Number(plano.limite_usuarios || 0);
    const limiteProfissionais = Number(plano.limite_profissionais || 0);

    if (valor <= 0) {
      return responseJson(
        { error: "Valor do plano inválido." },
        { status: 400 }
      );
    }

    const reservaCheckout = await reservarCheckoutAssinatura({
      supabaseAdmin,
      idSalao,
      planoCodigo,
      billingType,
      valor,
      idempotencyKey,
      payload: {
        origem: "checkout_manual",
        id_usuario_auth: acesso.user.id,
        plano_origem: planoOrigem,
        plano_destino: planoDestino,
        tipo_movimento: tipoMovimento,
        billing_type: billingType,
      },
    });

    checkoutLockId = reservaCheckout.checkout_lock_id;

    if (!reservaCheckout.should_process) {
      if (reservaCheckout.existing_cobranca_id) {
        const checkoutExistente = await montarCheckoutExistente({
          supabaseAdmin,
          idSalao,
          idCobranca: reservaCheckout.existing_cobranca_id,
          planoFallback: planoCodigo,
          reason: reservaCheckout.reason,
        });

        await captureSystemEvent({
          module: "assinatura",
          eventType: "action_succeeded",
          severity: "info",
          message: "Checkout existente reutilizado para assinatura.",
          action: "reutilizar_checkout_existente",
          origin: "api",
          idSalao,
          route: "/api/assinatura/criar-cobranca",
          entity: "assinatura_cobranca",
          entityId: reservaCheckout.existing_cobranca_id,
          responseMs: Date.now() - startedAt,
          success: true,
          details: {
            billingType,
            plano: planoCodigo,
            reason: reservaCheckout.reason,
          },
          createIncident: false,
        });

        return responseJson(checkoutExistente);
      }

      const requiresReconciliation =
        reservaCheckout.reason === "provider_payment_pending_reconciliation";

      await captureSystemEvent({
        module: "assinatura",
        eventType: "action_failed",
        severity: requiresReconciliation ? "error" : "warning",
        message:
          requiresReconciliation
            ? "Checkout bloqueado aguardando reconciliacao do provedor."
            : "Checkout duplicado bloqueado por idempotencia.",
        action: "bloquear_checkout_duplicado",
        origin: "api",
        idSalao,
        route: "/api/assinatura/criar-cobranca",
        responseMs: Date.now() - startedAt,
        success: false,
        details: {
          billingType,
          plano: planoCodigo,
          reason: reservaCheckout.reason,
        },
        incidentKey: `assinatura_checkout:${idSalao}:${reservaCheckout.reason}`,
        incidentTitle: "Checkout de assinatura bloqueado",
        suggestedAction:
          requiresReconciliation
            ? "Reconciliar o pagamento pendente no provedor antes de liberar nova cobranca."
            : "Aguardar a conclusao do checkout ja em andamento.",
        automationAvailable: false,
      });

      return responseJson(
        {
          error:
            "Já existe uma cobrança sendo gerada para este salão. Aguarde alguns segundos e tente novamente.",
          reason: reservaCheckout.reason,
        },
        { status: requiresReconciliation ? 423 : 409 }
      );
    }

    const customer = await buscarOuCriarCustomerAsaas({
      nome: body.responsavelNome.trim(),
      email: body.responsavelEmail.trim().toLowerCase(),
      cpfCnpj: body.responsavelCpfCnpj || salaoData.cpf_cnpj || undefined,
      telefone: body.responsavelTelefone || salaoData.telefone || undefined,
      cep: body.cep || salaoData.cep || undefined,
      numero: body.numero || salaoData.numero || undefined,
      complemento: body.complemento || salaoData.complemento || undefined,
    });

    const customerId = String(customer.id || "").trim();

    if (!customerId) {
      throw new AssinaturaCheckoutServiceError(
        "Nao foi possivel identificar o customer no Asaas.",
        500
      );
    }

    const dueDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
    const remoteIp =
      billingType === "CREDIT_CARD" ? await getRemoteIp() : undefined;

    const payment = await criarCobrancaAsaas({
      customer: customerId,
      billingType,
      value: valor,
      dueDate,
      description: `Assinatura ${plano.nome} - ${
        body.nomeSalao || salaoData.nome || "SalaoPremium"
      }`,
      remoteIp,
      creditCard: body.creditCard,
      creditCardHolderInfo:
        billingType === "CREDIT_CARD"
          ? {
              name: body.responsavelNome.trim(),
              email: body.responsavelEmail.trim().toLowerCase(),
              cpfCnpj:
                body.responsavelCpfCnpj || salaoData.cpf_cnpj || undefined,
              postalCode: body.cep || salaoData.cep || undefined,
              addressNumber: body.numero || salaoData.numero || undefined,
              phone:
                body.responsavelTelefone || salaoData.telefone || undefined,
            }
          : undefined,
    });

    const paymentId = String(payment.id || "").trim();
    checkoutPaymentId = paymentId || null;

    if (!paymentId) {
      throw new AssinaturaCheckoutServiceError(
        "Nao foi possivel identificar a cobranca criada no Asaas.",
        500
      );
    }

    let qrCodeBase64: string | null = null;
    let pixCopiaCola: string | null = null;

    if (billingType === "PIX") {
      try {
        const pixPayload = await buscarPayloadPix(paymentId);
        qrCodeBase64 = String(pixPayload?.encodedImage || "") || null;
        pixCopiaCola = String(pixPayload?.payload || "") || null;
      } catch (error) {
        console.error("Erro ao buscar QR Code Pix da cobranca:", error);
        await captureSystemError({
          module: "assinatura",
          action: "buscar_qr_code_pix",
          origin: "integration",
          idSalao,
          route: "/api/assinatura/criar-cobranca",
          entity: "assinatura_cobranca",
          entityId: paymentId,
          error,
          details: {
            billingType,
            plano: planoCodigo,
          },
          incidentKey: `assinatura_pix:${paymentId}`,
          incidentTitle: "Falha ao recuperar QR Code Pix",
          suggestedAction: "Reprocessar a captura do QR Code Pix da cobranca.",
          automationAvailable: false,
        });
      }
    }

    const pagamentoConfirmado = isAsaasPaymentPaid(payment.status);
    const assinaturaStatus = pagamentoConfirmado ? "ativo" : "pendente";
    const vencimentoEm = pagamentoConfirmado
      ? calcularVencimentoAssinaturaPaga(assinaturaExistenteFull || undefined)
      : dueDate;
    const pagoEm = pagamentoConfirmado ? new Date().toISOString() : null;
    const cardSnapshot = getCardSnapshot(payment);
    const webhookEventOrderInicial = getWebhookEventOrderFromAsaasStatus(
      payment.status
    );

    const { data: assinaturaExistente, error: assinaturaBuscaError } =
      await supabaseAdmin
        .from("assinaturas")
        .select("id")
        .eq("id_salao", idSalao)
        .maybeSingle();

    if (assinaturaBuscaError) {
      throw new AssinaturaCheckoutServiceError(
        assinaturaBuscaError.message || "Erro ao consultar assinatura.",
        500
      );
    }

    let assinaturaId = "";

    if (assinaturaExistente?.id) {
      assinaturaId = assinaturaExistente.id;

      const assinaturaUpdate: Record<string, unknown> = {
        asaas_customer_id: customerId,
        asaas_payment_id: paymentId,
        plano: plano.codigo,
        valor,
        status: assinaturaStatus,
        vencimento_em: vencimentoEm,
        pago_em: pagoEm,
        limite_profissionais: limiteProfissionais,
        limite_usuarios: limiteUsuarios,
        trial_ativo: "false",
        trial_inicio_em: null,
        trial_fim_em: null,
        forma_pagamento_atual: billingType,
        id_cobranca_atual: null,
        gateway: "asaas",
        referencia_atual:
          String(payment.invoiceNumber || "").trim() || paymentId,
      };

      if (cardSnapshot.token) {
        assinaturaUpdate.asaas_credit_card_token = cardSnapshot.token;
        assinaturaUpdate.asaas_credit_card_brand = cardSnapshot.brand;
        assinaturaUpdate.asaas_credit_card_last4 = cardSnapshot.last4;
        assinaturaUpdate.asaas_credit_card_tokenized_at =
          cardSnapshot.tokenizedAt;
      }

      const { error: updateAssinaturaError } = await supabaseAdmin
        .from("assinaturas")
        .update(assinaturaUpdate)
        .eq("id", assinaturaId)
        .eq("id_salao", idSalao);

      if (updateAssinaturaError) {
        throw new AssinaturaCheckoutServiceError(
          updateAssinaturaError.message || "Erro ao atualizar assinatura.",
          500
        );
      }
    } else {
      const assinaturaInsert: AssinaturaInsert = {
        id_salao: idSalao,
        asaas_customer_id: customerId,
        asaas_payment_id: paymentId,
        plano: plano.codigo,
        valor,
        status: assinaturaStatus,
        vencimento_em: vencimentoEm,
        pago_em: pagoEm,
        limite_profissionais: limiteProfissionais,
        limite_usuarios: limiteUsuarios,
        trial_ativo: "false",
        trial_inicio_em: null,
        trial_fim_em: null,
        forma_pagamento_atual: billingType,
        id_cobranca_atual: null,
        gateway: "asaas",
        referencia_atual:
          String(payment.invoiceNumber || "").trim() || paymentId,
      };

      if (cardSnapshot.token) {
        assinaturaInsert.asaas_credit_card_token = cardSnapshot.token;
        assinaturaInsert.asaas_credit_card_brand = cardSnapshot.brand;
        assinaturaInsert.asaas_credit_card_last4 = cardSnapshot.last4;
        assinaturaInsert.asaas_credit_card_tokenized_at =
          cardSnapshot.tokenizedAt;
      }

      const { data: novaAssinatura, error: insertAssinaturaError } =
        await supabaseAdmin
          .from("assinaturas")
          .insert(assinaturaInsert)
          .select("id")
          .single();

      if (insertAssinaturaError || !novaAssinatura?.id) {
        throw new AssinaturaCheckoutServiceError(
          insertAssinaturaError?.message || "Erro ao criar assinatura.",
          500
        );
      }

      assinaturaId = novaAssinatura.id;
    }

    const { data: cobrancaInserida, error: cobrancaInsertError } =
      await supabaseAdmin
        .from("assinaturas_cobrancas")
        .insert({
          id_salao: idSalao,
          id_assinatura: assinaturaId,
          id_plano: plano.id,
          referencia: String(payment.invoiceNumber || "").trim() || paymentId,
          descricao: `Assinatura ${plano.nome} - ${
            body.nomeSalao || salaoData.nome || "SalaoPremium"
          }`,
          valor,
          status: assinaturaStatus,
          forma_pagamento: billingType,
          gateway: "asaas",
          txid: billingType === "PIX" ? paymentId : null,
          asaas_payment_id: paymentId,
          asaas_customer_id: customerId,
          payment_date: pagoEm,
          confirmed_date: pagoEm,
          invoice_url: String(payment.invoiceUrl || "").trim() || null,
          bank_slip_url: String(payment.bankSlipUrl || "").trim() || null,
          data_expiracao: dueDate,
          external_reference: idSalao,
          asaas_subscription_id: null,
          webhook_payload: null,
          webhook_last_event: null,
          webhook_event_order: webhookEventOrderInicial,
          webhook_processed_at: pagamentoConfirmado ? pagoEm : null,
          asaas_status: String(payment.status || "PENDING").toUpperCase(),
          idempotency_key: idempotencyKey,
          checkout_lock_id: checkoutLockId,
          deleted: false,
          plano_origem: planoOrigem,
          plano_destino: planoDestino,
          tipo_movimento: tipoMovimento,
          gerada_automaticamente: false,
          metadata: {
            origem: "checkout_manual",
            plano: plano.codigo,
            billingType,
            plano_origem: planoOrigem,
            plano_destino: planoDestino,
            tipo_movimento: tipoMovimento,
            gerada_automaticamente: false,
          },
        })
        .select("id")
        .single();

    if (cobrancaInsertError || !cobrancaInserida?.id) {
      throw new AssinaturaCheckoutServiceError(
        cobrancaInsertError?.message ||
          "Erro ao criar registro da cobranca.",
        500
      );
    }

    const { error: updateAssinaturaComCobrancaError } = await supabaseAdmin
      .from("assinaturas")
      .update({
        id_cobranca_atual: cobrancaInserida.id,
      })
      .eq("id", assinaturaId)
      .eq("id_salao", idSalao);

    if (updateAssinaturaComCobrancaError) {
      throw new AssinaturaCheckoutServiceError(
        updateAssinaturaComCobrancaError.message ||
          "Erro ao vincular cobranca na assinatura.",
        500
      );
    }

    const { error: salaoUpdateError } = await supabaseAdmin
      .from("saloes")
      .update({
        plano: plano.codigo,
        limite_profissionais: limiteProfissionais,
        limite_usuarios: limiteUsuarios,
        trial_ativo: false,
        trial_inicio_em: null,
        trial_fim_em: null,
        status: assinaturaStatus,
      })
      .eq("id", idSalao);

    if (salaoUpdateError) {
      throw new AssinaturaCheckoutServiceError(
        salaoUpdateError.message || "Erro ao atualizar salao.",
        500
      );
    }

    const assinaturaAutoRenovacao = Boolean(
      assinaturaExistenteFull?.renovacao_automatica
    );
    const assinaturaRecorrenteAtual =
      String(assinaturaExistenteFull?.asaas_subscription_id || "").trim() || null;
    const descricaoAssinatura = `Assinatura ${plano.nome} - ${
      body.nomeSalao || salaoData.nome || "SalaoPremium"
    }`;

    if (assinaturaRecorrenteAtual && (billingType !== "CREDIT_CARD" || !assinaturaAutoRenovacao)) {
      await limparAssinaturaRecorrenteCartao({
        supabaseAdmin,
        assinaturaId,
        asaasSubscriptionId: assinaturaRecorrenteAtual,
        idSalao,
        route: "/api/assinatura/criar-cobranca",
        reason:
          billingType !== "CREDIT_CARD"
            ? "billing_type_changed"
            : "auto_renew_disabled",
      });
    }

    if (
      billingType === "CREDIT_CARD" &&
      assinaturaStatus === "ativo" &&
      assinaturaAutoRenovacao &&
      body.creditCard &&
      remoteIp
    ) {
      if (assinaturaRecorrenteAtual) {
        await limparAssinaturaRecorrenteCartao({
          supabaseAdmin,
          assinaturaId,
          asaasSubscriptionId: assinaturaRecorrenteAtual,
          idSalao,
          route: "/api/assinatura/criar-cobranca",
          reason: "reprovision_after_checkout",
        });
      }

      try {
        const recurring = await createAsaasSubscription({
          customerId,
          billingType: "CREDIT_CARD",
          value: valor,
          nextDueDate: vencimentoEm,
          description: descricaoAssinatura,
          externalReference: idSalao,
          creditCard: body.creditCard,
          creditCardHolderInfo: {
            name: body.responsavelNome.trim(),
            email: body.responsavelEmail.trim().toLowerCase(),
            cpfCnpj:
              body.responsavelCpfCnpj || salaoData.cpf_cnpj || undefined,
            postalCode: body.cep || salaoData.cep || undefined,
            addressNumber: body.numero || salaoData.numero || undefined,
            phone: body.responsavelTelefone || salaoData.telefone || undefined,
          },
          remoteIp,
        });

        const subscriptionId = String(recurring.id || "").trim();

        if (subscriptionId) {
          await supabaseAdmin
            .from("assinaturas")
            .update({
              asaas_subscription_id: subscriptionId,
              asaas_subscription_status:
                String(recurring.status || "").trim() || "ACTIVE",
            })
            .eq("id", assinaturaId)
            .eq("id_salao", idSalao);
        }
      } catch (error) {
        await captureSystemError({
          module: "assinatura",
          action: "provisionar_assinatura_recorrente_cartao",
          origin: "integration",
          idSalao,
          route: "/api/assinatura/criar-cobranca",
          entity: "assinatura",
          entityId: assinaturaId,
          error,
          details: {
            billingType,
            plano: plano.codigo,
            paymentId,
          },
          incidentKey: `assinatura_recorrente_provision:${assinaturaId}`,
          incidentTitle:
            "Falha ao provisionar recorrencia do cartao apos checkout",
          suggestedAction:
            "Desativar e reativar a renovacao automatica para reprovisionar a assinatura recorrente no Asaas.",
          automationAvailable: false,
        });
      }
    }

    const checkoutResponse = {
      ok: true,
      customerId,
      paymentId,
      valor,
      plano: plano.codigo,
      billingType,
      status: String(payment.status || "PENDING"),
      qrCodeBase64,
      pixCopiaCola,
      vencimento: dueDate,
      invoiceUrl: String(payment.invoiceUrl || "").trim() || null,
      bankSlipUrl: String(payment.bankSlipUrl || "").trim() || null,
    } satisfies CheckoutResponsePayload;

    await marcarCheckoutConcluido({
      supabaseAdmin,
      checkoutLockId,
      idCobranca: cobrancaInserida.id,
      paymentId,
      response: checkoutResponse,
    });

    await captureSystemEvent({
      module: "assinatura",
      eventType: "action_succeeded",
      severity: "info",
      message: "Checkout de assinatura concluido com sucesso.",
      action: "criar_cobranca",
      origin: "api",
      idSalao,
      route: "/api/assinatura/criar-cobranca",
      entity: "assinatura_cobranca",
      entityId: cobrancaInserida.id,
      responseMs: Date.now() - startedAt,
      success: true,
      details: {
        billingType,
        plano: plano.codigo,
        paymentId,
        pagamentoConfirmado,
        reused: false,
      },
      createIncident: false,
    });
    await upsertSystemHealthCheck({
      key: "checkout_assinatura",
      name: "Checkout de assinatura",
      status: "ok",
      score: 96,
      details: {
        billingType,
        plano: plano.codigo,
        pagamentoConfirmado,
        checkedAt: new Date().toISOString(),
      },
    });
    await registrarAcaoAutomaticaSistema({
      type: "checkout_assinatura",
      reference: cobrancaInserida.id,
      executed: true,
      success: true,
      log: "Checkout de assinatura concluido com sucesso.",
      details: {
        idSalao,
        billingType,
        plano: plano.codigo,
        paymentId,
      },
    });

    return responseJson(checkoutResponse);
  } catch (error: unknown) {
    if (supabaseAdmin && checkoutLockId) {
      await marcarCheckoutFalho({
        supabaseAdmin,
        checkoutLockId,
        paymentId: checkoutPaymentId,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Erro interno ao criar cobranca.",
      });
    }

    await captureSystemError({
      module: "assinatura",
      action: "criar_cobranca",
      origin: "api",
      idSalao: monitoredBody?.idSalao || null,
      route: "/api/assinatura/criar-cobranca",
      entity: "assinatura_checkout",
      entityId: checkoutLockId,
      error,
      responseMs: Date.now() - startedAt,
      details: {
        billingType: monitoredBody?.billingType || null,
        plano: monitoredBody?.plano || null,
        paymentId: checkoutPaymentId,
      },
      incidentKey: `assinatura_checkout:${monitoredBody?.idSalao || "unknown"}`,
      incidentTitle: "Falha no checkout de assinatura",
      suggestedAction: "Revisar validacoes, integracao Asaas e vinculos locais da cobranca.",
      automationAvailable: false,
    });
    await upsertSystemHealthCheck({
      key: "checkout_assinatura",
      name: "Checkout de assinatura",
      status: "critical",
      score: 42,
      details: {
        billingType: monitoredBody?.billingType || null,
        plano: monitoredBody?.plano || null,
        erro:
          error instanceof Error
            ? error.message
            : "Erro interno ao criar cobranca.",
      },
    });
    await registrarAcaoAutomaticaSistema({
      type: "checkout_assinatura",
      reference: checkoutLockId || checkoutPaymentId || monitoredBody?.idSalao || null,
      executed: true,
      success: false,
      log:
        error instanceof Error
          ? error.message
          : "Erro interno ao criar cobranca.",
      details: {
        idSalao: monitoredBody?.idSalao || null,
        billingType: monitoredBody?.billingType || null,
        plano: monitoredBody?.plano || null,
        paymentId: checkoutPaymentId,
      },
    });

    if (error instanceof AssinaturaCheckoutServiceError) {
      return responseJson(
        { error: error.message },
        { status: error.status }
      );
    }

    return responseJson(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao criar cobrança.",
      },
      { status: 500 }
    );
  }
}


