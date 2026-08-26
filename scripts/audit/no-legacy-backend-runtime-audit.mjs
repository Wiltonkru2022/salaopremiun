import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoots = ["app", "components", "core", "lib", "services", "apps"];
const skippedDirs = new Set(["node_modules", ".next", "dist", "build", ".git"]);
const extensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const legacyProvider = ["supa", "base"].join("");

const forbidden = [
  { label: "SDK legado", pattern: new RegExp(`@${legacyProvider}/`, "i") },
  { label: "import legado", pattern: new RegExp(`[\\/](?:lib|utils)[\\/]${legacyProvider}(?:[\\/]|['\"])`, "i") },
  { label: "env publico legado", pattern: new RegExp(`NEXT_PUBLIC_${legacyProvider}_`, "i") },
  { label: "env Vite legado", pattern: new RegExp(`VITE_${legacyProvider}_`, "i") },
  { label: "URL legado", pattern: new RegExp(`${legacyProvider}_URL`, "i") },
  { label: "service role legado", pattern: new RegExp(`${legacyProvider}_SERVICE_ROLE_KEY`, "i") },
  { label: "anon key legado", pattern: new RegExp(`${legacyProvider}_ANON_KEY`, "i") },
  { label: "host legado", pattern: new RegExp(`\\.${legacyProvider}\\.co`, "i") },
  { label: "Realtime legado", pattern: /\.channel\s*\(/ },
  { label: "Storage legado", pattern: /\.storage\s*\.\s*from\s*\(/ },
  { label: "login legado", pattern: /\.auth\s*\.\s*signInWithPassword\s*\(/ },
  { label: "reset de senha legado", pattern: /\.auth\s*\.\s*resetPasswordForEmail\s*\(/ },
  { label: "update auth legado", pattern: /\.auth\s*\.\s*updateUser\s*\(/ },
  { label: "MFA legado", pattern: /\.auth\s*\.\s*mfa\s*\./ },
  { label: "identidades legado", pattern: /\.auth\s*\.\s*(?:getUserIdentities|linkIdentity|unlinkIdentity)\s*\(/ },
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
    for (const rule of forbidden) {
      if (rule.pattern.test(text)) violations.push(`${relative}: ${rule.label}`);
    }
  }
}

for (const base of scanRoots) walk(path.join(root, base));

if (violations.length) {
  console.error(
    "Dependencias ou APIs do backend legado ainda encontradas:\n" +
      [...new Set(violations)].join("\n")
  );
  process.exit(1);
}

console.log(
  "OK: runtime sem SDK, env, host, Auth, Storage ou Realtime do backend legado."
);
