import { assert, normalizeBaseUrl, readPayload } from "../lib/http-e2e.mjs";

const baseUrl = normalizeBaseUrl(process.env.E2E_PROXY_BASE_URL || process.env.E2E_BASE_URL);
const followRedirects = process.env.E2E_PROXY_FOLLOW_REDIRECTS === "1";

const cases = [
  {
    name: "API webhook Asaas nao redireciona",
    method: "POST",
    path: "/api/webhooks/asaas",
    forwardedHost: "salaopremiun.com.br",
    body: {},
    expectNoRedirect: true,
    expectStatuses: [401],
    expectJson: true,
  },
  {
    name: "Admin Master login na raiz nao entra em loop",
    method: "GET",
    path: "/admin-master/login",
    forwardedHost: "salaopremiun.com.br",
    expectNoSelfRedirect: true,
  },
  {
    name: "Login comum na raiz direciona para host de login",
    method: "GET",
    path: "/login",
    forwardedHost: "salaopremiun.com.br",
    expectRedirectHost: "login.salaopremiun.com.br",
  },
  {
    name: "Painel no host de login nao gera cadeia de redirect infinita",
    method: "GET",
    path: "/dashboard",
    forwardedHost: "login.salaopremiun.com.br",
    expectNoSelfRedirect: true,
  },
  {
    name: "Assinatura conserva rota dedicada",
    method: "GET",
    path: "/assinatura",
    forwardedHost: "assinatura.salaopremiun.com.br",
    expectRedirectHost: "assinatura.salaopremiun.com.br",
  },
  {
    name: "App profissional conserva login do app",
    method: "GET",
    path: "/app-profissional/login",
    forwardedHost: "app.salaopremiun.com.br",
    expectNoSelfRedirect: true,
  },
  {
    name: "Painel host protegido sem cookie nao redireciona para si mesmo",
    method: "GET",
    path: "/dashboard",
    forwardedHost: "painel.salaopremiun.com.br",
    expectNoSelfRedirect: true,
  },
];

function getLocationHost(response) {
  const location = response.headers.get("location");
  if (!location) return null;
  return new URL(location, baseUrl).host;
}

function isRedirect(status) {
  return status >= 300 && status < 400;
}

async function runCase(testCase) {
  const headers = new Headers();
  headers.set("x-forwarded-host", testCase.forwardedHost);

  if (testCase.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${baseUrl}${testCase.path}`, {
    method: testCase.method,
    headers,
    body: testCase.body === undefined ? undefined : JSON.stringify(testCase.body),
    redirect: followRedirects ? "follow" : "manual",
  });

  const location = response.headers.get("location");

  if (testCase.expectNoRedirect) {
    assert(!isRedirect(response.status), `${testCase.name}: recebeu redirect ${response.status} -> ${location}`);
  }

  if (testCase.expectNoSelfRedirect && isRedirect(response.status)) {
    const target = new URL(location, baseUrl);
    const source = new URL(`${baseUrl}${testCase.path}`);
    assert(
      !(target.host === source.host && target.pathname === testCase.path),
      `${testCase.name}: redirect para si mesmo (${location})`
    );
  }

  if (testCase.expectRedirectHost) {
    assert(
      getLocationHost(response) === testCase.expectRedirectHost,
      `${testCase.name}: esperado redirect para ${testCase.expectRedirectHost}, recebido ${location || response.status}`
    );
  }

  if (testCase.expectStatuses) {
    assert(
      testCase.expectStatuses.includes(response.status),
      `${testCase.name}: status esperado ${testCase.expectStatuses.join("/")}, recebido ${response.status}`
    );
  }

  if (testCase.expectJson) {
    const payload = await readPayload(response);
    assert(
      payload && typeof payload === "object" && !Array.isArray(payload),
      `${testCase.name}: resposta deveria ser JSON`
    );
  }

  return {
    name: testCase.name,
    status: response.status,
    location: location || "-",
  };
}

const results = [];
for (const testCase of cases) {
  results.push(await runCase(testCase));
}

console.table(results);
