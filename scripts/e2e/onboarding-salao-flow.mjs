import { chromium } from "playwright";

const baseUrl = (process.env.E2E_BASE_URL || "https://cadastro.salaopremiun.com.br").replace(/\/$/, "");
const password = process.env.E2E_ONBOARDING_PASSWORD || "E2E!SalaoPremium2026";
const stamp = Date.now();
const email = process.env.E2E_ONBOARDING_EMAIL || `e2e-onboarding-${stamp}@example.com`;
const salonName = `E2E Onboarding ${stamp}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fillByLabel(page, label, value) {
  await page.getByLabel(label, { exact: false }).fill(value);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (Linux; Android 15; SM-A145M) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36",
  });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/cadastro-salao`, { waitUntil: "domcontentloaded" });
    assert(await page.getByText("Comece seu SalãoPremium").isVisible(), "Cadastro não carregou no viewport mobile.");

    await fillByLabel(page, "Nome do salão", salonName);
    await fillByLabel(page, "Responsável", "E2E Responsável");
    await fillByLabel(page, "CPF ou CNPJ", process.env.E2E_ONBOARDING_CPF || "52998224725");
    await fillByLabel(page, "WhatsApp", "67999999999");
    await page.getByRole("button", { name: /continuar/i }).click();

    await fillByLabel(page, "E-mail", email);
    await fillByLabel(page, "Senha", password);
    await page.getByRole("button", { name: /continuar/i }).click();

    await fillByLabel(page, "CEP", "79002000");
    await fillByLabel(page, "Endereço", "Rua E2E");
    await fillByLabel(page, "Número", "123");
    await fillByLabel(page, "Bairro", "Centro");
    await fillByLabel(page, "Cidade", "Campo Grande");
    await fillByLabel(page, "UF", "MS");
    await page.getByRole("button", { name: /continuar/i }).click();

    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /criar e configurar/i }).click();
    await page.waitForURL(/onboarding-salao/, { timeout: 30000 });

    assert(await page.getByText(/Configuração inicial obrigatória/i).isVisible(), "Onboarding não abriu após cadastro.");

    // O upload de logo exige um arquivo real definido pelo CI.
    const logoPath = process.env.E2E_ONBOARDING_LOGO;
    assert(logoPath, "Defina E2E_ONBOARDING_LOGO com uma imagem para executar o fluxo completo.");
    await page.getByText("Logo do salão").locator("..").getByRole("button", { name: /escolher imagem/i }).setInputFiles(logoPath);

    await fillByLabel(page, "Descrição pública", "Salão temporário para teste automatizado do onboarding.");
    await page.getByRole("button", { name: /salvar e continuar/i }).click();

    await fillByLabel(page, "Nome", "Corte E2E");
    await fillByLabel(page, "Categoria", "Cabelo");
    await fillByLabel(page, "Duração", "30");
    await fillByLabel(page, "Preço", "50,00");
    await page.getByRole("button", { name: /salvar e continuar/i }).click();

    await fillByLabel(page, "Nome", "Profissional E2E");
    await fillByLabel(page, "Cargo", "Cabeleireiro");
    await page.getByRole("button", { name: /Corte E2E/i }).click();
    await page.getByRole("button", { name: /salvar e continuar/i }).click();

    await page.getByRole("button", { name: /não trabalho com produtos/i }).click();
    await page.getByRole("button", { name: /salvar e continuar/i }).click();

    await page.getByRole("button", { name: /configurar depois/i }).click();
    await page.getByRole("button", { name: /salvar e continuar/i }).click();

    await page.getByRole("button", { name: /salvar e continuar/i }).click();
    assert(await page.getByText(/Revise e ative seu SalãoPremium/i).isVisible(), "Revisão final não abriu.");

    const before = await page.request.get(`${baseUrl.replace("cadastro.", "painel.")}/api/onboarding-salao`);
    assert(before.status() === 200, `Estado do onboarding não pôde ser consultado antes da conclusão: ${before.status()}`);
    const beforeBody = await before.json();
    assert(beforeBody.salao?.onboarding_concluido === false, "Onboarding foi marcado como concluído cedo demais.");
    assert(beforeBody.salao?.trial_ativo !== true, "Trial iniciou antes da conclusão do onboarding.");
    assert(beforeBody.salao?.produtos_modulo_ativo === false, "Produtos deveriam estar desativados no cenário E2E.");
    assert(beforeBody.salao?.pix_modulo_ativo === false, "Pix deveria estar adiado no cenário E2E.");

    await page.getByRole("button", { name: /finalizar cadastro e iniciar teste grátis/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 30000 });

    const after = await page.request.get(`${baseUrl.replace("cadastro.", "painel.")}/api/onboarding-salao`);
    // Após concluir, o endpoint pode redirecionar/retornar estado concluído dependendo da sessão/cache.
    assert([200, 307, 308].includes(after.status()), `Resposta inesperada após conclusão: ${after.status()}`);

    console.log(JSON.stringify({ ok: true, salonName, email, finalUrl: page.url() }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
