import { randomUUID } from "node:crypto";
import { loadLocalEnv, requireEnv } from "../lib/load-env.mjs";
import { assert, normalizeBaseUrl, readPayload } from "../lib/http-e2e.mjs";

loadLocalEnv();

const baseUrl = normalizeBaseUrl(process.env.E2E_BASE_URL);
const allowMutation = process.env.E2E_ALLOW_MUTATION === "1";
const runAsaasCheckout = process.env.E2E_RUN_ASAAS_CHECKOUT === "1";
const runWebhook = process.env.E2E_RUN_ASAAS_WEBHOOK === "1";
const painelCookie = String(process.env.E2E_PAINEL_COOKIE || "").trim();
const idSalao = String(process.env.E2E_ID_SALAO || "").trim();

function authHeaders(extra = {}) {
  return {
    ...extra,
    ...(painelCookie ? { cookie: painelCookie } : {}),
  };
}

async function expectProtectedApiContract() {
  const response = await fetch(`${baseUrl}/api/assinatura/iniciar-trial`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
    redirect: "manual",
  });
  const payload = await readPayload(response);
  assert(response.status >= 400, "API protegida nao pode aceitar requisicao sem sessao.");
  assert(payload && typeof payload === "object", "API protegida deve responder JSON.");
}

async function expectPanelSession() {
  if (!painelCookie) return;
  const response = await fetch(`${baseUrl}/api/painel/session`, {
    method: "GET",
    headers: authHeaders(),
    redirect: "manual",
  });
  const payload = await readPayload(response);
  assert(response.ok && payload?.user?.id, `Sessao Clerk do painel invalida: ${JSON.stringify(payload)}`);
}

async function iniciarTrial() {
  assert(idSalao, "E2E_ID_SALAO e obrigatorio para mutacao.");
  assert(painelCookie, "E2E_PAINEL_COOKIE e obrigatorio para mutacao autenticada.");
  const response = await fetch(`${baseUrl}/api/assinatura/iniciar-trial`, {
    method: "POST",
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ idSalao }),
  });
  const payload = await readPayload(response);
  assert(response.ok && payload?.ok, `Trial falhou: ${JSON.stringify(payload)}`);
  return payload;
}

async function criarCheckout() {
  requireEnv(["ASAAS_API_KEY", "E2E_RESPONSAVEL_NOME", "E2E_RESPONSAVEL_EMAIL"]);
  const asaasBaseUrl = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";
  assert(
    asaasBaseUrl.includes("sandbox") || process.env.E2E_ALLOW_PRODUCTION_ASAAS === "1",
    "Use Asaas sandbox ou autorize explicitamente producao."
  );
  const response = await fetch(`${baseUrl}/api/assinatura/criar-cobranca`, {
    method: "POST",
    headers: authHeaders({
      "content-type": "application/json",
      "idempotency-key": `e2e:${idSalao}:${Date.now()}`,
    }),
    body: JSON.stringify({
      idSalao,
      nomeSalao: process.env.E2E_NOME_SALAO || "Salao Premium E2E",
      responsavelNome: process.env.E2E_RESPONSAVEL_NOME,
      responsavelEmail: process.env.E2E_RESPONSAVEL_EMAIL,
      responsavelCpfCnpj: process.env.E2E_RESPONSAVEL_CPF_CNPJ || undefined,
      responsavelTelefone: process.env.E2E_RESPONSAVEL_TELEFONE || undefined,
      plano: process.env.E2E_PLANO || "basico",
      billingType: process.env.E2E_BILLING_TYPE || "PIX",
    }),
  });
  const payload = await readPayload(response);
  assert(response.ok && payload?.ok && payload?.paymentId, `Checkout falhou: ${JSON.stringify(payload)}`);
  return payload;
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
  const payload = await readPayload(response);
  assert(response.ok && payload?.ok, `Webhook falhou: ${JSON.stringify(payload)}`);
}

await expectProtectedApiContract();
await expectPanelSession();

if (!allowMutation) {
  console.log("Smoke Clerk/Neon sem mutacao concluido.");
  process.exit(0);
}

await iniciarTrial();
let checkout = null;
if (runAsaasCheckout) checkout = await criarCheckout();
if (runWebhook) {
  assert(checkout, "E2E_RUN_ASAAS_WEBHOOK exige E2E_RUN_ASAAS_CHECKOUT=1.");
  await enviarWebhookConfirmado(checkout);
}

console.log(JSON.stringify({ ok: true, idSalao, checkout: checkout ? { paymentId: checkout.paymentId, status: checkout.status } : null }, null, 2));
