import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();

const REQUIRED_FILES = [
  "core/entities/cliente.ts",
  "core/entities/comanda.ts",
  "core/entities/venda.ts",
  "core/use-cases/comandas/processarComanda.ts",
  "core/use-cases/estoque/processarEstoque.ts",
  "core/use-cases/shared/calcularComissao.ts",
  "core/use-cases/shared/calcularTotal.ts",
  "core/use-cases/shared/formatarValores.ts",
  "core/use-cases/vendas/processarVenda.ts",
  "services/clienteService.ts",
  "services/comandaService.ts",
  "services/estoqueService.ts",
  "services/vendaService.ts",
];

const IGNORED_DIRS = new Set([".git", ".next", "node_modules"]);
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);

const ROUTE_FORBIDDEN_PATTERNS = [
  { name: "Supabase .from direto no route handler", pattern: /\.from\s*\(/ },
  { name: "Supabase .rpc direto no route handler", pattern: /\.rpc\s*\(/ },
  { name: "calculo .reduce direto no route handler", pattern: /\.reduce\s*\(/ },
];

const ANY_PATTERN = /(?::\s*any\b|\bas\s+any\b|<\s*any\s*>)/;
const ANY_ALLOWLIST = new Set(["types/supabase.ts"]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (IGNORED_DIRS.has(entry.name)) return [];

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return [fullPath];
  });
}

function relative(file) {
  return path.relative(cwd, file).replaceAll(path.sep, "/");
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function lineFindings(file, configs) {
  const source = read(file);
  const lines = source.split(/\r?\n/);
  const findings = [];

  lines.forEach((line, index) => {
    configs.forEach((config) => {
      if (config.pattern.test(line)) {
        findings.push({
          file: relative(file),
          line: index + 1,
          sample: line.trim().slice(0, 180),
          type: config.name,
        });
      }
    });
  });

  return findings;
}

const files = walk(cwd);

const missingFiles = REQUIRED_FILES.filter(
  (file) => !fs.existsSync(path.join(cwd, file))
);

const routeFindings = files
  .filter((file) => relative(file).startsWith("app/api/"))
  .filter((file) => path.basename(file) === "route.ts")
  .flatMap((file) => lineFindings(file, ROUTE_FORBIDDEN_PATTERNS));

const anyFindings = files
  .filter((file) => CODE_EXTENSIONS.has(path.extname(file)))
  .filter((file) => {
    const rel = relative(file);
    return (
      !ANY_ALLOWLIST.has(rel) &&
      !rel.startsWith("next-env.d.ts") &&
      !rel.startsWith(".next/")
    );
  })
  .flatMap((file) => {
    const source = read(file);
    if (!ANY_PATTERN.test(source)) return [];

    return source
      .split(/\r?\n/)
      .flatMap((line, index) =>
        ANY_PATTERN.test(line)
          ? [
              {
                file: relative(file),
                line: index + 1,
                sample: line.trim().slice(0, 180),
                type: "uso de any fora da allowlist",
              },
            ]
          : []
      );
  });

const result = {
  ok:
    missingFiles.length === 0 &&
    routeFindings.length === 0 &&
    anyFindings.length === 0,
  missingFiles,
  routeFindings,
  anyFindings,
};

if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
