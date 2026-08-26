import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoots = ["app", "components", "core", "lib", "services", "apps"];
const skippedDirs = new Set(["node_modules", ".next", "dist", "build", ".git"]);
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const legacyProvider = ["supa", "base"].join("");
const forbidden = [
  new RegExp(`@${legacyProvider}/`, "i"),
  new RegExp(`NEXT_PUBLIC_${legacyProvider}_`, "i"),
  new RegExp(`VITE_${legacyProvider}_`, "i"),
  new RegExp(`${legacyProvider}_URL`, "i"),
  new RegExp(`${legacyProvider}_SERVICE_ROLE_KEY`, "i"),
  new RegExp(`${legacyProvider}_ANON_KEY`, "i"),
  new RegExp(`\\.${legacyProvider}\\.co`, "i"),
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
  console.error("Dependencias do backend legado ainda encontradas:\n" + violations.join("\n"));
  process.exit(1);
}

console.log("OK: runtime sem SDK, env ou host do backend legado.");
