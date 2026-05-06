import { chromium } from "playwright";
import fs from "node:fs";
import { loadLocalEnv } from "../lib/load-env.mjs";

loadLocalEnv();

const accountsPath = process.env.E2E_TEST_ACCOUNTS_FILE || ".codex-test-accounts.local.json";
if (!fs.existsSync(accountsPath)) {
  throw new Error(
    `Arquivo ${accountsPath} nao encontrado. Rode node scripts/e2e/provision-test-accounts.mjs primeiro.`
  );
}

const accounts = JSON.parse(fs.readFileSync(accountsPath, "utf8"));
const baseUrl = (process.env.E2E_BASE_URL || accounts.baseUrlHint || "http://localhost:3000").replace(/\/$/, "");
const isLocalBase = /localhost|127\.0\.0\.1/.test(baseUrl);
const localPort = new URL(baseUrl).port || "3000";
const blogBaseUrl = isLocalBase
  ? `http://blog.salaopremiun.com.br:${localPort}`
  : "https://blog.salaopremiun.com.br";
const report = {
  baseUrl,
  startedAt: new Date().toISOString(),
  checks: [],
  consoleErrors: [],
};

function addCheck(name, ok, detail = "") {
  report.checks.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
}

function isIgnorableConsoleError(text) {
  if (!isLocalBase) return false;
  return (
    text.includes("Cross-Origin-Opener-Policy header has been ignored") ||
    text.includes("/_next/webpack-hmr") ||
    text.includes("net::ERR_ABORTED") ||
    text.includes("net::ERR_SSL_PROTOCOL_ERROR")
  );
}

async function expectText(page, text, name) {
  const visible = await page.getByText(text, { exact: false }).first().isVisible().catch(() => false);
  addCheck(name, visible, text);
  if (!visible) throw new Error(`Texto nao encontrado: ${text}`);
}

async function goto(page, path, name) {
  const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
  const status = response?.status() || 0;
  const ok = status >= 200 && status < 400;
  addCheck(name, ok, `${path} status ${status}`);
  if (!ok) throw new Error(`${name} retornou ${status}`);
}

async function gotoUrl(page, url, name) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  const status = response?.status() || 0;
  const ok = status >= 200 && status < 400;
  addCheck(name, ok, `${url} status ${status}`);
  if (!ok) throw new Error(`${name} retornou ${status}`);
}

async function fillByName(page, name, value) {
  await page.locator(`[name="${name}"]`).fill(String(value));
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: isLocalBase
      ? [
          "--host-resolver-rules=MAP login.salaopremiun.com.br 127.0.0.1,MAP painel.salaopremiun.com.br 127.0.0.1,MAP blog.salaopremiun.com.br 127.0.0.1",
        ]
      : [],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "pt-BR",
  });

  context.on("page", (page) => {
    page.on("console", (message) => {
      if (message.type() === "error") {
        if (isIgnorableConsoleError(message.text())) return;
        report.consoleErrors.push({
          url: page.url(),
          text: message.text().slice(0, 500),
        });
      }
    });
    page.on("pageerror", (error) => {
      report.consoleErrors.push({
        url: page.url(),
        text: error.message.slice(0, 500),
      });
    });
  });

  const page = await context.newPage();

  await goto(page, "/app-cliente/inicio?busca=Premium%20E2E", "app cliente inicio");
  await expectText(page, "Salao Premium E2E", "marketplace mostra premium E2E");
  const basicoVisible = await page.getByText("Salao Basico E2E", { exact: false }).first().isVisible().catch(() => false);
  addCheck("marketplace oculta basico", !basicoVisible);

  await goto(page, `/app-cliente/salao/${accounts.salons.premium.idSalao}`, "perfil salao premium");
  await expectText(page, "Corte PREMIUM E2E", "servico com preco aparece");
  await expectText(page, "Exige avaliacao", "servico exige avaliacao sem preco");

  await goto(page, "/app-cliente/login", "login app cliente");
  await fillByName(page, "email", accounts.client.email);
  await fillByName(page, "senha", accounts.password);
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await page.waitForURL(/\/app-cliente\/agendamentos|\/app-cliente\/salao\//, { timeout: 20000 });
  addCheck("login app cliente", true, page.url());

  await goto(page, "/app-cliente/perfil", "perfil app cliente");
  await expectText(page, "Cliente App E2E", "perfil cliente carregado");

  await context.clearCookies();
  await goto(page, "/app-profissional/login?limpar=1", "login app profissional");
  await page.waitForURL(/\/app-profissional\/login/, { timeout: 15000 }).catch(() => undefined);
  await fillByName(page, "cpf", accounts.salons.pro.professionalCpf);
  await fillByName(page, "senha", accounts.password);
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await page.waitForURL(/\/app-profissional\/inicio/, { timeout: 20000 });
  addCheck("login app profissional pro", true, page.url());

  await context.clearCookies();
  await page.route("https://painel.salaopremiun.com.br/**", (route) =>
    route.abort("aborted")
  );
  await goto(page, "/login", "login painel salao");
  await page.waitForTimeout(1200);
  await page.locator('input[type="email"]').fill(accounts.salons.premium.email);
  await page.locator('input[type="password"]').fill(accounts.password);
  await page.getByRole("button", { name: /Entrar/i }).click({ noWaitAfter: true });
  await page
    .waitForURL(/painel\.salaopremiun\.com\.br\/dashboard|\/dashboard/, {
      timeout: 25000,
    })
    .catch(() => undefined);
  const painelLoginOk =
    page.url().includes("painel.salaopremiun.com.br") ||
    page.url().includes("/dashboard") ||
    (await page.getByText("Login aceito", { exact: false }).first().isVisible().catch(() => false));
  addCheck("login painel salao premium", painelLoginOk, page.url());
  if (!painelLoginOk) throw new Error("Login do painel nao confirmou redirecionamento.");
  if (page.url().includes("/dashboard")) {
    await page.waitForTimeout(1500);
    const dashboardResponse = await page.request.get(`${baseUrl}/api/painel/dashboard-resumo`);
    const dashboardOk = dashboardResponse.status() === 200;
    report.dashboardApiOk = dashboardOk;
    addCheck("dashboard painel com sessao", dashboardOk, `status ${dashboardResponse.status()}`);
    if (!dashboardOk) throw new Error("Dashboard do painel perdeu a sessao apos login.");
  }

  await context.clearCookies();
  await goto(page, "/admin-master/login?next=/admin-master/blog", "login admin master");
  await page.waitForTimeout(1200);
  await page.locator('input[type="email"]').fill(accounts.adminMaster.email);
  await page.locator('input[type="password"]').fill(accounts.password);
  await page.getByRole("button", { name: /Entrar no Admin Master/i }).click();
  await page.waitForURL((url) => url.pathname === "/admin-master/blog", {
    timeout: 25000,
  });
  addCheck("admin master blog autenticado", true, page.url());
  await expectText(page, "Posts do blog", "admin master blog renderizado");

  await gotoUrl(page, `${blogBaseUrl}/`, "blog publico");
  await expectText(page, "SalaoPremium", "blog publico renderizado");

  await browser.close();

  report.finishedAt = new Date().toISOString();
  report.consoleErrors = report.consoleErrors.filter((item) => {
    if (!report.dashboardApiOk) return true;
    return !(
      item.url.includes("/dashboard") &&
      (item.text.includes("401") || item.text.includes("Sessao expirada"))
    );
  });
  report.ok = report.checks.every((item) => item.ok) && report.consoleErrors.length === 0;
  fs.writeFileSync(".codex-playwright-report.local.json", `${JSON.stringify(report, null, 2)}\n`);

  if (report.consoleErrors.length) {
    console.error(JSON.stringify({ consoleErrors: report.consoleErrors }, null, 2));
    throw new Error("Playwright encontrou erros no console.");
  }

  if (!report.ok) {
    throw new Error("Playwright smoke falhou.");
  }
}

run().catch((error) => {
  report.finishedAt = new Date().toISOString();
  report.ok = false;
  report.error = error.message;
  fs.writeFileSync(".codex-playwright-report.local.json", `${JSON.stringify(report, null, 2)}\n`);
  console.error(error);
  process.exit(1);
});
