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
    throw new Error("ASAAS_BASE_URL não configurado.");
  }

  if (!apiKey) {
    throw new Error("ASAAS_API_KEY não configurado.");
  }

  return { baseUrl, apiKey };
}

async function parseAsaasResponse(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    console.error("Resposta inválida do Asaas:", text);
    throw new Error("Resposta inválida recebida do Asaas.");
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
    throw new Error(
      data?.errors?.[0]?.description ||
        data?.message ||
        "Erro ao comunicar com o Asaas."
    );
  }

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
        "Dados do cartão, titular e IP remoto são obrigatórios para cobrança em cartão."
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