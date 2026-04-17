import {
  captureSystemError,
  upsertSystemHealthCheck,
} from "@/lib/monitoring/server";
import {
  AsaasCustomer,
  AsaasPayment,
  AsaasPixQrCode,
} from "@/types/asaas";

export type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD";

type CriarOuBuscarClienteInput = {
  nome: string;
  email: string;
  cpfCnpj?: string;
  telefone?: string;
};

type CreditCardInput = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

type CreditCardHolderInfoInput = {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode?: string;
  addressNumber?: string;
  addressComplement?: string;
  phone?: string;
  mobilePhone?: string;
};

type CriarCobrancaInput = {
  customerId: string;
  billingType: BillingType;
  valor: number;
  descricao: string;
  vencimento: string;
  referenciaExterna?: string;
  creditCard?: CreditCardInput;
  creditCardHolderInfo?: CreditCardHolderInfoInput;
  remoteIp?: string;
};

function getAsaasConfig() {
  const baseUrl = process.env.ASAAS_BASE_URL;
  const apiKey = process.env.ASAAS_API_KEY;

  if (!baseUrl) {
    throw new Error("ASAAS_BASE_URL nao configurado.");
  }

  if (!apiKey) {
    throw new Error("ASAAS_API_KEY nao configurado.");
  }

  return { baseUrl, apiKey };
}

async function registrarSaudeAsaas(params: {
  status: "ok" | "warning" | "critical";
  score: number;
  details: Record<string, unknown>;
}) {
  await upsertSystemHealthCheck({
    key: "integracao_asaas",
    name: "Integracao Asaas",
    status: params.status,
    score: params.score,
    details: params.details,
  });
}

async function parseAsaasResponse(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    console.error("Resposta invalida do Asaas:", text);
    await captureSystemError({
      module: "asaas",
      action: "parse_response",
      origin: "integration",
      error: new Error("Resposta invalida recebida do Asaas."),
      details: {
        bodyPreview: text.slice(0, 500),
      },
      incidentKey: "asaas:invalid_response",
      incidentTitle: "Resposta invalida do Asaas",
      suggestedAction: "Validar endpoint, credenciais e payload retornado pelo provedor.",
      automationAvailable: false,
    });
    await registrarSaudeAsaas({
      status: "warning",
      score: 70,
      details: {
        motivo: "Resposta invalida recebida do provedor.",
      },
    });
    throw new Error("Resposta invalida recebida do Asaas.");
  }
}

async function asaasFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl, apiKey } = getAsaasConfig();

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const data = await parseAsaasResponse(response);

  if (!response.ok) {
    console.error("Erro Asaas:", data);
    const message =
      data?.errors?.[0]?.description ||
      data?.message ||
      "Erro ao comunicar com o Asaas.";

    await captureSystemError({
      module: "asaas",
      action: "request_failed",
      origin: "integration",
      error: new Error(message),
      details: {
        path,
        status: response.status,
        method: init?.method || "GET",
        response: data,
      },
      incidentKey: `asaas:${path}:${response.status}`,
      incidentTitle: "Falha na integracao com o Asaas",
      suggestedAction: "Reprocessar a acao apos validar disponibilidade e payload do provedor.",
      automationAvailable: false,
    });
    await registrarSaudeAsaas({
      status: response.status >= 500 ? "critical" : "warning",
      score: response.status >= 500 ? 40 : 68,
      details: {
        path,
        status: response.status,
        message,
      },
    });

    throw new Error(message);
  }

  await registrarSaudeAsaas({
    status: "ok",
    score: 96,
    details: {
      path,
      method: init?.method || "GET",
      checkedAt: new Date().toISOString(),
    },
  });

  return data as T;
}

function onlyNumbers(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

export async function buscarClientePorEmail(
  email: string
): Promise<AsaasCustomer | null> {
  const result = await asaasFetch<{ data: AsaasCustomer[] }>(
    `/customers?email=${encodeURIComponent(email)}`
  );

  return result.data?.[0] || null;
}

export async function criarCliente(
  input: CriarOuBuscarClienteInput
): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.nome,
      email: input.email,
      cpfCnpj: input.cpfCnpj || undefined,
      mobilePhone: input.telefone || undefined,
    }),
  });
}

export async function criarOuBuscarCliente(
  input: CriarOuBuscarClienteInput
): Promise<AsaasCustomer> {
  const existente = await buscarClientePorEmail(input.email);
  if (existente) return existente;
  return criarCliente(input);
}

export async function criarCobranca(
  input: CriarCobrancaInput
): Promise<AsaasPayment> {
  const body: Record<string, unknown> = {
    customer: input.customerId,
    billingType: input.billingType,
    value: input.valor,
    dueDate: input.vencimento,
    description: input.descricao,
    externalReference: input.referenciaExterna,
  };

  if (input.billingType === "BOLETO") {
    body.daysAfterDueDateToRegistrationCancellation = 1;
  }

  if (input.billingType === "CREDIT_CARD") {
    if (!input.creditCard || !input.creditCardHolderInfo || !input.remoteIp) {
      throw new Error(
        "Dados do cartao, titular e IP remoto sao obrigatorios para cobranca em cartao."
      );
    }

    body.creditCard = {
      holderName: input.creditCard.holderName,
      number: onlyNumbers(input.creditCard.number),
      expiryMonth: onlyNumbers(input.creditCard.expiryMonth),
      expiryYear: onlyNumbers(input.creditCard.expiryYear),
      ccv: onlyNumbers(input.creditCard.ccv),
    };

    body.creditCardHolderInfo = {
      name: input.creditCardHolderInfo.name,
      email: input.creditCardHolderInfo.email,
      cpfCnpj: onlyNumbers(input.creditCardHolderInfo.cpfCnpj),
      postalCode: onlyNumbers(input.creditCardHolderInfo.postalCode),
      addressNumber: input.creditCardHolderInfo.addressNumber,
      addressComplement: input.creditCardHolderInfo.addressComplement,
      phone: onlyNumbers(input.creditCardHolderInfo.phone),
      mobilePhone: onlyNumbers(input.creditCardHolderInfo.mobilePhone),
    };

    body.remoteIp = input.remoteIp;
  }

  return asaasFetch<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function buscarQrCodePix(
  paymentId: string
): Promise<AsaasPixQrCode> {
  return asaasFetch<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
}

export async function buscarCobranca(paymentId: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}`);
}
