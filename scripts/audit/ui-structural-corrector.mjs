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

function replaceOrThrow(source, search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`[ui-structure] trecho esperado nao encontrado: ${label}`);
  }
  return source.replace(search, replacement);
}

function fixAgendaSidebar() {
  const relativePath = "components/agenda/AgendaSidebar.tsx";
  const { absolutePath, source: original } = read(relativePath);
  let source = original;

  source = replaceOrThrow(
    source,
    "  ChevronDown,\n",
    "",
    `${relativePath}: import ChevronDown`
  );

  source = replaceOrThrow(
    source,
    `                <button\n                  type="button"\n                  className="flex w-full items-center justify-between gap-3 text-left"\n                >\n                  <span className="truncate text-[1.15rem] font-semibold tracking-[-0.03em] text-slate-900 capitalize">\n                    {currentMonthLabel}\n                  </span>\n                  <ChevronDown size={18} className="shrink-0 text-zinc-500" />\n                </button>`,
    `                <div className="flex w-full items-center justify-between gap-3 text-left">\n                  <span className="truncate text-[1.15rem] font-semibold tracking-[-0.03em] text-slate-900 capitalize">\n                    {currentMonthLabel}\n                  </span>\n                </div>`,
    `${relativePath}: cabecalho mensal decorativo`
  );

  fs.writeFileSync(absolutePath, source, "utf8");
  return source !== original;
}

function fixCaixaFila() {
  const relativePath = "components/caixa/CaixaFila.tsx";
  const { absolutePath, source: original } = read(relativePath);
  let source = original;

  source = replaceOrThrow(
    source,
    "  SlidersHorizontal,\n",
    "",
    `${relativePath}: import SlidersHorizontal`
  );

  source = replaceOrThrow(
    source,
    `\n          <button\n            type="button"\n            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"\n            aria-label="Filtros"\n          >\n            <SlidersHorizontal size={18} />\n          </button>`,
    "",
    `${relativePath}: botao de filtro decorativo`
  );

  fs.writeFileSync(absolutePath, source, "utf8");
  return source !== original;
}

const changed = [fixAgendaSidebar(), fixCaixaFila()].filter(Boolean).length;
console.log(`[ui-structure] ${changed} arquivos corrigidos; controles sem acao foram removidos.`);
