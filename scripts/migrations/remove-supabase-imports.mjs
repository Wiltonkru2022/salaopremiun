import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const skippedDirs = new Set([".git", ".next", "node_modules", "dist", "build", ".vercel"]);
const textExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const replacements = [
  ["@/lib/db/admin-ops", "@/lib/db/admin-ops"],
  ["@/lib/db/admin", "@/lib/db/admin"],
  ["@/lib/db/loose-client", "@/lib/db/loose-client"],
  ["@/lib/db/client", "@/lib/db/client"],
  ["@/lib/db/server", "@/lib/db/server"],
  ["@/lib/blog/database", "@/lib/blog/database"],
  ["asLooseDbClient", "asLooseDbClient"],
  ["LooseDbClient", "LooseDbClient"],
  ["LooseDbQuery", "LooseDbQuery"],
  ["getDatabaseAdmin", "getDatabaseAdmin"],
  ["DatabaseAdminClient", "DatabaseAdminClient"],
  ["getBlogDatabase", "getBlogDatabase"],
  ["getBlogDatabase", "getBlogDatabase"],
  ["canUseBlogDatabase", "canUseBlogDatabase"],
  ["canUseBlogDatabase", "canUseBlogDatabase"],
];

function migrateSource(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const before = content;

  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }

  content = content.replace(
    /import\s+type\s*\{\s*(?:DatabaseClient|DatabaseClient)\s*\}\s*from\s*["']@supabase\/supabase-js["'];?/g,
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
  "lib/blog/supabase.ts",
];
for (const relative of oldRuntimeFiles) {
  const file = path.join(root, relative);
  if (fs.existsSync(file)) fs.rmSync(file, { force: true });
}

console.log("Imports legados migrados para Neon/Clerk; runtimes Supabase antigos removidos.");
