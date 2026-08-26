import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const thisScript = path.resolve(import.meta.dirname, "remove-supabase-imports.mjs");
const skippedDirs = new Set([".git", ".next", "node_modules", "dist", "build", ".vercel"]);
const textExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const oldDbPrefix = "@/lib/" + "supabase";
const oldProviderPackage = "@" + "supabase/supabase-js";
const replacements = [
  [`${oldDbPrefix}/admin-ops`, "@/lib/db/admin-ops"],
  [`${oldDbPrefix}/admin`, "@/lib/db/admin"],
  [`${oldDbPrefix}/loose-client`, "@/lib/db/loose-client"],
  [`${oldDbPrefix}/client`, "@/lib/db/client"],
  [`${oldDbPrefix}/server`, "@/lib/db/server"],
  ["@/lib/blog/" + "supabase", "@/lib/blog/database"],
  ["asLoose" + "SupabaseClient", "asLooseDbClient"],
  ["Loose" + "SupabaseClient", "LooseDbClient"],
  ["Loose" + "SupabaseQuery", "LooseDbQuery"],
  ["get" + "SupabaseAdmin", "getDatabaseAdmin"],
  ["Supabase" + "AdminClient", "DatabaseAdminClient"],
  ["getBlog" + "SupabaseAdmin", "getBlogDatabase"],
  ["getBlog" + "SupabasePublic", "getBlogDatabase"],
  ["canUseBlog" + "SupabaseAdmin", "canUseBlogDatabase"],
  ["canUseBlog" + "SupabasePublic", "canUseBlogDatabase"],
];

function migrateSource(filePath) {
  if (path.resolve(filePath) === thisScript) return;

  let content = fs.readFileSync(filePath, "utf8");
  const before = content;

  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }

  const escapedPackage = oldProviderPackage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  content = content.replace(
    new RegExp(
      `import\\s+type\\s*\\{\\s*(?:SupabaseClient|DatabaseClient)\\s*\\}\\s*from\\s*["']${escapedPackage}["'];?`,
      "g"
    ),
    'import type { DatabaseClient } from "@/lib/db/types";'
  );
  content = content.replace(/\bSupabaseClient\b/g, "DatabaseClient");

  if (filePath.endsWith(`${path.sep}proxy.ts`)) {
    content = content.replace(
      /function hasSupabaseAuthCookies\(request: NextRequest\) \{[\s\S]*?\n\}\n\nfunction isLocalDevHost/,
      `function hasPainelAuthCookie(request: NextRequest) {\n  return Boolean(request.cookies.get("sp-painel-auth-token")?.value);\n}\n\nfunction isLocalDevHost`
    );
    content = content
      .replace(/hasSupabaseAuthCookies/g, "hasPainelAuthCookie")
      .replace(
        "middleware nunca consulta Supabase ou outros",
        "middleware nunca consulta banco ou outros"
      );
  }

  if (content !== before) fs.writeFileSync(filePath, content);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".github") {
      if (entry.isDirectory()) continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skippedDirs.has(entry.name)) walk(full);
      continue;
    }
    if (textExtensions.has(path.extname(entry.name))) migrateSource(full);
  }
}

walk(root);

const oldRuntimeFiles = [
  "lib/" + "supabase/admin.ts",
  "lib/" + "supabase/admin-ops.ts",
  "lib/" + "supabase/client.ts",
  "lib/" + "supabase/server.ts",
  "lib/" + "supabase/loose-client.ts",
  "lib/" + "supabase/cookie-options.ts",
  "lib/" + "supabase/auth-client-recovery.ts",
  "lib/neon/" + "supabase-compat.server.ts",
  "lib/blog/" + "supabase.ts",
  "lib/proxy/auth-rules.ts",
];
for (const relative of oldRuntimeFiles) {
  const file = path.join(root, relative);
  if (fs.existsSync(file)) fs.rmSync(file, { force: true });
}

console.log("Imports legados migrados para Neon/Clerk; runtimes antigos removidos.");
