import { chromium } from "playwright";
import fs from "node:fs";
import { loadLocalEnv } from "../lib/load-env.mjs";

loadLocalEnv();

const accounts = JSON.parse(
  fs.readFileSync(
    process.env.E2E_TEST_ACCOUNTS_FILE || ".codex-test-accounts.local.json",
    "utf8"
  )
);
const baseUrl = (
  process.env.E2E_PROFESSIONAL_BASE_URL || "http://localhost:5177/app-profissional/"
).replace(/\/$/, "");
const professional = accounts.salons.premium;
const report = { baseUrl, checks: [], ok: false };

function check(name, ok, detail = "") {
  report.checks.push({ name, ok, detail });
  console.log(`${ok ? "OK" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!ok) throw new Error(name);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR" });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("CPF").fill(professional.professionalCpf);
    await page.getByRole("textbox", { name: "Senha Ver senha" }).fill(accounts.password);
    await page.getByRole("button", { name: /Entrar/i }).click();
    await page.getByText(/Acesso ativo/i).waitFor({ state: "visible", timeout: 30000 });
    check("profissional entra no app Vite", true, page.url());

    await page.getByText(/Última sincronização|Online|Sincronizando/i).waitFor({
      state: "visible",
      timeout: 30000,
    });
    await page.getByText(/Corte PREMIUM E2E/i).waitFor({ state: "visible", timeout: 30000 });
    check("dados sincronizados aparecem no app profissional", true);

    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await page.getByText(/Offline|Sem conexão/i).waitFor({ state: "visible", timeout: 30000 });
    check("estado offline é exibido", true);
    check(
      "dados sincronizados permanecem disponíveis offline",
      await page.getByText(/Corte PREMIUM E2E/i).isVisible().catch(() => false)
    );

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.waitForTimeout(1000);
    check(
      "estado online é restaurado",
      await page.getByText(/Online/i).isVisible().catch(() => false)
    );
    report.ok = true;
  } finally {
    await browser.close();
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
      ".codex-professional-offline-report.local.json",
      `${JSON.stringify(report, null, 2)}\n`
    );
  });
