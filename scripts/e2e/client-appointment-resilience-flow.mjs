import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import { loadLocalEnv, requireEnv } from "../lib/load-env.mjs";

loadLocalEnv();
requireEnv(["NEON_ADMIN_DATABASE_URL"]);

const accounts = JSON.parse(
  fs.readFileSync(
    process.env.E2E_TEST_ACCOUNTS_FILE || ".codex-test-accounts.local.json",
    "utf8"
  )
);
const baseUrl = (
  process.env.E2E_BASE_URL ||
  accounts.baseUrlHint ||
  "http://localhost:3000"
).replace(/\/$/, "");
const sql = neon(process.env.NEON_ADMIN_DATABASE_URL);
const marker = `codex-resilience-${Date.now()}`;
const premium = accounts.salons.premium;
const report = { baseUrl, marker, checks: [], ok: false };

function check(name, ok, detail = "") {
  report.checks.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!ok) throw new Error(name);
}

async function getTestIds() {
  const clients = await sql`
    select id from public.clientes
    where id_salao = ${premium.idSalao} and lower(email) = lower(${accounts.client.email})
    limit 1
  `;
  const professionals = await sql`
    select id from public.profissionais
    where id_salao = ${premium.idSalao} and cpf = ${premium.professionalCpf}
    limit 1
  `;
  const services = await sql`
    select id, duracao_minutos, preco from public.servicos
    where id = ${premium.serviceIds[0]}
    limit 1
  `;
  const client = clients[0];
  const professional = professionals[0];
  const service = services[0];
  if (!client?.id || !professional?.id || !service?.id) {
    throw new Error("Dados E2E do cliente, profissional ou serviço não encontrados.");
  }
  return {
    idCliente: client.id,
    idProfissional: professional.id,
    idServico: service.id,
    duracao: Number(service.duracao_minutos || 120),
    preco: Number(service.preco || 0),
  };
}

function tomorrow() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  return value.toISOString().slice(0, 10);
}

async function cleanup() {
  await sql`
    delete from public.agendamentos
    where id_salao = ${premium.idSalao}
      and observacoes like ${`%${marker}%`}
  `;
}

async function insertAppointment(ids, item) {
  const rows = await sql`
    insert into public.agendamentos (
      id_salao, cliente_id, profissional_id, servico_id, data,
      hora_inicio, hora_fim, duracao_minutos, status, origem,
      observacoes, sinal_status, sinal_valor, sinal_confirmacao_responsavel
    ) values (
      ${premium.idSalao}, ${ids.idCliente}, ${ids.idProfissional}, ${ids.idServico}, ${item.data},
      ${item.hora_inicio}, ${item.hora_fim}, ${ids.duracao}, ${item.status || "confirmado"},
      'codex_e2e', ${marker}, 'nao_exigido', 0, 'salao'
    )
    returning id, hora_inicio
  `;
  return rows[0];
}

async function seedAppointments(ids) {
  const data = tomorrow();
  const inserted = [];
  for (const item of [
    { hora_inicio: "08:00", hora_fim: "10:00" },
    { hora_inicio: "10:30", hora_fim: "12:30" },
    { hora_inicio: "14:00", hora_fim: "16:00" },
  ]) {
    inserted.push(await insertAppointment(ids, { ...item, data }));
  }
  return { data, inserted };
}

async function loginCliente(page) {
  await page.goto(`${baseUrl}/app-cliente/login`, { waitUntil: "domcontentloaded" });
  await page.locator('[name="email"]').fill(accounts.client.email);
  await page.locator('[name="senha"]').fill(accounts.password);
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await page.waitForURL(/\/app-cliente\/agendamentos/, { timeout: 30000 });
  check(
    "sessão do cliente criada",
    (await page.context().cookies()).some((item) => item.name === "sp_cliente_session")
  );
}

async function run() {
  const ids = await getTestIds();
  await cleanup();
  await seedAppointments(ids);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR" });
  const page = await context.newPage();

  try {
    await loginCliente(page);
    await page.goto(`${baseUrl}/app-cliente/agendamentos`, { waitUntil: "domcontentloaded" });

    const cancelCard = page.locator("article").filter({ hasText: "08:00" }).first();
    await cancelCard.getByRole("button", { name: /Cancelar agendamento/i }).click();
    await page.waitForURL(/\/app-cliente\/agendamentos\?status=cancelado/, { timeout: 30000 });
    check("cancelamento redireciona com status", true, page.url());
    check("cancelamento mostra confirmação", await page.getByText(/foi cancelado/i).isVisible());

    const rescheduleCard = page.locator("article").filter({ hasText: "10:30" }).first();
    await rescheduleCard.getByRole("button", { name: /^Reagendar$/ }).click();
    await page.getByRole("button", { name: /12:30|13:00|13:30/ }).first().waitFor({ state: "visible", timeout: 30000 });
    const targetTime = page.getByRole("button", { name: /12:30|13:00|13:30/ }).first();
    await targetTime.click();
    await rescheduleCard.getByRole("button", { name: /^Confirmar$/ }).click();
    await page.waitForURL(/\/app-cliente\/agendamentos\?status=reagendado/, { timeout: 30000 });
    check("reagendamento redireciona com status", true, page.url());
    check("reagendamento mostra confirmação", await page.getByText(/foi reagendado/i).isVisible());

    await page.goto(`${baseUrl}/app-cliente/agendamentos`, { waitUntil: "domcontentloaded" });
    const conflictCard = page.locator("article").filter({ hasText: "14:00" }).first();
    const conflictId = await conflictCard.locator("input[name='agendamento']").first().inputValue();
    await conflictCard.getByRole("button", { name: /^Reagendar$/ }).click();
    const conflictTarget = conflictCard.locator("button").filter({ hasText: /^\d{2}:\d{2}$/ }).first();
    await conflictTarget.waitFor({ state: "visible", timeout: 30000 });
    const conflictTime = (await conflictTarget.textContent()).trim();
    const conflictDate = (await conflictCard.locator("input[name='data']").inputValue()).trim();
    const conflictEnd = `${String(Number(conflictTime.slice(0, 2)) + 2).padStart(2, "0")}:${conflictTime.slice(3)}`;
    await insertAppointment(ids, {
      data: conflictDate,
      hora_inicio: conflictTime,
      hora_fim: conflictEnd,
      status: "confirmado",
    });
    await conflictTarget.click();
    await conflictCard.getByRole("button", { name: /^Confirmar$/ }).click();
    await page.waitForTimeout(500);
    const conflictRows = await sql`
      select data, hora_inicio from public.agendamentos where id = ${conflictId} limit 1
    `;
    const conflictAfter = conflictRows[0] || null;
    const conflictMessageVisible = await page
      .getByText(/hor.*ocupado|disponibilidade|não foi possível reagendar/i)
      .first()
      .isVisible()
      .catch(() => false);
    check(
      "conflito de horário é recusado",
      conflictMessageVisible ||
        (String(conflictAfter?.data || "").slice(0, 10) === tomorrow() &&
          String(conflictAfter?.hora_inicio || "").startsWith("14:00")),
      `${conflictAfter?.data || ""} ${conflictAfter?.hora_inicio || ""}`
    );

    await context.clearCookies();
    await page.goto(`${baseUrl}/app-cliente/agendamentos`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/app-cliente\/login/, { timeout: 30000 });
    check("sessão expirada retorna ao login", true, page.url());

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
      ".codex-client-resilience-report.local.json",
      `${JSON.stringify(report, null, 2)}\n`
    );
  });
