import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { addDays, format, isAfter } from "date-fns";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD";
type TipoMovimentoAssinatura = "upgrade" | "downgrade" | "renovacao";

type CardPayload = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

type BodyInput = {
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

type CheckoutResponsePayload = {
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

class HttpError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

async function getSupabaseServer() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.");
  }

  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada.");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
    throw new HttpError("Erro ao validar usuário autenticado.", 401);
  }

  if (!user) {
    throw new HttpError("Usuário não autenticado.", 401);
  }

  const { data: usuario, error: usuarioError } = await supabaseAdmin
    .from("usuarios")
    .select("id_salao, status, nivel")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError) {
    throw new HttpError("Erro ao validar vínculo do usuário com o salão.", 500);
  }

  if (!usuario?.id_salao) {
    throw new HttpError("Usuário sem salão vinculado.", 403);
  }

  if (String(usuario.status || "").toLowerCase() !== "ativo") {
    throw new HttpError("Usuário inativo.", 403);
  }

  if (usuario.id_salao !== idSalao) {
    throw new HttpError("Acesso negado para este salão.", 403);
  }

  if (String(usuario.nivel || "").toLowerCase() !== "admin") {
    throw new HttpError("Somente administrador pode gerenciar assinatura.", 403);
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

function getCheckoutIdempotencyKey(req: Request) {
  return normalizarIdempotencyKey(
    req.headers.get("idempotency-key") ||
      req.headers.get("x-idempotency-key")
  );
}

function isBillingType(value?: string | null): value is BillingType {
  return value === "PIX" || value === "BOLETO" || value === "CREDIT_CARD";
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
      p_payload: params.payload,
    }
  );

  if (error) {
    throw new HttpError(
      error.message || "Erro ao reservar checkout da assinatura.",
      500
    );
  }

  const reserva = Array.isArray(data)
    ? (data[0] as CheckoutReservaRow | undefined)
    : (data as CheckoutReservaRow | null);

  if (!reserva) {
    throw new HttpError("Erro ao reservar checkout da assinatura.", 500);
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
      p_asaas_payment_id: params.paymentId || null,
      p_response_json: params.response || {},
    }
  );

  if (error) {
    console.error("Erro ao marcar checkout como falho:", error);
  }
}

async function montarCheckoutExistente(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
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
    .maybeSingle();

  if (error || !data) {
    throw new HttpError(
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

export async function POST(req: Request) {
  let supabaseAdmin: ReturnType<typeof getSupabaseAdmin> | null = null;
  let checkoutLockId: string | null = null;
  let checkoutPaymentId: string | null = null;

  try {
    supabaseAdmin = getSupabaseAdmin();
    const body = (await req.json()) as BodyInput;
    const idempotencyKey = getCheckoutIdempotencyKey(req);

    const idSalao = String(body.idSalao || "").trim();
    const planoCodigo = String(body.plano || "").trim().toLowerCase() as
      | "basico"
      | "pro"
      | "premium";
    const billingType = body.billingType;

    if (!idSalao) {
      return NextResponse.json(
        { error: "idSalao é obrigatório." },
        { status: 400 }
      );
    }

    const acesso = await validarSalaoDoUsuario(idSalao);

    if (!["basico", "pro", "premium"].includes(planoCodigo)) {
      return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
    }

    if (!["PIX", "BOLETO", "CREDIT_CARD"].includes(String(billingType))) {
      return NextResponse.json(
        { error: "Forma de pagamento inválida." },
        { status: 400 }
      );
    }

    if (!body.responsavelNome?.trim()) {
      return NextResponse.json(
        { error: "Nome do responsável é obrigatório." },
        { status: 400 }
      );
    }

    if (!isEmailValido(body.responsavelEmail)) {
      return NextResponse.json(
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
        return NextResponse.json(
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
      return NextResponse.json(
        { error: salaoError.message || "Erro ao consultar salão." },
        { status: 500 }
      );
    }

    if (!salaoData?.id) {
      return NextResponse.json(
        { error: "Salão não encontrado." },
        { status: 404 }
      );
    }

    const { data: assinaturaExistenteFull, error: assinaturaExistenteFullError } =
      await supabaseAdmin
        .from("assinaturas")
        .select("id, plano, vencimento_em, trial_fim_em")
        .eq("id_salao", idSalao)
        .maybeSingle();

    if (assinaturaExistenteFullError) {
      return NextResponse.json(
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
      return NextResponse.json(
        { error: planoError.message || "Erro ao consultar plano." },
        { status: 500 }
      );
    }

    const plano = planoData as PlanoSaasRow | null;

    if (!plano?.id) {
      return NextResponse.json(
        { error: "Plano não encontrado ou inativo." },
        { status: 404 }
      );
    }

    const valor = Number(plano.valor_mensal || 0);
    const limiteUsuarios = Number(plano.limite_usuarios || 0);
    const limiteProfissionais = Number(plano.limite_profissionais || 0);

    if (valor <= 0) {
      return NextResponse.json(
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
          idCobranca: reservaCheckout.existing_cobranca_id,
          planoFallback: planoCodigo,
          reason: reservaCheckout.reason,
        });

        return NextResponse.json(checkoutExistente);
      }

      return NextResponse.json(
        {
          error:
            "JÃ¡ existe uma cobranÃ§a sendo gerada para este salÃ£o. Aguarde alguns segundos e tente novamente.",
          reason: reservaCheckout.reason,
        },
        { status: 409 }
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
      throw new HttpError(
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
      throw new HttpError(
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
      }
    }

    const pagamentoConfirmado = isAsaasPaymentPaid(payment.status);
    const assinaturaStatus = pagamentoConfirmado ? "ativo" : "pendente";
    const vencimentoEm = pagamentoConfirmado
      ? calcularVencimentoAssinaturaPaga(assinaturaExistenteFull || undefined)
      : dueDate;
    const pagoEm = pagamentoConfirmado ? new Date().toISOString() : null;
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
      throw new HttpError(
        assinaturaBuscaError.message || "Erro ao consultar assinatura.",
        500
      );
    }

    let assinaturaId = "";

    if (assinaturaExistente?.id) {
      assinaturaId = assinaturaExistente.id;

      const { error: updateAssinaturaError } = await supabaseAdmin
        .from("assinaturas")
        .update({
          asaas_customer_id: customerId,
          asaas_payment_id: paymentId,
          plano: plano.codigo,
          valor,
          status: assinaturaStatus,
          vencimento_em: vencimentoEm,
          pago_em: pagoEm,
          limite_profissionais: limiteProfissionais,
          limite_usuarios: limiteUsuarios,
          trial_ativo: false,
          trial_inicio_em: null,
          trial_fim_em: null,
          forma_pagamento_atual: billingType,
          id_cobranca_atual: null,
          gateway: "asaas",
          referencia_atual:
            String(payment.invoiceNumber || "").trim() || paymentId,
        })
        .eq("id", assinaturaId);

      if (updateAssinaturaError) {
        throw new HttpError(
          updateAssinaturaError.message || "Erro ao atualizar assinatura.",
          500
        );
      }
    } else {
      const { data: novaAssinatura, error: insertAssinaturaError } =
        await supabaseAdmin
          .from("assinaturas")
          .insert({
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
            trial_ativo: false,
            trial_inicio_em: null,
            trial_fim_em: null,
            forma_pagamento_atual: billingType,
            id_cobranca_atual: null,
            gateway: "asaas",
            referencia_atual:
              String(payment.invoiceNumber || "").trim() || paymentId,
          })
          .select("id")
          .single();

      if (insertAssinaturaError || !novaAssinatura?.id) {
        throw new HttpError(
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
      throw new HttpError(
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
      .eq("id", assinaturaId);

    if (updateAssinaturaComCobrancaError) {
      throw new HttpError(
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
      throw new HttpError(
        salaoUpdateError.message || "Erro ao atualizar salao.",
        500
      );
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

    return NextResponse.json(checkoutResponse);
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

    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
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
