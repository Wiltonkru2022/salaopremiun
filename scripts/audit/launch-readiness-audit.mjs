import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();

const REQUIRED_FILES = [
  "app/globals.css",
  "components/ui/AppModal.tsx",
  "components/layout/AppShell.tsx",
  "components/layout/Header.tsx",
  "components/layout/Sidebar.tsx",
  "components/agenda/AgendaGrid.tsx",
  "components/agenda/AgendaContextMenu.tsx",
  "scripts/e2e/proxy-smoke.mjs",
  "scripts/e2e/saas-sales-flow.mjs",
  "scripts/audit/database-contract-audit.mjs",
  "docs/go-live-checklist.md",
  "docs/production-checklists.md",
  "docs/database-required-functions.md",
];

const CRITICAL_PATTERNS = [
  {
    name: "window.confirm em fluxo de produto",
    pattern: /\bwindow\.confirm\s*\(/,
    include: /\.(tsx|ts)$/,
  },
  {
    name: "fonte global reduzida por breakpoint",
    pattern: /@media[^{]+{[^}]*\b(html,\s*body|body|html)\s*{[^}]*font-size\s*:/s,
    include: /app[\\/]globals\.css$/,
  },
];

const WARNING_PATTERNS = [
  {
    name: "texto com possivel encoding quebrado",
    pattern: /Ã|�/,
    include: /\.(tsx|ts|md)$/,
  },
  {
    name: "rota antiga com underscore visivel",
    pattern: /relatorio_financeiro/,
    include: /\.(tsx|ts|md)$/,
  },
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") {
      return [];
    }
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function relative(file) {
  return path.relative(cwd, file).replaceAll(path.sep, "/");
}

function findPattern(patternConfig) {
  return walk(cwd)
    .filter((file) => patternConfig.include.test(file))
    .flatMap((file) => {
      const source = read(file);
      if (!patternConfig.pattern.test(source)) return [];
      const lines = source.split(/\r?\n/);
      const matches = [];
      lines.forEach((line, index) => {
        if (patternConfig.pattern.test(line)) {
          matches.push({
            file: relative(file),
            line: index + 1,
            sample: line.trim().slice(0, 160),
          });
        }
      });
      return matches.length
        ? matches
        : [{ file: relative(file), line: 1, sample: "match em bloco" }];
    });
}

const missingFiles = REQUIRED_FILES.filter(
  (file) => !fs.existsSync(path.join(cwd, file))
);

const criticalFindings = CRITICAL_PATTERNS.flatMap((config) =>
  findPattern(config).map((match) => ({ type: config.name, ...match }))
);

const warnings = WARNING_PATTERNS.flatMap((config) =>
  findPattern(config).slice(0, 30).map((match) => ({ type: config.name, ...match }))
);

const result = {
  ok: missingFiles.length === 0 && criticalFindings.length === 0,
  missingFiles,
  criticalFindings,
  warnings,
  warningCount: warnings.length,
};

if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
