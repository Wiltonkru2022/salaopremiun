import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FIX_MODE = process.argv.includes("--fix");
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const ROOTS = [
  "app/(painel)",
  "components/agenda",
  "components/assinatura",
  "components/caixa",
  "components/clientes",
  "components/comandas",
  "components/configuracoes",
  "components/estoque",
  "components/layout",
  "components/perfil-salao",
  "components/profissionais",
  "components/servicos",
  "core/i18n/pt-BR.ts",
];

const REPLACEMENTS = [
  ["SalãoPremium", "Salão Premium"],
  ["Salão Premiun", "Salão Premium"],
  ["Fuso horario do salao", "Fuso horário do salão"],
  ["Fuso horário do salao", "Fuso horário do salão"],
  [
    "Defina o fuso usado na agenda, lembretes, notificacoes",
    "Defina o fuso usado na agenda, lembretes, notificações",
  ],
  ["Dashboard avançado", "Visão geral avançada"],
  ["Visão geral avançado", "Visão geral avançada"],
  ["Visão geral avançada ativo", "Visão geral avançada ativa"],
  ["Escolha o plano certo sem poluicao.", "Escolha o plano certo sem poluição."],
  ["Agora a comparacao mostra somente o que importa", "Agora a comparação mostra somente o que importa"],
  ["/ mes", "/ mês"],
];

function walk(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];

  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(target, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function normalizeFileName(file) {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}

function applyReplacements(content) {
  let next = content;
  for (const [from, to] of REPLACEMENTS) {
    next = next.replaceAll(from, to);
  }
  return next;
}

const files = ROOTS.flatMap((entry) => walk(path.join(ROOT, entry))).filter((file) =>
  EXTENSIONS.has(path.extname(file))
);
const pending = [];

for (const file of files) {
  const current = fs.readFileSync(file, "utf8");
  const normalized = applyReplacements(current);
  if (normalized === current) continue;

  pending.push(normalizeFileName(file));
  if (FIX_MODE) {
    fs.writeFileSync(file, normalized, "utf8");
  }
}

console.log("");
console.log("=== AUDITORIA VISUAL PT-BR DO PAINEL ===");
console.log(`Arquivos analisados: ${files.length}`);
console.log(`Arquivos com correção conhecida: ${pending.length}`);

if (pending.length) {
  for (const file of pending) console.log(` - ${file}`);
}

if (pending.length && !FIX_MODE) {
  console.error("");
  console.error("Falha: existem textos visuais conhecidos fora do padrão PT-BR.");
  console.error("Use: node scripts/audit/painel-ui-text-audit.mjs --fix");
  process.exit(1);
}

if (FIX_MODE) {
  console.log(pending.length ? "Correções aplicadas." : "Nenhuma correção necessária.");
} else {
  console.log("OK: textos conhecidos do painel estão padronizados em PT-BR.");
}
