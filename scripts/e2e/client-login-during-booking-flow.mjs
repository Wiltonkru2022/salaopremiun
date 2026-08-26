import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import { loadLocalEnv, requireEnv } from "../lib/load-env.mjs";

loadLocalEnv();
requireEnv(["NEON_ADMIN_DATABASE_URL"]);

const accountsPath =
  process.env.E2E_TEST_ACCOUNTS_FILE || ".codex-test-accounts.local.json";
const accounts = JSON.parse(fs.readFileSync(accountsPath, "utf8"));
const baseUrl = (
  process.env.E2E_BASE_URL ||
  accounts.baseUrlHint ||
  "http://localhost:3000"
).replace(/\/$/, "");
const premium = accounts.salons.premium;
const marker = `codex-login-booking-${Date.now()}`;
const sql = neon(process.env.NEON_ADMIN_DATABASE_URL);
const report = {
  baseUrl,
  marker,
  startedAt: new Date().toISOString(),
  checks: [],
  ok: false,
};
const createdAppointmentIds = [];

function check(name, ok, detail = "") {
  report.checks.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!ok) throw new Error(name);
}

async function cleanup() {
  if (!createdAppointmentIds.length) return;
  await sql`
    delete from public.agendamentos
    where id_salao = ${premium.idSalao}
      and id = any(${createdAppointmentIds}::uuid[])
  `;
}

async function expectVisible(locator, name) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if ((await locator.count().catch(() => 0)) > 0) {
      check(name, true);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Elemento não ficou visível: ${name}`);
}

async function run() {
  await cleanup();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "pt-BR",
  });
  const page = await context.newPage();

  try {
    await page.goto(
      `${baseUrl}/app-cliente/salao/${premium.idSalao}/reserva`,
      { waitUntil: "domcontentloaded" }
    );

    check(
      "reserva inicia sem sessão",
      !(await context.cookies()).some(
        (cookie) => cookie.name === "sp_cliente_session"
      )
    );

    const professional = page.getByRole("button", { name: /Pro PREMIUM E2E/i });
    await expectVisible(professional, "profissional disponível sem login");
    await professional.click();

    const service = page.getByRole("button", { name: /Corte PREMIUM E2E/i });
    await expectVisible(service, "serviço disponível sem login");
    await service.click();
    await page.getByRole("button", { name: /^Continuar$/ }).click();

    const availableDay = page
      .locator("button:not([disabled])")
      .filter({ hasText: /^\d{1,2}$/ })
      .first();
    await expectVisible(availableDay, "data disponível antes do login");
    const selectedDay = await availableDay.textContent();
    await availableDay.click();

    const availableTime = page
      .locator("button")
      .filter({ hasText: /^\d{2}:\d{2}$/ })
      .first();
    await expectVisible(availableTime, "horário disponível antes do login");
    const selectedTime = (await availableTime.textContent()).trim();
    await availableTime.click();
    await page.getByRole("button", { name: /^Continuar$/ }).click();

    await expectVisible(page.getByText("Resumo do agendamento", { exact: true }), "resumo aberto sem login");
    await expectVisible(page.getByText("Pro PREMIUM E2E", { exact: true }), "resumo preserva profissional antes do login");
    await expectVisible(page.getByText("Corte PREMIUM E2E", { exact: true }), "resumo preserva serviço antes do login");

    await page.getByRole("link", { name: /Entrar para confirmar/i }).click();
    await page.waitForURL(/\/app-cliente\/login\?/, { timeout: 30000 });
    check("login iniciado a partir do resumo", /\/app-cliente\/login/.test(page.url()));

    await page.locator('[name="email"]').fill(accounts.client.email);
    await page.locator('[name="senha"]').fill(accounts.password);
    await page.getByRole("button", { name: /^Entrar$/ }).click();
    await page.waitForURL(/\/app-cliente\/salao\/.+\/reserva/, { timeout: 30000 });
    check("login retorna para reserva", /\/app-cliente\/salao\/.+\/reserva/.test(page.url()));
    check(
      "sessão criada após login",
      (await context.cookies()).some((cookie) => cookie.name === "sp_cliente_session")
    );

    await expectVisible(page.getByText("Resumo do agendamento", { exact: true }), "resumo restaurado após login");
    await expectVisible(page.getByText("Pro PREMIUM E2E", { exact: true }), "profissional preservado após login");
    await expectVisible(page.getByText("Corte PREMIUM E2E", { exact: true }), "serviço preservado após login");
    await expectVisible(page.getByText(selectedTime, { exact: true }), "horário preservado após login");
    check("data selecionada continua no resumo", Boolean(selectedDay));

    await page.getByRole("button", { name: /Confirmar agendamento/i }).click();
    await page.waitForURL(/\/app-cliente\/agendamentos\/.+\/sinal|\/app-cliente\/agendamentos\?/, {
      timeout: 30000,
    });

    const appointments = await sql`
      select id, id_salao, data, hora_inicio, status, cliente_id, created_at
      from public.agendamentos
      where id_salao = ${premium.idSalao}
        and cliente_id = ${accounts.client.idCliente}
        and created_at >= ${report.startedAt}::timestamptz
      order by created_at desc
      limit 5
    `;
    const appointment = appointments[0] || null;
    if (appointment?.id) createdAppointmentIds.push(appointment.id);

    check(
      "reserva criada após login",
      Boolean(appointment?.id) &&
        appointment.id_salao === premium.idSalao &&
        appointment.cliente_id === accounts.client.idCliente,
      JSON.stringify(appointment)
    );
    check("redirecionamento pós-reserva concluído", /\/app-cliente\/agendamentos/.test(page.url()), page.url());

    report.ok = true;
  } finally {
    await browser.close();
    await cleanup();
  }
}

run()
  .catch((error) => {
    report.error = error.message;
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(
      ".codex-client-login-booking-report.local.json",
      `${JSON.stringify(report, null, 2)}\n`
    );
  });
