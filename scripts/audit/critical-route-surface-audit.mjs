import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CRITICAL_DIRS = [
  "app/api/admin-master",
  "app/api/app-profissional",
  "app/api/assinatura",
  "app/api/auth",
  "app/api/comandas",
  "app/api/caixa",
  "app/api/vendas",
  "app/api/estoque",
  "app/api/monitoring",
  "app/api/usuarios",
  "app/api/webhooks",
];
const ALLOWED_PUBLIC_HINTS = [
  "webhook",
  "cron",
  "motivo publico",
  "rota publica",
];
const GUARD_HINTS = [
  "requireTenantActor(",
  "requireAdminTenantActor(",
  "requireSalaoMembership(",
  "requireSalaoPermission(",
  "requireAdminSalao(",
  "requireAdminMasterUser(",
  "getAdminMasterAccess(",
  "getProfissionalSessionFromCookie(",
  "requireProfissionalSession(",
  "requireProfissionalAppContext(",
  "requireProfissionalServerContext(",
  "getProfissionalTicketContext(",
  "getPainelTicketContext(",
  "carregarContextoVenda(",
  "createAdminMaster",
  "createAdminSalaoRouteService(",
  "createSalaoMutacaoRouteService(",
  "createCaixaRouteService(",
  "createComissaoTaxaRouteService(",
  "createEstoqueMutacaoService(",
  "createEstoqueComandaService(",
  "createAssinaturaService(",
  "createAssinaturaCheckoutService(",
  "createMonitoringService(",
  "createSuporteTicketService(",
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/route\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(full);
  }

  return files;
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function normalize(currentPath) {
  return currentPath.replace(ROOT + path.sep, "").replaceAll("\\", "/");
}

const offenders = [];

for (const dir of CRITICAL_DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    const rel = normalize(file);
    const content = read(file).toLowerCase();
    const hasGuard = GUARD_HINTS.some((hint) =>
      content.includes(hint.toLowerCase())
    );
    const isAllowedPublic = ALLOWED_PUBLIC_HINTS.some((hint) =>
      content.includes(hint)
    );
    if (!hasGuard && !isAllowedPublic) {
      offenders.push(rel);
    }
  }
}

console.log("");
console.log("=== AUDITORIA DE SUPERFICIE DE ROTAS CRITICAS ===");
console.log(`Rotas criticas sem guard/hint publico: ${offenders.length}`);
console.log("");

if (offenders.length) {
  for (const item of offenders) {
    console.error(` - ${item}`);
  }
  console.error("");
  console.error("Falha: rotas criticas precisam declarar guard ou motivo publico.");
  process.exit(1);
}

console.log("OK: rotas criticas auditadas com sucesso.");
