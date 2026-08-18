import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  return {
    absolutePath,
    source: fs.readFileSync(absolutePath, "utf8"),
  };
}

function replaceKnown(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) {
    throw new Error(`[ui-structure] trecho esperado não encontrado: ${label}`);
  }
  return source.replace(search, replacement);
}

function ensureImport(source, anchor, importLine, label) {
  if (source.includes(importLine)) return source;
  if (!source.includes(anchor)) {
    throw new Error(`[ui-structure] import esperado não encontrado: ${label}`);
  }
  return source.replace(anchor, `${anchor}\n${importLine}`);
}

function writeIfChanged(absolutePath, original, source) {
  if (source === original) return false;
  fs.writeFileSync(absolutePath, source, "utf8");
  return true;
}

function fixAgendaSidebar() {
  const relativePath = "components/agenda/AgendaSidebar.tsx";
  const { absolutePath, source: original } = read(relativePath);
  let source = original;

  if (source.includes("  ChevronDown,\n")) {
    source = source.replace("  ChevronDown,\n", "");
  }

  source = replaceKnown(
    source,
    `                <button\n                  type="button"\n                  className="flex w-full items-center justify-between gap-3 text-left"\n                >\n                  <span className="truncate text-[1.15rem] font-semibold tracking-[-0.03em] text-slate-900 capitalize">\n                    {currentMonthLabel}\n                  </span>\n                  <ChevronDown size={18} className="shrink-0 text-zinc-500" />\n                </button>`,
    `                <div className="flex w-full items-center justify-between gap-3 text-left">\n                  <span className="truncate text-[1.15rem] font-semibold tracking-[-0.03em] text-slate-900 capitalize">\n                    {currentMonthLabel}\n                  </span>\n                </div>`,
    `${relativePath}: cabeçalho mensal decorativo`
  );

  return writeIfChanged(absolutePath, original, source);
}

function fixCaixaFila() {
  const relativePath = "components/caixa/CaixaFila.tsx";
  const { absolutePath, source: original } = read(relativePath);
  let source = original;

  if (source.includes("  SlidersHorizontal,\n")) {
    source = source.replace("  SlidersHorizontal,\n", "");
  }

  const button = `\n          <button\n            type="button"\n            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"\n            aria-label="Filtros"\n          >\n            <SlidersHorizontal size={18} />\n          </button>`;
  if (source.includes(button)) source = source.replace(button, "");

  return writeIfChanged(absolutePath, original, source);
}

function fixProfessionalCalendarSubmit() {
  const relativePath = "apps/app-profissional-vite/src/components/agenda/Calendar.tsx";
  const { absolutePath, source: original } = read(relativePath);
  let source = original;

  source = replaceKnown(
    source,
    "            <Button>Bloquear</Button>",
    "            <Button type=\"submit\">Bloquear</Button>",
    `${relativePath}: submit do bloqueio`
  );

  return writeIfChanged(absolutePath, original, source);
}

function fixCampaignStatusSubmit() {
  const relativePath = "app/(painel)/campanhas/[id]/page.tsx";
  const { absolutePath, source: original } = read(relativePath);
  let source = original;

  source = ensureImport(
    source,
    'import PaginationLinks from "@/components/ui/PaginationLinks";',
    'import PendingActionButton from "@/components/ui/PendingActionButton";',
    relativePath
  );

  source = replaceKnown(
    source,
    `            <button className="h-11 rounded-2xl bg-white px-5 text-sm font-black text-zinc-950">\n              {statusAtual === "ativa" ? "Pausar campanha" : "Ativar campanha"}\n            </button>`,
    `            <PendingActionButton\n              label={statusAtual === "ativa" ? "Pausar campanha" : "Ativar campanha"}\n              pendingLabel={statusAtual === "ativa" ? "Pausando..." : "Ativando..."}\n              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-zinc-950"\n            />`,
    `${relativePath}: status da campanha`
  );

  return writeIfChanged(absolutePath, original, source);
}

function fixDashboardStatus() {
  const relativePath = "app/(painel)/dashboard/page.tsx";
  const { absolutePath, source: original } = read(relativePath);
  let source = original;

  source = ensureImport(
    source,
    'import { getAssinaturaUrl } from "@/lib/site-urls";',
    'import { statusPtBR } from "@/core/i18n/pt-BR";',
    relativePath
  );
  source = replaceKnown(
    source,
    "                    {item.status}",
    "                    {statusPtBR(item.status)}",
    `${relativePath}: status da agenda do dia`
  );

  return writeIfChanged(absolutePath, original, source);
}

function fixFinancialReportStatus() {
  const relativePath = "app/(painel)/relatorio-financeiro/page.tsx";
  const { absolutePath, source: original } = read(relativePath);
  let source = original;

  source = ensureImport(
    source,
    'import { getAssinaturaUrl } from "@/lib/site-urls";',
    'import { statusPtBR } from "@/core/i18n/pt-BR";',
    relativePath
  );
  source = replaceKnown(
    source,
    "                          {item.status}",
    "                          {statusPtBR(item.status)}",
    `${relativePath}: status da comanda`
  );

  return writeIfChanged(absolutePath, original, source);
}

const changed = [
  fixAgendaSidebar(),
  fixCaixaFila(),
  fixProfessionalCalendarSubmit(),
  fixCampaignStatusSubmit(),
  fixDashboardStatus(),
  fixFinancialReportStatus(),
].filter(Boolean).length;

console.log(`[ui-structure] ${changed} arquivos corrigidos; ações, status e controles visuais foram normalizados.`);
