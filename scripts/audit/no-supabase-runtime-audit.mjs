import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoots = ["app", "components", "core", "lib", "services", "apps"];
const skippedDirs = new Set(["node_modules", ".next", "dist", "build", ".git", "supabase"]);
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const forbidden = [
  /@supabase\//,
  /NEXT_PUBLIC_SUPABASE_/,
  /VITE_SUPABASE_/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /SUPABASE_ANON_KEY/,
  /\.supabase\.co/,
  /postgres_changes/,
];

const violations = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!extensions.has(path.extname(entry.name))) continue;
    const relative = path.relative(root, full).replaceAll("\\", "/");
    const text = fs.readFileSync(full, "utf8");
    for (const pattern of forbidden) {
      if (pattern.test(text)) violations.push(`${relative}: ${pattern}`);
    }
  }
}

for (const base of scanRoots) walk(path.join(root, base));

if (violations.length) {
  console.error("Dependencias runtime do Supabase ainda encontradas:\n" + violations.join("\n"));
  process.exit(1);
}

console.log("OK: runtime sem SDK, env, host ou Realtime Supabase.");
