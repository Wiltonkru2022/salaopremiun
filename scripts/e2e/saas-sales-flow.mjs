import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
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
const runMultiTenant = process.env.E2E_RUN_MULTI_TENANT === "1";
const cleanup = process.env.E2E_CLEANUP !== "0";

function uniqueDigits(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
}

function buildCadastroPayload(label) {
  const stamp = Date.now();
  const domain = process.env.E2E_EMAIL_DOMAIN || "example.com";
  return {
    email: `e2e+salaopremium-${label}-${stamp}@${domain}`,
    senha: `SpE2e!${uniqueDigits(8)}`,
    nomeSalao: `Salao Premium E2E ${label} ${stamp}`,
    responsavel: `Responsavel E2E ${label}`,
    whatsapp: "11999999999",
    cpfCnpj: uniqueDigits(14),
    cep: "01001000",
    endereco: "Praca da Se",
    bairro: "Se",
    cidade: "Sao Paulo",
    estado: "SP",
    numero: "100",
    complemento: "E2E",
  };
}

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

function createSupabaseBrowserWithJar(jar) {
  requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
      },
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (items) => jar.setAll(items),
      },
      auth: {
        flowType: "pkce",
        detectSessionInUrl: false,
      },
    }
  );
}

async function cadastroSalao(payload) {
  const response = await fetch(`${baseUrl}/api/cadastro-salao`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readPayload(response);

  assert(response.ok && data?.ok && data?.id_salao, `Cadastro falhou: ${JSON.stringify(data)}`);
  return data.id_salao;
}

async function login(payload, jar) {
  const supabase = createSupabaseBrowserWithJar(jar);
  const { error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.senha,
  });

  assert(!error, `Login Supabase falhou: ${error?.message || "erro desconhecido"}`);
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

async function criarCheckout(idSalao, cadastro, jar) {
  requireEnv(["ASAAS_API_KEY"]);

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
      nomeSalao: cadastro.nomeSalao,
      responsavelNome: cadastro.responsavel,
      responsavelEmail: cadastro.email,
      responsavelCpfCnpj: cadastro.cpfCnpj,
      responsavelTelefone: cadastro.whatsapp,
      cep: cadastro.cep,
      numero: cadastro.numero,
      complemento: cadastro.complemento,
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

  const paymentId = checkout.paymentId;
  const customerId = checkout.customerId;
  const eventId = `evt_e2e_${randomUUID()}`;
  const response = await fetch(`${baseUrl}/api/webhooks/asaas`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "asaas-access-token": process.env.ASAAS_WEBHOOK_TOKEN,
    },
    body: JSON.stringify({
      id: eventId,
      event: "PAYMENT_CONFIRMED",
      payment: {
        id: paymentId,
        customer: customerId,
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

async function assertTenantIsolation(idSalaoPermitido, idSalaoNegado, jar) {
  const response = await requestWithJar(baseUrl, jar, "/api/assinatura/iniciar-trial", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idSalao: idSalaoNegado }),
  });
  const data = await readPayload(response);

  assert(
    response.status === 403,
    `Isolamento multi-tenant falhou: usuario do salao ${idSalaoPermitido} acessou ${idSalaoNegado}. Resposta: ${JSON.stringify(data)}`
  );
}

async function cleanupCreated(items) {
  if (!cleanup || !items.length || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  for (const item of items.reverse()) {
    if (item.idSalao) {
      await supabase.from("saloes").delete().eq("id", item.idSalao);
    }
    if (item.authUserId) {
      await supabase.auth.admin.deleteUser(item.authUserId);
    }
  }
}

async function findAuthUserId(email) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data } = await supabase.auth.admin.listUsers();
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id || null;
}

const created = [];

try {
  await expectApiNoRedirect();

  if (!allowMutation) {
    console.log("Smoke sem mutacao concluido. Para fluxo completo, rode com E2E_ALLOW_MUTATION=1.");
    process.exit(0);
  }

  requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);

  const salaoA = buildCadastroPayload("a");
  const jarA = createCookieJar();
  const idSalaoA = await cadastroSalao(salaoA);
  created.push({ idSalao: idSalaoA, authUserId: await findAuthUserId(salaoA.email) });

  await login(salaoA, jarA);
  await iniciarTrial(idSalaoA, jarA);

  let checkout = null;
  if (runAsaasCheckout) {
    checkout = await criarCheckout(idSalaoA, salaoA, jarA);
  }

  if (runWebhook) {
    assert(checkout, "E2E_RUN_ASAAS_WEBHOOK exige E2E_RUN_ASAAS_CHECKOUT=1.");
    await enviarWebhookConfirmado(checkout);
  }

  if (runMultiTenant) {
    const salaoB = buildCadastroPayload("b");
    const idSalaoB = await cadastroSalao(salaoB);
    created.push({ idSalao: idSalaoB, authUserId: await findAuthUserId(salaoB.email) });
    await assertTenantIsolation(idSalaoA, idSalaoB, jarA);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        idSalao: idSalaoA,
        checkout: checkout
          ? {
              paymentId: checkout.paymentId,
              status: checkout.status,
              billingType: checkout.billingType,
            }
          : null,
        multiTenant: runMultiTenant,
      },
      null,
      2
    )
  );
} finally {
  await cleanupCreated(created);
}
