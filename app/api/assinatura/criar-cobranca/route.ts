import { NextResponse } from "next/server";
import { addDays, format } from "date-fns";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD";

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
    .select("id_salao, status")
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
  return process.env.ASAAS_BASE_URL || "https://sandbox.asaas.com/api/v3";
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

    const buscaPorCpfJson = await buscaPorCpf.json();

    if (!buscaPorCpf.ok) {
      throw new Error(
        buscaPorCpfJson?.errors?.[0]?.description ||
          "Erro ao buscar customer no Asaas."
      );
    }

    if (
      Array.isArray(buscaPorCpfJson?.data) &&
      buscaPorCpfJson.data.length > 0
    ) {
      return buscaPorCpfJson.data[0];
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

    const buscaPorEmailJson = await buscaPorEmail.json();

    if (!buscaPorEmail.ok) {
      throw new Error(
        buscaPorEmailJson?.errors?.[0]?.description ||
          "Erro ao buscar customer por e-mail no Asaas."
      );
    }

    if (
      Array.isArray(buscaPorEmailJson?.data) &&
      buscaPorEmailJson.data.length > 0
    ) {
      return buscaPorEmailJson.data[0];
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

  const createJson = await createRes.json();

  if (!createRes.ok) {
    throw new Error(
      createJson?.errors?.[0]?.description ||
        "Erro ao criar customer no Asaas."
    );
  }

  return createJson;
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

  const json = await response.json();

  if (!response.ok) {
    throw new Error(
      json?.errors?.[0]?.description || "Erro ao criar cobrança no Asaas."
    );
  }

  return json;
}

async function buscarPayloadPix(paymentId: string) {
  const baseUrl = getAsaasBaseUrl();
  const headers = getAsaasHeaders();

  const response = await fetch(`${baseUrl}/payments/${paymentId}/pixQrCode`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(
      json?.errors?.[0]?.description || "Erro ao buscar QR Code PIX."
    );
  }

  return json;
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = (await req.json()) as BodyInput;

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

    await validarSalaoDoUsuario(idSalao);

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

    const customer = await buscarOuCriarCustomerAsaas({
      nome: body.responsavelNome.trim(),
      email: body.responsavelEmail.trim().toLowerCase(),
      cpfCnpj: body.responsavelCpfCnpj || salaoData.cpf_cnpj || undefined,
      telefone: body.responsavelTelefone || salaoData.telefone || undefined,
      cep: body.cep || salaoData.cep || undefined,
      numero: body.numero || salaoData.numero || undefined,
      complemento: body.complemento || salaoData.complemento || undefined,
    });

    const dueDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
    const remoteIp =
      billingType === "CREDIT_CARD" ? await getRemoteIp() : undefined;

    const payment = await criarCobrancaAsaas({
      customer: customer.id,
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

    let qrCodeBase64: string | null = null;
    let pixCopiaCola: string | null = null;

    if (billingType === "PIX") {
      const pixPayload = await buscarPayloadPix(payment.id);
      qrCodeBase64 = pixPayload?.encodedImage || null;
      pixCopiaCola = pixPayload?.payload || null;
    }

    const assinaturaStatus = "pendente";
    const vencimentoEm = dueDate;
    const pagoEm = null;

    const { data: assinaturaExistente, error: assinaturaBuscaError } =
      await supabaseAdmin
        .from("assinaturas")
        .select("id")
        .eq("id_salao", idSalao)
        .maybeSingle();

    if (assinaturaBuscaError) {
      return NextResponse.json(
        {
          error:
            assinaturaBuscaError.message || "Erro ao consultar assinatura.",
        },
        { status: 500 }
      );
    }

    let assinaturaId = "";

    if (assinaturaExistente?.id) {
      assinaturaId = assinaturaExistente.id;

      const { error: updateAssinaturaError } = await supabaseAdmin
        .from("assinaturas")
        .update({
          asaas_customer_id: customer.id,
          asaas_payment_id: payment.id,
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
          referencia_atual: payment.invoiceNumber || payment.id,
        })
        .eq("id", assinaturaId);

      if (updateAssinaturaError) {
        return NextResponse.json(
          {
            error:
              updateAssinaturaError.message || "Erro ao atualizar assinatura.",
          },
          { status: 500 }
        );
      }
    } else {
      const { data: novaAssinatura, error: insertAssinaturaError } =
        await supabaseAdmin
          .from("assinaturas")
          .insert({
            id_salao: idSalao,
            asaas_customer_id: customer.id,
            asaas_payment_id: payment.id,
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
            referencia_atual: payment.invoiceNumber || payment.id,
          })
          .select("id")
          .single();

      if (insertAssinaturaError || !novaAssinatura?.id) {
        return NextResponse.json(
          {
            error:
              insertAssinaturaError?.message || "Erro ao criar assinatura.",
          },
          { status: 500 }
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
          referencia: payment.invoiceNumber || payment.id,
          descricao: `Assinatura ${plano.nome} - ${
            body.nomeSalao || salaoData.nome || "SalaoPremium"
          }`,
          valor,
          status: assinaturaStatus,
          forma_pagamento: billingType,
          gateway: "asaas",
          txid: billingType === "PIX" ? payment.id : null,
          asaas_payment_id: payment.id,
          asaas_customer_id: customer.id,
          payment_date: null,
          confirmed_date: null,
          invoice_url: payment.invoiceUrl || null,
          bank_slip_url: payment.bankSlipUrl || null,
          data_expiracao: dueDate,
          external_reference: idSalao,
          webhook_payload: null,
          webhook_last_event: null,
          deleted: false,
          metadata: {
            origem: "checkout_manual",
            plano: plano.codigo,
            billingType,
          },
        })
        .select("id")
        .single();

    if (cobrancaInsertError || !cobrancaInserida?.id) {
      return NextResponse.json(
        {
          error:
            cobrancaInsertError?.message ||
            "Erro ao criar registro da cobrança.",
        },
        { status: 500 }
      );
    }

    const { error: updateAssinaturaComCobrancaError } = await supabaseAdmin
      .from("assinaturas")
      .update({
        id_cobranca_atual: cobrancaInserida.id,
      })
      .eq("id", assinaturaId);

    if (updateAssinaturaComCobrancaError) {
      return NextResponse.json(
        {
          error:
            updateAssinaturaComCobrancaError.message ||
            "Erro ao vincular cobrança na assinatura.",
        },
        { status: 500 }
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
        status: "pendente",
      })
      .eq("id", idSalao);

    if (salaoUpdateError) {
      return NextResponse.json(
        {
          error: salaoUpdateError.message || "Erro ao atualizar salão.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      customerId: customer.id,
      paymentId: payment.id,
      valor,
      plano: plano.codigo,
      billingType,
      status: payment.status || "PENDING",
      qrCodeBase64,
      pixCopiaCola,
      vencimento: dueDate,
      invoiceUrl: payment.invoiceUrl || null,
      bankSlipUrl: payment.bankSlipUrl || null,
    });
  } catch (error: unknown) {
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