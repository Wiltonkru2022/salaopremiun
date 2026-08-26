import { randomUUID } from "node:crypto";
import { loadLocalEnv, requireEnv } from "../lib/load-env.mjs";
import {
  assert,
  createCookieJar,
  normalizeBaseUrl,
  readPayload,
  requestWithJar,
} from "../lib/http-e2e.mjs";

loadLocalEnv();

const baseUrl = normalizeBaseUrl(process.env.E2E_BASE_URL);
const allowMutation = process.env.E2E_ALLOW_MUTATION === "1";
const runAsaasCheckout = process.env.E2E_RUN_ASAAS_CHECKOUT === "1";
const runWebhook = process.env.E2E_RUN_ASAAS_WEBHOOK === "1";

async function expectApiNoRedirect() {
  const response = await fetch(`${baseUrl}/api/assinatura/iniciar-trial`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
    redirect: "manual",
  });

  assert(response.status < 300 || response.status >= 400, "API de trial nao deveria redirecionar sem cookie.");
  const payload = await readPayload(response);
  assert(payload && typeof payload === "object", "API de trial deve responder JSON.");
}

async function loginWithClerk(jar) {
  requireEnv(["E2E_CLERK_BEARER_TOKEN"]);
  const response = await requestWithJar(baseUrl, jar, "/api/auth/painel/clerk", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.E2E_CLERK_BEARER_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const data = await readPayload(response);
  assert(response.ok && data?.ok, `Login Clerk E2E falhou: ${JSON.stringify(data)}`);
  return data;
}

async function iniciarTrial(idSalao, jar) {
  const response = await requestWithJar(baseUrl, jar, "/api/assinatura/iniciar-trial", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idSalao }),
  });
  const data = await readPayload(response);
  assert(response.ok && data?.ok, `Trial falhou: ${JSON.stringify(data)}`);
  return data;
}

async function criarCheckout(idSalao, jar) {
  requireEnv([
    "ASAAS_API_KEY",
    "E2E_RESPONSAVEL_NOME",
    "E2E_RESPONSAVEL_EMAIL",
  ]);

  const asaasBaseUrl = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";
  const isSandbox = asaasBaseUrl.includes("sandbox");
  assert(
    isSandbox || process.env.E2E_ALLOW_PRODUCTION_ASAAS === "1",
    "ASAAS_BASE_URL nao parece sandbox. Use sandbox ou defina E2E_ALLOW_PRODUCTION_ASAAS=1 conscientemente."
  );

  const response = await requestWithJar(baseUrl, jar, "/api/assinatura/criar-cobranca", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      idSalao,
      nomeSalao: process.env.E2E_SALAO_NOME || "Salao Premium E2E",
      responsavelNome: process.env.E2E_RESPONSAVEL_NOME,
      responsavelEmail: process.env.E2E_RESPONSAVEL_EMAIL,
      responsavelCpfCnpj: process.env.E2E_RESPONSAVEL_CPF_CNPJ || "",
      responsavelTelefone: process.env.E2E_RESPONSAVEL_TELEFONE || "",
      cep: process.env.E2E_CEP || "",
      numero: process.env.E2E_NUMERO || "",
      complemento: process.env.E2E_COMPLEMENTO || "",
      plano: process.env.E2E_PLANO || "basico",
      billingType: process.env.E2E_BILLING_TYPE || "PIX",
    }),
  });
  const data = await readPayload(response);
  assert(response.ok && data?.ok && data?.paymentId, `Checkout falhou: ${JSON.stringify(data)}`);
  return data;
}

async function enviarWebhookConfirmado(checkout) {
  requireEnv(["ASAAS_WEBHOOK_TOKEN"]);

  const response = await fetch(`${baseUrl}/api/webhooks/asaas`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "asaas-access-token": process.env.ASAAS_WEBHOOK_TOKEN,
    },
    body: JSON.stringify({
      id: `evt_e2e_${randomUUID()}`,
      event: "PAYMENT_CONFIRMED",
      payment: {
        id: checkout.paymentId,
        customer: checkout.customerId,
        status: "CONFIRMED",
        billingType: checkout.billingType || "PIX",
        value: checkout.valor,
        netValue: checkout.valor,
        dueDate: checkout.vencimento,
        invoiceUrl: checkout.invoiceUrl,
      },
    }),
  });
  const data = await readPayload(response);
  assert(response.ok && data?.ok, `Webhook confirmado falhou: ${JSON.stringify(data)}`);
  return data;
}

await expectApiNoRedirect();

if (!allowMutation) {
  console.log("Smoke sem mutacao concluido. Para fluxo autenticado, rode com E2E_ALLOW_MUTATION=1 e token Clerk de teste.");
} else {
  requireEnv(["E2E_SALAO_ID", "E2E_CLERK_BEARER_TOKEN"]);
  const idSalao = process.env.E2E_SALAO_ID;
  const jar = createCookieJar();
  await loginWithClerk(jar);
  await iniciarTrial(idSalao, jar);

  let checkout = null;
  if (runAsaasCheckout) checkout = await criarCheckout(idSalao, jar);

  if (runWebhook) {
    assert(checkout, "E2E_RUN_ASAAS_WEBHOOK exige E2E_RUN_ASAAS_CHECKOUT=1.");
    await enviarWebhookConfirmado(checkout);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        idSalao,
        checkout: checkout
          ? {
              paymentId: checkout.paymentId,
              status: checkout.status,
              billingType: checkout.billingType,
            }
          : null,
      },
      null,
      2
    )
  );
}
