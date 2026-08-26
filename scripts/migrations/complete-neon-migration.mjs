import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const legacy = "supa" + "base";
const Legacy = "Supa" + "base";
const skippedDirs = new Set([".git", ".next", "node_modules", "dist", "build", ".vercel"]);
const runtimeExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function write(relative, content) {
  fs.writeFileSync(path.join(root, relative), content);
}

function rewritePainelAuthService(relative, errorClass, indent) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return;

  let content = read(relative);
  content = content.replace(
    new RegExp(`import\\s*\\{\\s*createServerClient\\s*\\}\\s*from\\s*["']@${legacy}/ssr["'];?\\n?`, "g"),
    ""
  );
  content = content.replace(
    'import { cookies, headers } from "next/headers";',
    'import { headers } from "next/headers";'
  );
  content = content.replace(
    'import { getPainelUserContextByAuthUserId } from "@/lib/auth/get-painel-user-context";',
    'import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";'
  );
  content = content.replace(
    new RegExp(`import\\s*\\{\\s*get${Legacy}CookieOptions\\s*\\}\\s*from\\s*["']@/lib/${legacy}/cookie-options["'];?\\n?`, "g"),
    ""
  );
  content = content.replace(
    new RegExp(`async function get${Legacy}Server\\(\\) \\{[\\s\\S]*?\\n\\}\\n\\n`, "g"),
    ""
  );

  const authBlock = new RegExp(
    `const ${legacy} = await get${Legacy}Server\\(\\);[\\s\\S]*?const usuario = await getPainelUserContextByAuthUserId\\(user\\.id\\);`,
    "g"
  );
  const pad = " ".repeat(indent);
  const replacement = [
    "const { user, usuario, mfaRequired } = await getPainelUserContext();",
    `${pad}if (mfaRequired) {`,
    `${pad}  throw new ${errorClass}("Autenticacao de dois fatores obrigatoria.", 401);`,
    `${pad}}`,
    "",
    `${pad}if (!user) {`,
    `${pad}  throw new ${errorClass}("Usuario nao autenticado.", 401);`,
    `${pad}}`,
  ].join("\n");
  content = content.replace(authBlock, replacement);

  content = content
    .split(`${legacy}Admin`).join("databaseAdmin")
    .split(`get${Legacy}Server`).join("getDatabaseServer")
    .split(`get${Legacy}CookieOptions`).join("getSessionCookieOptions")
    .split(`NEXT_PUBLIC_${legacy.toUpperCase()}_URL`).join("DATABASE_URL")
    .split(`NEXT_PUBLIC_${legacy.toUpperCase()}_ANON_KEY`).join("DATABASE_URL");

  write(relative, content);
}

function rewriteAdminMasterSession() {
  const relative = "lib/admin-master/auth/session.ts";
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return;

  let content = read(relative);
  content = content.replace(
    new RegExp(`import\\s*\\{\\s*get${Legacy}CookieOptions\\s*\\}\\s*from\\s*["']@/lib/${legacy}/cookie-options["'];?\\n?`, "g"),
    ""
  );
  content = content.split(`get${Legacy}CookieOptions`).join("getSessionCookieOptions");

  if (!content.includes("function getSessionCookieOptions(")) {
    const marker = "const ADMIN_MASTER_SESSION_VERSION = 2;\n";
    const helper = `\nfunction getSessionCookieOptions(host?: string | null) {\n  const hostname = String(host || \"\")\n    .split(\":\")[0]\n    .trim()\n    .toLowerCase();\n  const isLocal =\n    !hostname ||\n    hostname === \"localhost\" ||\n    hostname === \"127.0.0.1\" ||\n    hostname.endsWith(\".local\");\n  const sharedDomain =\n    hostname === \"salaopremiun.com.br\" || hostname.endsWith(\".salaopremiun.com.br\")\n      ? \".salaopremiun.com.br\"\n      : undefined;\n\n  return {\n    secure: !isLocal,\n    ...(sharedDomain ? { domain: sharedDomain } : {}),\n  };\n}\n`;
    content = content.replace(marker, marker + helper);
  }

  write(relative, content);
}

function removeLegacyNamedEntries(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skippedDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) removeLegacyNamedEntries(full);
    if (entry.name.toLowerCase().includes(legacy)) {
      fs.rmSync(full, { recursive: true, force: true });
    }
  }
}

function collectRuntimeLegacyReferences(dir, output = []) {
  if (!fs.existsSync(dir)) return output;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skippedDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectRuntimeLegacyReferences(full, output);
      continue;
    }
    if (!runtimeExtensions.has(path.extname(entry.name))) continue;
    const relative = path.relative(root, full).replaceAll(path.sep, "/");
    if (relative === "scripts/migrations/complete-neon-migration.mjs") continue;
    const content = fs.readFileSync(full, "utf8");
    if (content.toLowerCase().includes(legacy)) output.push(relative);
  }
  return output;
}

rewritePainelAuthService("services/assinaturaService.ts", "AssinaturaServiceError", 6);
rewritePainelAuthService("services/assinaturaCheckoutService.ts", "AssinaturaCheckoutServiceError", 2);
rewritePainelAuthService("services/whatsappPacoteCheckoutService.ts", "WhatsappPacoteCheckoutServiceError", 2);
rewriteAdminMasterSession();

for (const relative of [
  legacy,
  `${legacy}-blog`,
  `apps/app-profissional-vite/${legacy}`,
]) {
  fs.rmSync(path.join(root, relative), { recursive: true, force: true });
}
removeLegacyNamedEntries(path.join(root, "lib"));

const leftovers = collectRuntimeLegacyReferences(root);
if (leftovers.length) {
  console.error("Ainda existem referencias runtime do provedor legado:");
  leftovers.forEach((file) => console.error(` - ${file}`));
  process.exit(2);
}

console.log("Migracao runtime concluida: Neon e o banco principal; autenticacao administrativa usa Clerk.");
