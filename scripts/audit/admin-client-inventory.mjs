import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const outputPath = path.join(cwd, "docs", "generated", "admin-client-inventory.md");

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(entry.name)) return [];
      return walk(full);
    }
    return /\.(ts|tsx|mjs)$/.test(entry.name) ? [full] : [];
  });
}

function routeFromFile(rel) {
  if (!rel.startsWith("app/api/") || !rel.endsWith("/route.ts")) return "-";

  return `/${rel
    .replace(/^app\/api/, "api")
    .replace(/\/route\.ts$/, "")
    .replace(/\[(.+?)\]/g, ":$1")}`;
}

const rows = [];

for (const file of walk(cwd)) {
  const source = fs.readFileSync(file, "utf8");
  if (!/getSupabaseAdmin\(|SUPABASE_SERVICE_ROLE_KEY|auth\.admin\./.test(source)) {
    continue;
  }

  const rel = path.relative(cwd, file).replaceAll(path.sep, "/");
  rows.push({
    file: rel,
    route: routeFromFile(rel),
    authAdmin: /auth\.admin\./.test(source),
    serviceRole: /getSupabaseAdmin\(|SUPABASE_SERVICE_ROLE_KEY/.test(source),
    tenantGuard: /id_salao|idSalao|validarSalao|requireSalao|requireAdminMasterUser/.test(source),
    systemLog: /logSistema|registrarEvento|systemLog|logs_sistema|alerta/i.test(source),
  });
}

rows.sort((a, b) => a.file.localeCompare(b.file));

const tableRows = rows
  .map(
    (row) =>
      `| \`${row.file}\` | ${row.route} | ${row.serviceRole ? "sim" : "nao"} | ${row.authAdmin ? "sim" : "nao"} | ${row.tenantGuard ? "sim" : "revisar"} | ${row.systemLog ? "sim" : "revisar"} |`
  )
  .join("\n");

const content = `# Inventario do admin client

Gerado por \`npm run audit:admin-client-inventory\`.

Use este arquivo para revisar onde o service role ou \`auth.admin\` aparece. Qualquer nova linha com "revisar" precisa ser conferida antes de release.

| Arquivo | Rota | service role | auth.admin | tenant/guard | log/alerta |
| --- | --- | --- | --- | --- | --- |
${tableRows || "| - | - | - | - | - | - |"}
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, content, "utf8");

console.log(
  JSON.stringify(
    {
      ok: true,
      output: path.relative(cwd, outputPath).replaceAll(path.sep, "/"),
      entries: rows.length,
    },
    null,
    2
  )
);
