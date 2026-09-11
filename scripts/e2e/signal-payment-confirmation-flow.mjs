import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import { loadLocalEnv, requireEnv } from "../lib/load-env.mjs";

loadLocalEnv();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

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
const premium = accounts.salons.premium;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
const marker = `codex-signal-${Date.now()}`;
const report = { baseUrl, marker, checks: [], ok: false };

function check(name, ok, detail = "") {
  report.checks.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!ok) throw new Error(name);
}

function tomorrowAt(hour = 11) {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return {
    data: date.toISOString().slice(0, 10),
    inicio: `${String(hour).padStart(2, "0")}:00:00`,
    fim: `${String(hour + 2).padStart(2, "0")}:00:00`,
  };
}

async function getIds() {
  const [{ data: cliente }, { data: profissional }, { data: servico }] =
    await Promise.all([
      supabase
        .from("clientes")
        .select("id")
        .eq("id_salao", premium.idSalao)
        .eq("email", accounts.client.email)
        .maybeSingle(),
      supabase
        .from("profissionais")
        .select("id, nome, nome_exibicao")
        .eq("id_salao", premium.idSalao)
        .eq("cpf", premium.professionalCpf)
        .maybeSingle(),
      supabase
        .from("servicos")
        .select("id, duracao_minutos")
        .eq("id", premium.serviceIds[0])
        .maybeSingle(),
    ]);

  if (!cliente?.id || !profissional?.id || !servico?.id) {
    throw new Error("Contas E2E necessárias não encontradas.");
  }

  return {
    idCliente: cliente.id,
    idProfissional: profissional.id,
    idServico: servico.id,
    profissionalNome: profissional.nome_exibicao || profissional.nome,
    duracao: Number(servico.duracao_minutos || 120),
  };
}

async function cleanup() {
  const { data: rows } = await supabase
    .from("agendamentos")
    .select("id, sinal_comprovante_path")
    .eq("id_salao", premium.idSalao)
    .like("observacoes", `%${marker}%`);

  for (const row of rows || []) {
    if (row.sinal_comprovante_path) {
      await supabase.storage
        .from("agendamento-comprovantes")
        .remove([String(row.sinal_comprovante_path)]);
    }
  }

  await supabase
    .from("agendamentos")
    .delete()
    .eq("id_salao", premium.idSalao)
    .like("observacoes", `%${marker}%`);
}

async function seedAppointment(ids) {
  const slot = tomorrowAt(11);
  const { data, error } = await supabase
    .from("agendamentos")
    .insert({
      id_salao: premium.idSalao,
      cliente_id: ids.idCliente,
      profissional_id: ids.idProfissional,
      servico_id: ids.idServico,
      data: slot.data,
      hora_inicio: slot.inicio,
      hora_fim: slot.fim,
      duracao_minutos: ids.duracao,
      status: "reservado_aguardando_pagamento",
      sinal_status: "aguardando_pagamento",
      sinal_valor: 15.98,
      sinal_percentual: 20,
      sinal_pix_chave: premium.professionalCpf,
      sinal_pix_recebedor: ids.profissionalNome,
      sinal_pix_cidade: "Tres Lagoas",
      sinal_confirmacao_responsavel: "profissional",
      reserva_expira_em: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      origem: "codex_e2e",
      observacoes: marker,
    })
    .select("id")
    .single();
  if (error || !data?.id) throw error || new Error("Não foi possível criar a reserva E2E.");
  return { id: data.id, data: slot.data };
}

async function loginCliente(page) {
  await page.goto(`${baseUrl}/app-cliente/login`, { waitUntil: "domcontentloaded" });
  await page.locator('[name="email"]').fill(accounts.client.email);
  await page.locator('[name="senha"]').fill(accounts.password);
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await page.waitForURL(/\/app-cliente\/agendamentos/, { timeout: 30000 });
  check(
    "cliente autenticado",
    (await page.context().cookies()).some((item) => item.name === "sp_cliente_session")
  );
}

async function loginProfissional(page) {
  await page.context().clearCookies();
  await page.goto(`${baseUrl}/app-profissional/login?limpar=1`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('[name="cpf"]').fill(premium.professionalCpf);
  await page.locator('[name="senha"]').fill(accounts.password);
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await page.waitForURL(/\/app-profissional\/inicio/, { timeout: 30000 });
  check("profissional autenticado", true);
}

async function run() {
  const ids = await getIds();
  await cleanup();
  const appointment = await seedAppointment(ids);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "pt-BR",
  });
  const page = await context.newPage();

  try {
    await loginCliente(page);
    await page.goto(
      `${baseUrl}/app-cliente/agendamentos/${appointment.id}/sinal`,
      { waitUntil: "domcontentloaded" }
    );
    await page.getByRole("heading", { name: /Enviar comprovante/i }).waitFor({
      state: "visible",
      timeout: 30000,
    });
    const pdf = Buffer.from("%PDF-1.4\n% Codex E2E comprovante\n");
    await page.locator('input[type="file"][name="comprovante"]').setInputFiles({
      name: "comprovante-codex.pdf",
      mimeType: "application/pdf",
      buffer: pdf,
    });
    await page.getByRole("button", { name: /Enviar comprovante/i }).click();
    await page.waitForURL(/\/app-cliente\/agendamentos\?status=comprovante_enviado/, {
      timeout: 30000,
    });
    check("cliente envia comprovante e retorna com sucesso", true, page.url());

    const { data: sent, error: sentError } = await supabase
      .from("agendamentos")
      .select(
        "status, sinal_status, sinal_comprovante_path, sinal_comprovante_nome, sinal_confirmacao_responsavel"
      )
      .eq("id", appointment.id)
      .maybeSingle();
    if (sentError) throw sentError;
    check(
      "comprovante altera status para confirmação profissional",
      sent?.status === "aguardando_confirmacao_profissional" &&
        sent?.sinal_status === "comprovante_enviado" &&
        Boolean(sent?.sinal_comprovante_path) &&
        sent?.sinal_comprovante_nome === "comprovante-codex.pdf" &&
        sent?.sinal_confirmacao_responsavel === "profissional",
      JSON.stringify(sent)
    );

    await loginProfissional(page);
    await page.goto(`${baseUrl}/app-profissional/agenda/${appointment.id}`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByText(/Comprovante enviado|Aguardando confirma/i).first().waitFor({
      state: "visible",
      timeout: 30000,
    });
    await page.getByRole("button", { name: /Confirmar Pix/i }).click();
    await page.waitForURL(/\/app-profissional\/agenda\/.+\?ok=/, {
      timeout: 30000,
    });
    check("profissional confirma o Pix", true, page.url());

    const { data: confirmed, error: confirmedError } = await supabase
      .from("agendamentos")
      .select(
        "status, sinal_status, sinal_confirmado_por_tipo, sinal_confirmado_por_id, sinal_confirmado_por_nome, reserva_expira_em"
      )
      .eq("id", appointment.id)
      .maybeSingle();
    if (confirmedError) throw confirmedError;
    check(
      "confirmação do profissional fecha o sinal e a reserva",
      confirmed?.status === "confirmado" &&
        confirmed?.sinal_status === "confirmado" &&
        confirmed?.sinal_confirmado_por_tipo === "profissional" &&
        confirmed?.sinal_confirmado_por_id === ids.idProfissional &&
        confirmed?.sinal_confirmado_por_nome === ids.profissionalNome &&
        confirmed?.reserva_expira_em === null,
      JSON.stringify(confirmed)
    );

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
      ".codex-signal-confirmation-report.local.json",
      `${JSON.stringify(report, null, 2)}\n`
    );
  });
