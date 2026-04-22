import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, "app", "api");
const ROUTE_FILE_REGEX = /route\.(ts|tsx|js|jsx)$/;
const PUBLIC_ROUTE_HINTS = [
  "publicRoute",
  "motivo publico",
  "rota publica",
  "webhook",
  "cron",
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
  "createShellNotificationService(",
  "getUser(",
  "createClient(",
  "auth.uid",
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  }

  return files;
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function normalize(currentPath) {
  return currentPath.replace(ROOT + path.sep, "").replaceAll("\\", "/");
}

function isGuarded(content) {
  return GUARD_HINTS.some((hint) => content.includes(hint));
}

function isLikelyPublic(content, relPath) {
  const lowerPath = relPath.toLowerCase();
  const lower = content.toLowerCase();
  if (lowerPath === "app/api/cadastro-salao/route.ts") return true;
  if (lowerPath.includes("/webhooks/")) return true;
  if (lowerPath.includes("/cron/")) return true;
  return PUBLIC_ROUTE_HINTS.some((hint) => lower.includes(hint.toLowerCase()));
}

function hasMethod(content) {
  return ["export async function GET", "POST", "PUT", "PATCH", "DELETE"].some(
    (signature) => content.includes(signature)
  );
}

if (!fs.existsSync(API_DIR)) {
  console.error("Diretorio app/api nao encontrado.");
  process.exit(1);
}

const routes = walk(API_DIR).filter((file) => ROUTE_FILE_REGEX.test(file));
const missingGuard = [];
const publicRoutes = [];
const guardedRoutes = [];

for (const file of routes) {
  const rel = normalize(file);
  const content = read(file);

  if (!hasMethod(content)) {
    continue;
  }

  if (isGuarded(content)) {
    guardedRoutes.push(rel);
    continue;
  }

  if (isLikelyPublic(content, rel)) {
    publicRoutes.push(rel);
    continue;
  }

  missingGuard.push(rel);
}

console.log("");
console.log("=== AUDITORIA DE GUARDS EM ROTAS API ===");
console.log(`Total de rotas analisadas: ${routes.length}`);
console.log(`Rotas com guard identificado: ${guardedRoutes.length}`);
console.log(`Rotas publicas/provavelmente publicas: ${publicRoutes.length}`);
console.log(`Rotas sem guard detectado: ${missingGuard.length}`);
console.log("");

if (publicRoutes.length) {
  console.log("Rotas tratadas como publicas:");
  for (const item of publicRoutes) {
    console.log(` - ${item}`);
  }
  console.log("");
}

if (missingGuard.length) {
  console.error("Rotas sem guard explicito:");
  for (const item of missingGuard) {
    console.error(` - ${item}`);
  }
  console.error("");
  console.error(
    "Falha: toda rota em app/api precisa declarar guard ou motivo publico claro."
  );
  process.exit(1);
}

console.log("OK: todas as rotas analisadas possuem guard ou motivo publico claro.");
