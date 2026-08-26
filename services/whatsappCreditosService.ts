import "server-only";

import { randomUUID } from "node:crypto";
import { addDays, format } from "date-fns";
import {
  buscarQrCodePix,
  criarCobranca,
  criarOuBuscarCliente,
  type BillingType,
} from "@/lib/payments/pix-provider";
import { getDatabaseAdmin } from "@/lib/db/admin";
import type { Json } from "@/types/database.generated";

export type WhatsAppCreditoStatus =
  | "ativo"
  | "configuracao_pendente"
  | "saldo_baixo"
  | "sem_saldo";

export type WhatsAppTarifaPainel = {
  id: string;
  tipoInterno: string;
  categoriaMeta: string;
  nome: string;
  descricao: string;
  custoBaseMetaCentavos: number;
  precoVendaCentavos: number;
  margemCentavos: number;
  ativo: boolean;
  atualizadoEm: string;
};

export type WhatsAppMovimentacaoPainel = {
  id: string;
  tipo: string;
  valorCentavos: number;
  saldoDepoisCentavos: number;
  categoria: string | null;
  tipoInterno: string | null;
  descricao: string | null;
  criadoEm: string;
};

export type WhatsAppRecargaPainel = {
  id: string;
  status: string;
  valorCentavos: number;
  invoiceUrl: string | null;
  pixCopiaCola: string | null;
  criadoEm: string;
};

export type WhatsAppTemplatePainel = {
  id: string;
  nome: string;
  categoria: string;
  status: "Ativo" | "Pausado";
  conteudo: string;
  criadoEm: string;
};

export type WhatsAppCreditosResumo = {
  saldoCentavos: number;
  totalRecarregadoCentavos: number;
  totalConsumidoCentavos: number;
  alertaSaldoBaixoCentavos: number;
  ultimaRecargaEm: string | null;
  gasto7dCentavos: number;
  gastoMesCentavos: number;
  mensagensMes: number;
  mensagensPagasMes: number;
  mensagensSemCustoMes: number;
};

export type WhatsAppCreditosPainelData = {
  status: WhatsAppCreditoStatus;
  statusLabel: string;
  statusDescription: string;
  integrationConfigured: boolean;
  resumo: WhatsAppCreditosResumo;
  tarifas: WhatsAppTarifaPainel[];
  movimentacoes: WhatsAppMovimentacaoPainel[];
  recargasPendentes: WhatsAppRecargaPainel[];
  templates: WhatsAppTemplatePainel[];
};

export class WhatsAppCreditosServiceError extends Error {
  constructor(
    message: string,
    public status = 500
  ) {
    super(message);
    this.name = "WhatsAppCreditosServiceError";
  }
}

type RawResumo = Partial<Record<keyof WhatsAppCreditosResumo, unknown>>;

type SalaoRow = {
  id: string;
  nome?: string | null;
  responsavel?: string | null;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  cpf_cnpj?: string | null;
};

function cents(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function onlyNumbers(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function moneyFromCents(value: number) {
  return Number((value / 100).toFixed(2));
}

function getIntegrationConfigured() {
  return Boolean(
    process.env.META_WHATSAPP_ACCESS_TOKEN &&
      process.env.META_WHATSAPP_PHONE_NUMBER_ID
  );
}

function buildResumo(raw?: RawResumo | null): WhatsAppCreditosResumo {
  return {
    saldoCentavos: cents(raw?.saldoCentavos),
    totalRecarregadoCentavos: cents(raw?.totalRecarregadoCentavos),
    totalConsumidoCentavos: cents(raw?.totalConsumidoCentavos),
    alertaSaldoBaixoCentavos: cents(raw?.alertaSaldoBaixoCentavos) || 1000,
    ultimaRecargaEm:
      typeof raw?.ultimaRecargaEm === "string" ? raw.ultimaRecargaEm : null,
    gasto7dCentavos: cents(raw?.gasto7dCentavos),
    gastoMesCentavos: cents(raw?.gastoMesCentavos),
    mensagensMes: cents(raw?.mensagensMes),
    mensagensPagasMes: cents(raw?.mensagensPagasMes),
    mensagensSemCustoMes: cents(raw?.mensagensSemCustoMes),
  };
}

function resolveStatus(
  resumo: WhatsAppCreditosResumo,
  integrationConfigured: boolean
) {
  if (!integrationConfigured) {
    return {
      status: "configuracao_pendente" as const,
      statusLabel: "Configuracao pendente",
      statusDescription: "Finalize a conexao Meta para enviar pelo WhatsApp.",
    };
  }

  if (resumo.saldoCentavos <= 0) {
    return {
      status: "sem_saldo" as const,
      statusLabel: "Sem saldo",
      statusDescription: "Adicione creditos antes dos proximos envios.",
    };
  }

  if (resumo.saldoCentavos <= resumo.alertaSaldoBaixoCentavos) {
    return {
      status: "saldo_baixo" as const,
      statusLabel: "Saldo baixo",
      statusDescription: "Recarregue para evitar interrupcoes.",
    };
  }

  return {
    status: "ativo" as const,
    statusLabel: "Ativo",
    statusDescription: "Carteira pronta para envios pagos.",
  };
}

export async function getWhatsappCreditosPainelData(
  idSalao: string
): Promise<WhatsAppCreditosPainelData> {
  const database = getDatabaseAdmin();

  const [
    resumoResult,
    tarifasResult,
    movimentosResult,
    recargasResult,
    templatesResult,
  ] = await Promise.all([
    database.rpc("fn_whatsapp_creditos_resumo", {
      p_id_salao: idSalao,
    }),
    database
      .from("whatsapp_tarifas")
      .select(
        "id, tipo_interno, categoria_meta, nome, descricao, custo_base_meta_centavos, preco_venda_centavos, margem_centavos, ativo, atualizado_em"
      )
      .order("ordem", { ascending: true }),
    database
      .from("whatsapp_creditos_movimentacoes")
      .select(
        "id, tipo, valor_centavos, saldo_depois_centavos, categoria, tipo_interno, descricao, criado_em"
      )
      .eq("id_salao", idSalao)
      .order("criado_em", { ascending: false })
      .limit(30),
    database
      .from("whatsapp_creditos_recargas")
      .select("id, status, valor_centavos, invoice_url, pix_copia_cola, criado_em")
      .eq("id_salao", idSalao)
      .in("status", ["pendente", "expirado"])
      .order("criado_em", { ascending: false })
      .limit(5),
    database
      .from("whatsapp_templates")
      .select("id, nome, categoria, conteudo, ativo, criado_em")
      .order("criado_em", { ascending: false })
      .limit(20),
  ]);

  if (resumoResult.error) {
    throw new WhatsAppCreditosServiceError(
      resumoResult.error.message || "Nao foi possivel carregar resumo WhatsApp."
    );
  }

  const resumo = buildResumo(resumoResult.data as RawResumo | null);
  const statusInfo = resolveStatus(resumo, getIntegrationConfigured());

  return {
    ...statusInfo,
    integrationConfigured: getIntegrationConfigured(),
    resumo,
    tarifas: ((tarifasResult.data || []) as Array<Record<string, unknown>>).map(
      (row) => ({
        id: String(row.id),
        tipoInterno: String(row.tipo_interno || ""),
        categoriaMeta: String(row.categoria_meta || ""),
        nome: String(row.nome || ""),
        descricao: String(row.descricao || ""),
        custoBaseMetaCentavos: cents(row.custo_base_meta_centavos),
        precoVendaCentavos: cents(row.preco_venda_centavos),
        margemCentavos: cents(row.margem_centavos),
        ativo: row.ativo !== false,
        atualizadoEm: String(row.atualizado_em || ""),
      })
    ),
    movimentacoes: ((movimentosResult.data || []) as Array<
      Record<string, unknown>
    >).map((row) => ({
      id: String(row.id),
      tipo: String(row.tipo || ""),
      valorCentavos: cents(row.valor_centavos),
      saldoDepoisCentavos: cents(row.saldo_depois_centavos),
      categoria: row.categoria ? String(row.categoria) : null,
      tipoInterno: row.tipo_interno ? String(row.tipo_interno) : null,
      descricao: row.descricao ? String(row.descricao) : null,
      criadoEm: String(row.criado_em || ""),
    })),
    recargasPendentes: ((recargasResult.data || []) as Array<
      Record<string, unknown>
    >).map((row) => ({
      id: String(row.id),
      status: String(row.status || "pendente"),
      valorCentavos: cents(row.valor_centavos),
      invoiceUrl: row.invoice_url ? String(row.invoice_url) : null,
      pixCopiaCola: row.pix_copia_cola ? String(row.pix_copia_cola) : null,
      criadoEm: String(row.criado_em || ""),
    })),
    templates: ((templatesResult.data || []) as Array<Record<string, unknown>>)
      .map((row) => ({
        id: String(row.id),
        nome: String(row.nome || ""),
        categoria: String(row.categoria || "geral"),
        status: row.ativo === false ? ("Pausado" as const) : ("Ativo" as const),
        conteudo: String(row.conteudo || ""),
        criadoEm: String(row.criado_em || ""),
      }))
      .filter((row) => row.nome),
  };
}

async function carregarSalao(idSalao: string) {
  const database = getDatabaseAdmin();
  const { data, error } = await database
    .from("saloes")
    .select("id, nome, responsavel, email, telefone, whatsapp, cpf_cnpj")
    .eq("id", idSalao)
    .maybeSingle();

  if (error) {
    throw new WhatsAppCreditosServiceError("Erro ao carregar dados do salao.");
  }

  const salao = data as SalaoRow | null;
  if (!salao?.id) {
    throw new WhatsAppCreditosServiceError("Salao nao encontrado.", 404);
  }

  if (!String(salao.email || "").trim()) {
    throw new WhatsAppCreditosServiceError(
      "O salao precisa ter e-mail cadastrado para comprar creditos.",
      400
    );
  }

  return salao;
}

export async function criarWhatsappCreditosCheckout(params: {
  idSalao: string;
  valorCentavos: number;
  billingType?: BillingType;
  idempotencyKey?: string | null;
}) {
  const valorCentavos = Math.trunc(Number(params.valorCentavos || 0));
  const billingType = params.billingType || "PIX";
  const idempotencyKey =
    String(params.idempotencyKey || "").trim() ||
    `${params.idSalao}:${valorCentavos}:${billingType}`;

  if (valorCentavos < 1000) {
    throw new WhatsAppCreditosServiceError("O valor minimo de recarga e R$ 10,00.", 400);
  }

  if (valorCentavos > 200000) {
    throw new WhatsAppCreditosServiceError("O valor maximo por recarga e R$ 2.000,00.", 400);
  }

  const database = getDatabaseAdmin();

  const { data: existente, error: existenteError } = await database
    .from("whatsapp_creditos_recargas")
    .select(
      "id, status, valor_centavos, billing_type, asaas_payment_id, invoice_url, bank_slip_url, pix_copia_cola, qr_code_base64"
    )
    .eq("id_salao", params.idSalao)
    .eq("idempotency_key", idempotencyKey)
    .in("status", ["pendente", "expirado"])
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existenteError) {
    throw new WhatsAppCreditosServiceError("Erro ao verificar recarga pendente.");
  }

  if (existente?.id && existente.asaas_payment_id) {
    return {
      ok: true as const,
      reused: true,
      checkoutId: String(existente.id),
      paymentId: String(existente.asaas_payment_id),
      billingType: String(existente.billing_type || "PIX") as BillingType,
      valorCentavos: cents(existente.valor_centavos),
      invoiceUrl: existente.invoice_url ? String(existente.invoice_url) : null,
      bankSlipUrl: existente.bank_slip_url ? String(existente.bank_slip_url) : null,
      pixCopiaCola: existente.pix_copia_cola
        ? String(existente.pix_copia_cola)
        : null,
      qrCodeBase64: existente.qr_code_base64
        ? String(existente.qr_code_base64)
        : null,
    };
  }

  const salao = await carregarSalao(params.idSalao);
  const clienteAsaas = await criarOuBuscarCliente({
    nome: String(salao.responsavel || salao.nome || "SalaoPremium").trim(),
    email: String(salao.email || "").trim(),
    cpfCnpj: onlyNumbers(salao.cpf_cnpj),
    telefone: onlyNumbers(salao.whatsapp || salao.telefone),
  });

  const recargaId = randomUUID();
  const externalReference = `whatsapp_credit_topup:${recargaId}`;

  const { error: insertError } = await database
    .from("whatsapp_creditos_recargas")
    .insert({
      id: recargaId,
      id_salao: params.idSalao,
      status: "pendente",
      valor_centavos: valorCentavos,
      billing_type: billingType,
      idempotency_key: idempotencyKey,
      external_reference: externalReference,
      asaas_customer_id: String(clienteAsaas.id || "").trim() || null,
    });

  if (insertError) {
    throw new WhatsAppCreditosServiceError(
      insertError.message || "Erro ao criar recarga WhatsApp."
    );
  }

  const cobranca = await criarCobranca({
    customerId: String(clienteAsaas.id || "").trim(),
    billingType,
    valor: moneyFromCents(valorCentavos),
    descricao: "Recarga de creditos WhatsApp - SalaoPremium",
    vencimento: format(addDays(new Date(), 2), "yyyy-MM-dd"),
    referenciaExterna: externalReference,
  });

  const paymentId = String(cobranca.id || "").trim();
  if (!paymentId) {
    throw new WhatsAppCreditosServiceError(
      "O provedor nao retornou um pagamento valido para a recarga.",
      502
    );
  }

  let qrCodeBase64: string | null = null;
  let pixCopiaCola: string | null = null;

  if (billingType === "PIX") {
    try {
      const pix = await buscarQrCodePix(paymentId);
      qrCodeBase64 = String(pix.encodedImage || "").trim() || null;
      pixCopiaCola = String(pix.payload || "").trim() || null;
    } catch {
      qrCodeBase64 = null;
      pixCopiaCola = null;
    }
  }

  const { error: updateError } = await database
    .from("whatsapp_creditos_recargas")
    .update({
      asaas_payment_id: paymentId,
      invoice_url: String(cobranca.invoiceUrl || "").trim() || null,
      bank_slip_url: String(cobranca.bankSlipUrl || "").trim() || null,
      pix_copia_cola: pixCopiaCola,
      qr_code_base64: qrCodeBase64,
      response_json: cobranca as Json,
    })
    .eq("id", recargaId);

  if (updateError) {
    throw new WhatsAppCreditosServiceError(
      updateError.message || "Erro ao atualizar recarga WhatsApp."
    );
  }

  return {
    ok: true as const,
    reused: false,
    checkoutId: recargaId,
    paymentId,
    billingType,
    valorCentavos,
    invoiceUrl: String(cobranca.invoiceUrl || "").trim() || null,
    bankSlipUrl: String(cobranca.bankSlipUrl || "").trim() || null,
    pixCopiaCola,
    qrCodeBase64,
  };
}
