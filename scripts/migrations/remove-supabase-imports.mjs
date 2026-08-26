import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const skippedDirs = new Set([".git", ".next", "node_modules", "dist", "build", ".vercel"]);
const textExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const replacements = [
  ["@/lib/supabase/admin-ops", "@/lib/db/admin-ops"],
  ["@/lib/supabase/admin", "@/lib/db/admin"],
  ["@/lib/supabase/loose-client", "@/lib/db/loose-client"],
  ["@/lib/supabase/client", "@/lib/db/client"],
  ["@/lib/supabase/server", "@/lib/db/server"],
  ["asLooseSupabaseClient", "asLooseDbClient"],
  ["LooseSupabaseClient", "LooseDbClient"],
  ["LooseSupabaseQuery", "LooseDbQuery"],
  ["getSupabaseAdmin", "getDatabaseAdmin"],
  ["SupabaseAdminClient", "DatabaseAdminClient"],
];

function migrateSource(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const before = content;

  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }

  content = content.replace(
    /import\s+type\s*\{\s*SupabaseClient\s*\}\s*from\s*["']@supabase\/supabase-js["'];?/g,
    'import type { DatabaseClient } from "@/lib/db/types";'
  );
  content = content.replace(/\bSupabaseClient\b/g, "DatabaseClient");

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
  "lib/supabase/admin.ts",
  "lib/supabase/admin-ops.ts",
  "lib/supabase/client.ts",
  "lib/supabase/server.ts",
  "lib/supabase/loose-client.ts",
  "lib/supabase/cookie-options.ts",
  "lib/neon/supabase-compat.server.ts",
];
for (const relative of oldRuntimeFiles) {
  const file = path.join(root, relative);
  if (fs.existsSync(file)) fs.rmSync(file, { force: true });
}

console.log("Importacoes legadas de banco migradas para lib/db e runtime Supabase removido.");
