import { randomUUID } from "node:crypto";
import { addDays, format, isAfter } from "date-fns";
import { headers } from "next/headers";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getDatabaseAdmin } from "@/lib/db/admin";
import {
  buscarQrCodePix,
  criarCobranca as criarCobrancaAsaas,
  criarOuBuscarCliente,
} from "@/lib/payments/pix-provider";
import {
  createAsaasSubscription,
  isAsaasSubscriptionNotFoundError,
  removeAsaasSubscription,
} from "@/lib/payments/asaas-subscriptions";
import type { Json } from "@/types/database.generated";

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
  valor_mensal: number | string;
  limite_usuarios: number | null;
  limite_profissionais: number | null;
};

type CheckoutReservaRow = {
  checkout_lock_id: string | null;
  should_process: boolean;
  reason: string;
  existing_cobranca_id: string | null;
};

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
  constructor(message: string, public status = 500) {
    super(message);
    this.name = "AssinaturaCheckoutServiceError";
  }
}

function responseJson<T>(body: T, init?: { status?: number }) {
  return { status: init?.status ?? 200, body };
}

function onlyNumbers(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function getPlanoOrdem(plano?: string | null) {
  if (plano === "basico") return 1;
  if (plano === "pro") return 2;
  if (plano === "premium") return 3;
  return 0;
}

function getTipoMovimento(origem?: string | null, destino?: string | null): TipoMovimentoAssinatura {
  if (!origem || origem === destino) return "renovacao";
  return getPlanoOrdem(destino) > getPlanoOrdem(origem) ? "upgrade" : "downgrade";
}

function isPaid(status?: unknown) {
  return ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(
    String(status || "").toUpperCase()
  );
}

function calcularVencimentoAtual(assinatura?: {
  vencimento_em?: string | null;
  trial_fim_em?: string | null;
}) {
  let base = new Date();
  if (assinatura?.vencimento_em) {
    const current = new Date(`${assinatura.vencimento_em}T23:59:59`);
    if (!Number.isNaN(current.getTime()) && isAfter(current, base)) base = current;
  }
  if (assinatura?.trial_fim_em) {
    const trial = new Date(assinatura.trial_fim_em);
    if (!Number.isNaN(trial.getTime()) && isAfter(trial, base)) base = trial;
  }
  return format(addDays(base, 30), "yyyy-MM-dd");
}

function normalizarIdempotencyKey(value?: string | null) {
  return (
    String(value || "")
      .trim()
      .replace(/[^\w:.-]/g, "")
      .slice(0, 160) || randomUUID()
  );
}

export function getCheckoutIdempotencyKeyFromHeaders(requestHeaders: Headers) {
  return normalizarIdempotencyKey(
    requestHeaders.get("idempotency-key") || requestHeaders.get("x-idempotency-key")
  );
}

async function getRemoteIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    h.get("cf-connecting-ip")?.trim() ||
    "127.0.0.1"
  );
}

async function validarSalaoDoUsuario(idSalao: string) {
  const context = await getPainelUserContext();
  if (context.mfaRequired) {
    throw new AssinaturaCheckoutServiceError("MFA obrigatorio para gerenciar assinatura.", 403);
  }
  if (!context.user || !context.usuario) {
    throw new AssinaturaCheckoutServiceError("Usuário não autenticado.", 401);
  }
  const usuario = context.usuario;
  if (!usuario.id_salao || usuario.id_salao !== idSalao) {
    throw new AssinaturaCheckoutServiceError("Acesso negado para este salão.", 403);
  }
  if (String(usuario.status || "").toLowerCase() !== "ativo") {
    throw new AssinaturaCheckoutServiceError("Usuário inativo.", 403);
  }
  if (String(usuario.nivel || "").toLowerCase() !== "admin") {
    throw new AssinaturaCheckoutServiceError("Somente administrador pode gerenciar assinatura.", 403);
  }
  return context.user;
}

async function reservarCheckout(params: {
  idSalao: string;
  planoCodigo: string;
  billingType: BillingType;
  valor: number;
  idempotencyKey: string;
  payload: Record<string, unknown>;
}) {
  const database = getDatabaseAdmin();
  const { data, error } = await database.rpc("fn_assinatura_reservar_checkout", {
    p_id_salao: params.idSalao,
    p_plano_codigo: params.planoCodigo,
    p_billing_type: params.billingType,
    p_valor: params.valor,
    p_idempotency_key: params.idempotencyKey,
    p_payload: params.payload as Json,
  });
  if (error) throw new AssinaturaCheckoutServiceError(error.message, 500);
  const row = Array.isArray(data) ? data[0] : data;
  return row as CheckoutReservaRow;
}

async function concluirCheckout(lockId: string | null, cobrancaId: string, paymentId: string, response: CheckoutResponsePayload) {
  if (!lockId) return;
  await getDatabaseAdmin().rpc("fn_assinatura_concluir_checkout", {
    p_checkout_lock_id: lockId,
    p_id_cobranca: cobrancaId,
    p_asaas_payment_id: paymentId,
    p_response_json: response,
  });
}

async function falharCheckout(lockId: string | null, paymentId: string | null, message: string) {
  if (!lockId) return;
  await getDatabaseAdmin().rpc("fn_assinatura_falhar_checkout", {
    p_checkout_lock_id: lockId,
    p_erro_texto: message,
    p_asaas_payment_id: paymentId || undefined,
    p_response_json: {},
  });
}

async function checkoutExistente(idSalao: string, idCobranca: string, planoFallback: string, reason: string) {
  const { data, error } = await getDatabaseAdmin()
    .from("assinaturas_cobrancas")
    .select("id, asaas_customer_id, asaas_payment_id, txid, valor, status, forma_pagamento, data_expiracao, invoice_url, bank_slip_url, plano_destino, plano_origem")
    .eq("id", idCobranca)
    .eq("id_salao", idSalao)
    .maybeSingle();
  if (error || !data) throw new AssinaturaCheckoutServiceError(error?.message || "Cobrança não encontrada.", 500);

  const billingType = ["PIX", "BOLETO", "CREDIT_CARD"].includes(String(data.forma_pagamento).toUpperCase())
    ? (String(data.forma_pagamento).toUpperCase() as BillingType)
    : "PIX";
  const paymentId = String(data.asaas_payment_id || data.txid || "");
  let qrCodeBase64: string | null = null;
  let pixCopiaCola: string | null = null;
  if (billingType === "PIX" && paymentId) {
    try {
      const pix = await buscarQrCodePix(paymentId);
      qrCodeBase64 = String(pix.encodedImage || "") || null;
      pixCopiaCola = String(pix.payload || "") || null;
    } catch {}
  }
  return {
    ok: true,
    customerId: String(data.asaas_customer_id || ""),
    paymentId,
    valor: Number(data.valor || 0),
    plano: String(data.plano_destino || data.plano_origem || planoFallback),
    billingType,
    status: String(data.status || "PENDING"),
    qrCodeBase64,
    pixCopiaCola,
    vencimento: String(data.data_expiracao || ""),
    invoiceUrl: data.invoice_url || null,
    bankSlipUrl: data.bank_slip_url || null,
    reused: true,
    reason,
  } satisfies CheckoutResponsePayload;
}

async function criarCobranca(params: { body: BodyInput; idempotencyKey: string }) {
  const database = getDatabaseAdmin();
  let lockId: string | null = null;
  let paymentId: string | null = null;

  try {
    const body = params.body;
    const idSalao = String(body.idSalao || "").trim();
    if (!idSalao) return responseJson({ error: "idSalao é obrigatório." }, { status: 400 });
    const user = await validarSalaoDoUsuario(idSalao);

    const { data: salao, error: salaoError } = await database
      .from("saloes")
      .select("id, nome, email, telefone, cpf_cnpj, cep, numero, complemento")
      .eq("id", idSalao)
      .maybeSingle();
    if (salaoError || !salao?.id) {
      return responseJson({ error: salaoError?.message || "Salão não encontrado." }, { status: salaoError ? 500 : 404 });
    }

    const { data: planoData, error: planoError } = await database
      .from("planos_saas")
      .select("id, codigo, nome, valor_mensal, limite_usuarios, limite_profissionais, ativo")
      .eq("codigo", body.plano)
      .eq("ativo", true)
      .maybeSingle();
    if (planoError || !planoData?.id) {
      return responseJson({ error: planoError?.message || "Plano não encontrado ou inativo." }, { status: planoError ? 500 : 404 });
    }
    const plano = planoData as PlanoSaasRow;
    const valor = Number(plano.valor_mensal || 0);
    if (valor <= 0) return responseJson({ error: "Valor do plano inválido." }, { status: 400 });

    const { data: atual } = await database
      .from("assinaturas")
      .select("id, plano, vencimento_em, trial_fim_em, renovacao_automatica, asaas_subscription_id")
      .eq("id_salao", idSalao)
      .maybeSingle();
    const planoOrigem = String(atual?.plano || "").trim() || null;
    const tipoMovimento = getTipoMovimento(planoOrigem, plano.codigo);

    const reserva = await reservarCheckout({
      idSalao,
      planoCodigo: plano.codigo,
      billingType: body.billingType,
      valor,
      idempotencyKey: params.idempotencyKey,
      payload: { origem: "checkout_manual", id_usuario_auth: user.id, plano_origem: planoOrigem, plano_destino: plano.codigo, tipo_movimento: tipoMovimento },
    });
    lockId = reserva?.checkout_lock_id || null;
    if (reserva && !reserva.should_process) {
      if (reserva.existing_cobranca_id) {
        return responseJson(await checkoutExistente(idSalao, reserva.existing_cobranca_id, plano.codigo, reserva.reason));
      }
      return responseJson({ error: "Já existe uma cobrança sendo gerada para este salão.", reason: reserva.reason }, { status: 409 });
    }

    const customer = await criarOuBuscarCliente({
      nome: body.responsavelNome.trim(),
      email: body.responsavelEmail.trim().toLowerCase(),
      cpfCnpj: onlyNumbers(body.responsavelCpfCnpj || salao.cpf_cnpj),
      telefone: onlyNumbers(body.responsavelTelefone || salao.telefone),
    });
    const customerId = String(customer.id || "").trim();
    if (!customerId) throw new AssinaturaCheckoutServiceError("Customer Asaas inválido.", 502);

    const dueDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
    const remoteIp = body.billingType === "CREDIT_CARD" ? await getRemoteIp() : undefined;
    const payment = await criarCobrancaAsaas({
      customerId,
      billingType: body.billingType,
      valor,
      descricao: `Assinatura ${plano.nome} - ${body.nomeSalao || salao.nome || "SalaoPremium"}`,
      vencimento: dueDate,
      referenciaExterna: idSalao,
      creditCard: body.creditCard,
      creditCardHolderInfo:
        body.billingType === "CREDIT_CARD"
          ? {
              name: body.responsavelNome.trim(),
              email: body.responsavelEmail.trim().toLowerCase(),
              cpfCnpj: onlyNumbers(body.responsavelCpfCnpj || salao.cpf_cnpj),
              postalCode: onlyNumbers(body.cep || salao.cep),
              addressNumber: body.numero || salao.numero || undefined,
              addressComplement: body.complemento || salao.complemento || undefined,
              phone: onlyNumbers(body.responsavelTelefone || salao.telefone),
            }
          : undefined,
      remoteIp,
    });
    paymentId = String(payment.id || "").trim();
    if (!paymentId) throw new AssinaturaCheckoutServiceError("Cobrança Asaas inválida.", 502);

    let qrCodeBase64: string | null = null;
    let pixCopiaCola: string | null = null;
    if (body.billingType === "PIX") {
      const pix = await buscarQrCodePix(paymentId).catch(() => null);
      qrCodeBase64 = pix ? String(pix.encodedImage || "") || null : null;
      pixCopiaCola = pix ? String(pix.payload || "") || null : null;
    }

    const pago = isPaid(payment.status);
    const assinaturaStatus = pago ? "ativo" : "pendente";
    const vencimentoEm = pago ? calcularVencimentoAtual(atual || undefined) : dueDate;
    const pagoEm = pago ? new Date().toISOString() : null;
    const limites = {
      limite_profissionais: Number(plano.limite_profissionais || 0),
      limite_usuarios: Number(plano.limite_usuarios || 0),
    };

    let assinaturaId = String(atual?.id || "");
    const assinaturaPayload = {
      asaas_customer_id: customerId,
      asaas_payment_id: paymentId,
      plano: plano.codigo,
      valor,
      status: assinaturaStatus,
      vencimento_em: vencimentoEm,
      pago_em: pagoEm,
      ...limites,
      trial_ativo: "false",
      trial_inicio_em: null,
      trial_fim_em: null,
      forma_pagamento_atual: body.billingType,
      gateway: "asaas",
      referencia_atual: String(payment.invoiceNumber || "").trim() || paymentId,
    };

    if (assinaturaId) {
      const { error } = await database.from("assinaturas").update(assinaturaPayload).eq("id", assinaturaId).eq("id_salao", idSalao);
      if (error) throw new AssinaturaCheckoutServiceError(error.message, 500);
    } else {
      const { data, error } = await database.from("assinaturas").insert({ id_salao: idSalao, ...assinaturaPayload }).select("id").single();
      if (error || !data?.id) throw new AssinaturaCheckoutServiceError(error?.message || "Erro ao criar assinatura.", 500);
      assinaturaId = String(data.id);
    }

    const { data: cobranca, error: cobrancaError } = await database
      .from("assinaturas_cobrancas")
      .insert({
        id_salao: idSalao,
        id_assinatura: assinaturaId,
        id_plano: plano.id,
        referencia: String(payment.invoiceNumber || "").trim() || paymentId,
        descricao: `Assinatura ${plano.nome} - ${body.nomeSalao || salao.nome || "SalaoPremium"}`,
        valor,
        status: assinaturaStatus,
        forma_pagamento: body.billingType,
        gateway: "asaas",
        txid: body.billingType === "PIX" ? paymentId : null,
        asaas_payment_id: paymentId,
        asaas_customer_id: customerId,
        payment_date: pagoEm,
        confirmed_date: pagoEm,
        invoice_url: payment.invoiceUrl || null,
        bank_slip_url: payment.bankSlipUrl || null,
        data_expiracao: dueDate,
        external_reference: idSalao,
        webhook_event_order: pago ? 100 : 20,
        webhook_processed_at: pago ? pagoEm : null,
        asaas_status: String(payment.status || "PENDING").toUpperCase(),
        idempotency_key: params.idempotencyKey,
        checkout_lock_id: lockId,
        deleted: false,
        plano_origem: planoOrigem,
        plano_destino: plano.codigo,
        tipo_movimento: tipoMovimento,
        gerada_automaticamente: false,
        metadata: { origem: "checkout_manual", plano: plano.codigo, billingType: body.billingType },
      })
      .select("id")
      .single();
    if (cobrancaError || !cobranca?.id) throw new AssinaturaCheckoutServiceError(cobrancaError?.message || "Erro ao registrar cobrança.", 500);

    await database.from("assinaturas").update({ id_cobranca_atual: cobranca.id }).eq("id", assinaturaId).eq("id_salao", idSalao);
    await database.from("saloes").update({ plano: plano.codigo, ...limites, trial_ativo: false, trial_inicio_em: null, trial_fim_em: null, status: assinaturaStatus }).eq("id", idSalao);

    const recurringCurrent = String(atual?.asaas_subscription_id || "").trim();
    if (recurringCurrent && (body.billingType !== "CREDIT_CARD" || !atual?.renovacao_automatica)) {
      try { await removeAsaasSubscription(recurringCurrent); } catch (error) { if (!isAsaasSubscriptionNotFoundError(error)) console.error(error); }
      await database.from("assinaturas").update({ asaas_subscription_id: null, asaas_subscription_status: null }).eq("id", assinaturaId).eq("id_salao", idSalao);
    }

    if (body.billingType === "CREDIT_CARD" && pago && atual?.renovacao_automatica && body.creditCard && remoteIp) {
      try {
        const recurring = await createAsaasSubscription({
          customerId,
          billingType: "CREDIT_CARD",
          value: valor,
          nextDueDate: vencimentoEm,
          description: `Assinatura ${plano.nome} - ${body.nomeSalao || salao.nome || "SalaoPremium"}`,
          externalReference: idSalao,
          creditCard: body.creditCard,
          creditCardHolderInfo: {
            name: body.responsavelNome.trim(),
            email: body.responsavelEmail.trim().toLowerCase(),
            cpfCnpj: body.responsavelCpfCnpj || salao.cpf_cnpj || undefined,
            postalCode: body.cep || salao.cep || undefined,
            addressNumber: body.numero || salao.numero || undefined,
            phone: body.responsavelTelefone || salao.telefone || undefined,
          },
          remoteIp,
        });
        if (recurring.id) {
          await database.from("assinaturas").update({ asaas_subscription_id: recurring.id, asaas_subscription_status: recurring.status || "ACTIVE" }).eq("id", assinaturaId).eq("id_salao", idSalao);
        }
      } catch (error) {
        console.error("Falha ao provisionar recorrencia de cartao:", error);
      }
    }

    const response = {
      ok: true,
      customerId,
      paymentId,
      valor,
      plano: plano.codigo,
      billingType: body.billingType,
      status: String(payment.status || "PENDING"),
      qrCodeBase64,
      pixCopiaCola,
      vencimento: dueDate,
      invoiceUrl: payment.invoiceUrl || null,
      bankSlipUrl: payment.bankSlipUrl || null,
    } satisfies CheckoutResponsePayload;

    await concluirCheckout(lockId, String(cobranca.id), paymentId, response);
    return responseJson(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno ao criar cobrança.";
    await falharCheckout(lockId, paymentId, message).catch(() => undefined);
    if (error instanceof AssinaturaCheckoutServiceError) throw error;
    throw new AssinaturaCheckoutServiceError(message, 500);
  }
}

export function createAssinaturaCheckoutService() {
  return { criarCobranca };
}

export type AssinaturaCheckoutService = ReturnType<typeof createAssinaturaCheckoutService>;
