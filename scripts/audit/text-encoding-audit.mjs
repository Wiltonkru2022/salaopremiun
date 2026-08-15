import fs from "node:fs";
import path from "node:path";

const roots = [
  "app",
  "components",
  "core",
  "lib",
  "services",
  "apps/app-profissional-vite/src",
];
const extensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".css",
  ".html",
  ".json",
]);
const suspicious = /(?:Ã.|Â.|â.|ï¿½)/;
const findings = [];

function walk(relativeRoot) {
  const absoluteRoot = path.join(process.cwd(), relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return;

  for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
    const relative = path.join(relativeRoot, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "dist") walk(relative);
      continue;
    }
    if (!extensions.has(path.extname(entry.name))) continue;

    const content = fs.readFileSync(path.join(process.cwd(), relative), "utf8");
    if (suspicious.test(content)) findings.push(relative);
  }
}

roots.forEach(walk);

if (findings.length) {
  console.error("Textos com possivel codificacao quebrada:");
  findings.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log("Nenhum texto com padrao de codificacao quebrada foi encontrado.");
