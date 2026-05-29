import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import { loadLocalEnv, requireEnv } from "../lib/load-env.mjs";

loadLocalEnv();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

const accountsPath =
  process.env.E2E_TEST_ACCOUNTS_FILE || ".codex-test-accounts.local.json";
if (!fs.existsSync(accountsPath)) {
  throw new Error(
    `Arquivo ${accountsPath} nao encontrado. Rode node scripts/e2e/provision-test-accounts.mjs primeiro.`
  );
}

const accounts = JSON.parse(fs.readFileSync(accountsPath, "utf8"));
const baseUrl = (process.env.E2E_BASE_URL || accounts.baseUrlHint || "http://localhost:3000").replace(/\/$/, "");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
const report = {
  baseUrl,
  startedAt: new Date().toISOString(),
  checks: [],
};

function addCheck(name, ok, detail = "") {
  report.checks.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!ok) throw new Error(name);
}

async function expectText(page, text, name) {
  const visible = await page
    .getByText(text, { exact: false })
    .first()
    .waitFor({ state: "visible", timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  addCheck(name, visible, text);
}

async function cleanupAppointments() {
  await supabase
    .from("agendamentos")
    .delete()
    .eq("id_salao", accounts.salons.premium.idSalao);
}

async function loginCliente(page) {
  await page.goto(`${baseUrl}/app-cliente/login`, { waitUntil: "domcontentloaded" });
  await page.locator('[name="email"]').fill(accounts.client.email);
  await page.locator('[name="senha"]').fill(accounts.password);
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await page.waitForURL(/\/app-cliente\/agendamentos|\/app-cliente\/salao\//, {
    timeout: 25000,
  });
  const cookies = await page.context().cookies();
  addCheck(
    "login cliente cria sessao",
    cookies.some((cookie) => cookie.name === "sp_cliente_session"),
    page.url()
  );
}

async function loginProfissional(page) {
  await page.context().clearCookies();
  await page.goto(`${baseUrl}/app-profissional/login?limpar=1`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('[name="cpf"]').fill(accounts.salons.premium.professionalCpf);
  await page.locator('[name="senha"]').fill(accounts.password);
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await page.waitForURL(/\/app-profissional\/inicio/, { timeout: 25000 });
  addCheck("login profissional premium", true, page.url());
}

async function run() {
  await cleanupAppointments();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "pt-BR",
  });
  const page = await context.newPage();

  await loginCliente(page);
  await page.goto(`${baseUrl}/app-cliente/salao/${accounts.salons.premium.idSalao}/reserva`, {
    waitUntil: "domcontentloaded",
  });
  await expectText(page, "Pro PREMIUM E2E", "cliente ve profissional vinculado");
  await page.getByRole("button", { name: /Pro PREMIUM E2E/i }).click();
  await expectText(page, "Corte PREMIUM E2E", "cliente ve servico vinculado");
  await expectText(page, "2 horas", "cliente ve duracao em horas");
  await page.getByRole("button", { name: /Corte PREMIUM E2E/i }).click();
  await page.getByRole("button", { name: /^Continuar$/ }).click();
  await expectText(page, "Escolha o horário", "cliente abre escolha de horario");

  const dayButton = page
    .locator("button:not([disabled])")
    .filter({ hasText: /^\d{1,2}$/ })
    .first();
  await dayButton.click();
  const timeButton = page
    .locator("button")
    .filter({ hasText: /^\d{2}:\d{2}$/ })
    .first();
  await timeButton.waitFor({ state: "visible", timeout: 20000 });
  await timeButton.click();
  await page.getByRole("button", { name: /^Continuar$/ }).click();
  await expectText(page, "Resumo do agendamento", "cliente abre resumo");
  await expectText(page, "2 horas", "resumo mostra duracao em horas");
  await page.getByRole("button", { name: /Confirmar agendamento/i }).click();
  await page.waitForURL(/\/app-cliente\/agendamentos\/.+\/sinal/, {
    timeout: 30000,
  });
  await expectText(page, "Pagamento do sinal", "cliente cai na tela de sinal");
  await expectText(page, "Pro PREMIUM E2E", "sinal usa recebedor do profissional");

  const { data: appointment, error: appointmentError } = await supabase
    .from("agendamentos")
    .select("id, data, status, sinal_status, sinal_valor, sinal_confirmacao_responsavel, created_at")
    .eq("id_salao", accounts.salons.premium.idSalao)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (appointmentError) throw appointmentError;
  addCheck(
    "agendamento com sinal salvo",
    appointment?.status === "reservado_aguardando_pagamento" &&
      appointment?.sinal_status === "aguardando_pagamento" &&
      Number(appointment?.sinal_valor || 0) > 0 &&
      appointment?.sinal_confirmacao_responsavel === "profissional",
    JSON.stringify(appointment)
  );

  await loginProfissional(page);
  await page.goto(`${baseUrl}/app-profissional/servicos`, {
    waitUntil: "domcontentloaded",
  });
  await expectText(page, "Corte PREMIUM E2E", "profissional ve servico vinculado");
  await expectText(page, "2 horas", "profissional ve duracao em horas");

  await page.goto(`${baseUrl}/app-profissional/perfil/configuracoes`, {
    waitUntil: "domcontentloaded",
  });
  await expectText(page, "Pix do sinal", "profissional ve configuracao pix");
  const pixTipo = await page.locator('[name="pix_tipo"]').inputValue();
  const pixChave = await page.locator('[name="pix_chave"]').inputValue();
  const recebedor = await page.locator('[name="sinal_pix_recebedor"]').inputValue();
  addCheck(
    "pix do sinal vem preenchido",
    pixTipo === "CPF" &&
      pixChave === accounts.salons.premium.professionalCpf &&
      recebedor === "Pro PREMIUM E2E",
    `${pixTipo} ${pixChave} ${recebedor}`
  );

  await page.goto(`${baseUrl}/app-profissional/agenda?data=${appointment.data}`, {
    waitUntil: "domcontentloaded",
  });
  await expectText(page, "Cliente App E2E", "profissional ve agendamento do cliente");
  await expectText(page, "Sinal", "agenda profissional mostra sinal");

  await browser.close();
  report.finishedAt = new Date().toISOString();
  report.ok = report.checks.every((item) => item.ok);
  fs.writeFileSync(
    ".codex-app-flow-report.local.json",
    `${JSON.stringify(report, null, 2)}\n`
  );
}

run().catch((error) => {
  report.finishedAt = new Date().toISOString();
  report.ok = false;
  report.error = error.message;
  fs.writeFileSync(
    ".codex-app-flow-report.local.json",
    `${JSON.stringify(report, null, 2)}\n`
  );
  console.error(error);
  process.exit(1);
});
