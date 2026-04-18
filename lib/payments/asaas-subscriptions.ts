import {
  captureSystemError,
  upsertSystemHealthCheck,
} from "@/lib/monitoring/server";
import {
  AsaasBillingType,
  AsaasSubscription,
  AsaasSubscriptionCycle,
} from "@/types/asaas";

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
  cpfCnpj?: string;
  postalCode?: string;
  addressNumber?: string;
  addressComplement?: string;
  phone?: string;
  mobilePhone?: string;
};

type CreateAsaasSubscriptionInput = {
  customerId: string;
  billingType: AsaasBillingType;
  value: number;
  nextDueDate: string;
  cycle?: AsaasSubscriptionCycle;
  description: string;
  externalReference?: string;
  creditCard?: CreditCardInput;
  creditCardHolderInfo?: CreditCardHolderInfoInput;
  creditCardToken?: string;
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
      action: "parse_subscription_response",
      origin: "integration",
      error: new Error("Resposta invalida recebida do Asaas."),
      details: {
        bodyPreview: text.slice(0, 500),
      },
      incidentKey: "asaas:subscription:invalid_response",
      incidentTitle: "Resposta invalida do Asaas",
      suggestedAction:
        "Validar endpoint, credenciais e payload retornado pelo provedor.",
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
    console.error("Erro Asaas assinatura:", data);
    const message =
      data?.errors?.[0]?.description ||
      data?.message ||
      "Erro ao comunicar com o Asaas.";

    await captureSystemError({
      module: "asaas",
      action: "subscription_request_failed",
      origin: "integration",
      error: new Error(message),
      details: {
        path,
        status: response.status,
        method: init?.method || "GET",
        response: data,
      },
      incidentKey: `asaas:subscription:${path}:${response.status}`,
      incidentTitle: "Falha na integracao de assinatura com o Asaas",
      suggestedAction:
        "Validar payload, credenciais e permissao de recorrencia antes de tentar novamente.",
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

export function isAsaasSubscriptionNotFoundError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return /not found|nao encontrada|não encontrada/i.test(message);
}

export async function createAsaasSubscription(
  input: CreateAsaasSubscriptionInput
): Promise<AsaasSubscription> {
  const body: Record<string, unknown> = {
    customer: input.customerId,
    billingType: input.billingType,
    value: input.value,
    nextDueDate: input.nextDueDate,
    cycle: input.cycle || "MONTHLY",
    description: input.description,
    externalReference: input.externalReference,
  };

  if (input.billingType === "CREDIT_CARD") {
    if (!input.remoteIp) {
      throw new Error(
        "IP remoto e obrigatorio para provisionar assinatura recorrente no cartao."
      );
    }

    if (input.creditCardToken) {
      body.creditCardToken = input.creditCardToken;
    } else {
      if (!input.creditCard || !input.creditCardHolderInfo) {
        throw new Error(
          "Cartao tokenizado ou dados completos do cartao sao obrigatorios para a assinatura recorrente."
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
    }

    body.remoteIp = input.remoteIp;
  }

  return asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function removeAsaasSubscription(
  subscriptionId: string
): Promise<void> {
  await asaasFetch<Record<string, unknown>>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: "DELETE",
    }
  );
}
