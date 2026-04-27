import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const routeRoot = path.join(cwd, "app", "api");

const GUARDRULES = [
  ["admin_master", /requireAdminMasterUser|adminMasterUser|admin_master_usuarios|auth\/access/],
  ["supabase_user", /auth\.getUser\(|getUser\(|validarSalaoDoUsuario|getPainelTicketContext|requireSalao/],
  ["salao_admin", /requireAdminSalao/],
  ["profissional_session", /getProfissionalSessionFromCookie|getProfissionalTicketContext|requireProfissionalSession/],
  [
    "webhook_secret",
    /validarTokenWebhook|ASAAS_WEBHOOK_TOKEN|verifyHeaderSecret|isMetaWebhookSignatureValid|getMetaWhatsAppAppSecret|isMetaWebhookVerifyRequest/,
  ],
  ["cron_secret", /validarCron|CRON_SECRET|verifyBearerSecret/],
];

const CRITICAL_PREFIXES = [
  "app/api/assinatura",
  "app/api/cadastro-salao",
  "app/api/usuarios",
  "app/api/caixa",
  "app/api/comandas",
  "app/api/vendas",
  "app/api/suporte",
  "app/api/app-profissional",
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name === "route.ts" ? [full] : [];
  });
}

function toPosix(file) {
  return path.relative(cwd, file).replaceAll(path.sep, "/");
}

function routeFromFile(file) {
  return `/${toPosix(file)
    .replace(/^app\/api/, "api")
    .replace(/\/route\.ts$/, "")
    .replace(/\[(.+?)\]/g, ":$1")}`;
}

function hasTenantGuard(source) {
  return (
    /\.eq\(\s*["']id_salao["']/.test(source) ||
    /idSalao/.test(source) ||
    /id_salao/.test(source) ||
    /validarSalaoDoUsuario/.test(source)
  );
}

function classify(source) {
  return GUARDRULES.filter(([, regex]) => regex.test(source)).map(([name]) => name);
}

function isPublicRegistrationRoute(rel, source) {
  return (
    rel === "app/api/cadastro-salao/route.ts" &&
    /auth\.admin\.createUser/.test(source) &&
    ((/from\(["']saloes["']\)/.test(source) &&
      /from\(["']usuarios["']\)/.test(source)) ||
      /fn_cadastrar_salao_transacional/.test(source)) &&
    /auth\.admin\.deleteUser/.test(source)
  );
}

const rows = walk(routeRoot).map((file) => {
  const source = fs.readFileSync(file, "utf8");
  const rel = toPosix(file);
  const usesServiceRole =
    /SUPABASE_SERVICE_ROLE_KEY|getSupabaseAdmin\(|createClient\(supabaseUrl,\s*serviceRoleKey/.test(source);
  const guards = classify(source);
  const tenantGuard = hasTenantGuard(source);
  const publicRegistration = isPublicRegistrationRoute(rel, source);
  const critical = CRITICAL_PREFIXES.some((prefix) => rel.startsWith(prefix));
  const risk =
    usesServiceRole && guards.length === 0 && !publicRegistration
      ? "high"
      : usesServiceRole && critical && !tenantGuard && !publicRegistration
        ? "medium"
        : usesServiceRole
          ? "review"
          : "low";

  return {
    route: routeFromFile(file),
    file: rel,
    usesServiceRole,
    guards: guards.join(",") || "-",
    tenantGuard,
    publicRegistration,
    critical,
    risk,
  };
});

const highRisk = rows.filter((row) => row.risk === "high");
const mediumRisk = rows.filter((row) => row.risk === "medium");

console.table(
  rows
    .filter((row) => row.usesServiceRole || row.critical)
    .map((row) => ({
      risk: row.risk,
      route: row.route,
      service_role: row.usesServiceRole,
      guards: row.guards,
      tenant: row.tenantGuard,
    }))
);

if (highRisk.length || mediumRisk.length) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        highRisk,
        mediumRisk,
        recommendation:
          "Revise rotas service_role sem guard claro antes de liberar venda em escala.",
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, auditedRoutes: rows.length }, null, 2));
