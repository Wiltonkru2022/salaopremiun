import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["app", "lib", "services", "components"];
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const PATTERNS = [
  '.select("*")',
  ".select('*')",
  ".select(`*`)",
  '.select("*,',
  ".select('*,",
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

function findMatches(content) {
  return PATTERNS.filter((pattern) => content.includes(pattern));
}

const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
const offenders = [];

for (const file of files) {
  const content = read(file);
  const matches = findMatches(content);

  if (matches.length) {
    offenders.push({
      file: normalize(file),
      matches,
    });
  }
}

console.log("");
console.log("=== AUDITORIA DE WILDCARD SELECT ===");
console.log(`Arquivos analisados: ${files.length}`);
console.log(`Arquivos com wildcard select: ${offenders.length}`);
console.log("");

if (offenders.length) {
  for (const offender of offenders) {
    console.error(` - ${offender.file}`);
    for (const match of offender.matches) {
      console.error(`   padrao: ${match}`);
    }
  }
  console.error("");
  console.error("Falha: substitua wildcard select por colunas explicitas.");
  process.exit(1);
}

console.log("OK: nenhum wildcard select encontrado.");
