import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["app", "lib", "services", "components", "scripts"];
const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);
const SEARCH_TERMS = [
  "getSupabaseAdmin(",
  "SUPABASE_SERVICE_ROLE_KEY",
  "service_role",
  "runAdminOperation(",
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (CODE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }

  return files;
}

function normalize(currentPath) {
  return currentPath.replace(ROOT + path.sep, "").replaceAll("\\", "/");
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function linesWithTerms(content) {
  const lines = content.split(/\r?\n/);
  const hits = [];

  lines.forEach((line, index) => {
    for (const term of SEARCH_TERMS) {
      if (line.includes(term)) {
        hits.push({
          line: index + 1,
          term,
          excerpt: line.trim().slice(0, 220),
        });
      }
    }
  });

  return hits;
}

const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
const report = [];

for (const file of files) {
  const content = read(file);
  const hits = linesWithTerms(content);
  if (hits.length) {
    report.push({
      file: normalize(file),
      hits,
    });
  }
}

console.log("");
console.log("=== INVENTARIO DE SUPERFICIE ADMIN / SERVICE ROLE ===");
console.log(`Arquivos analisados: ${files.length}`);
console.log(`Arquivos com ocorrencias: ${report.length}`);
console.log("");

let directAdminCount = 0;
let runAdminCount = 0;
let envKeyCount = 0;

for (const item of report) {
  console.log(item.file);
  for (const hit of item.hits) {
    console.log(`  [L${hit.line}] ${hit.term} :: ${hit.excerpt}`);
    if (hit.term === "getSupabaseAdmin(") directAdminCount += 1;
    if (hit.term === "runAdminOperation(") runAdminCount += 1;
    if (
      hit.term === "SUPABASE_SERVICE_ROLE_KEY" ||
      hit.term === "service_role"
    ) {
      envKeyCount += 1;
    }
  }
  console.log("");
}

console.log("Resumo:");
console.log(` - usos diretos de getSupabaseAdmin(): ${directAdminCount}`);
console.log(` - usos de runAdminOperation(): ${runAdminCount}`);
console.log(` - referencias a service role/chave: ${envKeyCount}`);
console.log("");

if (directAdminCount > 0) {
  console.error(
    "Atencao: ainda existem usos diretos de getSupabaseAdmin(). Avalie migrar para runAdminOperation()."
  );
}
