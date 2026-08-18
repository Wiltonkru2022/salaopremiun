import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const ROOT = process.cwd();
const FIX = process.argv.includes("--fix");
const TARGETS = [
  "apps/app-profissional-vite/src",
  "app/app-cliente",
  "components/client-app",
  "app/(painel)",
  "components/layout",
  "components/ui",
  "components/agenda",
  "components/caixa",
  "components/campanhas",
  "components/clientes",
  "components/comandas",
  "components/comissoes",
  "components/configuracoes",
  "components/dashboard",
  "components/estoque",
  "components/marketing",
  "components/perfil-salao",
  "components/produtos",
  "components/profissionais",
  "components/relatorios",
  "components/servicos",
  "components/vendas",
  "components/assinatura",
];

const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const IGNORE_DIRS = new Set(["node_modules", ".next", "dist", "build", "coverage"]);

const visibleAttributeNames = new Set([
  "aria-label",
  "alt",
  "emptyText",
  "label",
  "placeholder",
  "subtitle",
  "title",
]);

const visiblePropertyNames = new Set([
  "cancelLabel",
  "confirmLabel",
  "description",
  "emptyText",
  "errorMessage",
  "label",
  "message",
  "pendingLabel",
  "placeholder",
  "shortLabel",
  "subtitle",
  "successMessage",
  "text",
  "title",
]);

const copyRules = [
  [/(^|\b)Nao(\b|$)/g, "$1Não$2"],
  [/(^|\b)nao(\b|$)/g, "$1não$2"],
  [/(^|\b)possivel(\b|$)/g, "$1possível$2"],
  [/(^|\b)Proxima(\b|$)/g, "$1Próxima$2"],
  [/(^|\b)proxima(\b|$)/g, "$1próxima$2"],
  [/(^|\b)Proximo(\b|$)/g, "$1Próximo$2"],
  [/(^|\b)proximo(\b|$)/g, "$1próximo$2"],
  [/(^|\b)Servico(\b|$)/g, "$1Serviço$2"],
  [/(^|\b)servico(\b|$)/g, "$1serviço$2"],
  [/(^|\b)Servicos(\b|$)/g, "$1Serviços$2"],
  [/(^|\b)servicos(\b|$)/g, "$1serviços$2"],
  [/(^|\b)Configuracoes(\b|$)/g, "$1Configurações$2"],
  [/(^|\b)configuracoes(\b|$)/g, "$1configurações$2"],
  [/(^|\b)Horario(\b|$)/g, "$1Horário$2"],
  [/(^|\b)horario(\b|$)/g, "$1horário$2"],
  [/(^|\b)Horarios(\b|$)/g, "$1Horários$2"],
  [/(^|\b)horarios(\b|$)/g, "$1horários$2"],
  [/(^|\b)Historico(\b|$)/g, "$1Histórico$2"],
  [/(^|\b)historico(\b|$)/g, "$1histórico$2"],
  [/(^|\b)Observacao(\b|$)/g, "$1Observação$2"],
  [/(^|\b)observacao(\b|$)/g, "$1observação$2"],
  [/(^|\b)Observacoes(\b|$)/g, "$1Observações$2"],
  [/(^|\b)observacoes(\b|$)/g, "$1observações$2"],
  [/(^|\b)Informacoes(\b|$)/g, "$1Informações$2"],
  [/(^|\b)informacoes(\b|$)/g, "$1informações$2"],
  [/(^|\b)Avaliacao(\b|$)/g, "$1Avaliação$2"],
  [/(^|\b)avaliacao(\b|$)/g, "$1avaliação$2"],
  [/(^|\b)Avaliacoes(\b|$)/g, "$1Avaliações$2"],
  [/(^|\b)avaliacoes(\b|$)/g, "$1avaliações$2"],
  [/(^|\b)Comentario(\b|$)/g, "$1Comentário$2"],
  [/(^|\b)comentario(\b|$)/g, "$1comentário$2"],
  [/(^|\b)Comentarios(\b|$)/g, "$1Comentários$2"],
  [/(^|\b)comentarios(\b|$)/g, "$1comentários$2"],
  [/(^|\b)Comissao(\b|$)/g, "$1Comissão$2"],
  [/(^|\b)comissao(\b|$)/g, "$1comissão$2"],
  [/(^|\b)Comissoes(\b|$)/g, "$1Comissões$2"],
  [/(^|\b)comissoes(\b|$)/g, "$1comissões$2"],
  [/(^|\b)Producao(\b|$)/g, "$1Produção$2"],
  [/(^|\b)producao(\b|$)/g, "$1produção$2"],
  [/(^|\b)Operacao(\b|$)/g, "$1Operação$2"],
  [/(^|\b)operacao(\b|$)/g, "$1operação$2"],
  [/(^|\b)Unitario(\b|$)/g, "$1Unitário$2"],
  [/(^|\b)unitario(\b|$)/g, "$1unitário$2"],
  [/(^|\b)Credito(\b|$)/g, "$1Crédito$2"],
  [/(^|\b)credito(\b|$)/g, "$1crédito$2"],
  [/(^|\b)Almoco(\b|$)/g, "$1Almoço$2"],
  [/(^|\b)Terca(\b|$)/g, "$1Terça$2"],
  [/(^|\b)Sabado(\b|$)/g, "$1Sábado$2"],
  [/(^|\b)Inicio(\b|$)/g, "$1Início$2"],
  [/(^|\b)Dashboard(\b|$)/g, "$1Visão geral$2"],
];

const canonicalBrand = "Salão Premiun";
const brandVariants = ["Salão Premium", "Salao Premium", "Salao Premiun", "SalãoPremium", "SalaoPremium"];

function walkDirectory(dir, files) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDirectory(full, files);
      continue;
    }
    if (EXTENSIONS.has(path.extname(entry.name))) files.push(full);
  }
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function literalText(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function propertyNameText(node) {
  if (!node) return "";
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
  return node.getText();
}

function closestAncestor(node, predicate) {
  let current = node.parent;
  while (current) {
    if (predicate(current)) return current;
    current = current.parent;
  }
  return null;
}

function jsxTagName(node) {
  return node.tagName?.getText?.() || "";
}

function jsxAttributes(opening) {
  const map = new Map();
  for (const prop of opening.attributes?.properties || []) {
    if (!ts.isJsxAttribute(prop)) continue;
    map.set(prop.name.getText(), prop);
  }
  return map;
}

function jsxAttributeTarget(attr) {
  if (!attr?.initializer) return null;
  if (ts.isStringLiteral(attr.initializer)) return attr.initializer;
  if (
    ts.isJsxExpression(attr.initializer) &&
    attr.initializer.expression &&
    (ts.isStringLiteral(attr.initializer.expression) || ts.isNoSubstitutionTemplateLiteral(attr.initializer.expression))
  ) {
    return attr.initializer.expression;
  }
  return null;
}

function collectVisibleCandidates(sourceFile) {
  const candidates = [];
  const push = (node, target, value, kind) => {
    const raw = String(value ?? "");
    const text = normalizeText(raw);
    if (!text || !/[A-Za-zÀ-ÿ]/.test(text) || !target) return;
    candidates.push({ node, target, raw, text, kind });
  };

  function visit(node) {
    if (ts.isJsxText(node)) push(node, node, node.getText(sourceFile), "jsx");

    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText();
      if (visibleAttributeNames.has(name)) {
        const target = jsxAttributeTarget(node);
        const value = literalText(target);
        if (value != null) push(node, target, value, `attr:${name}`);
      }
    }

    if (ts.isPropertyAssignment(node)) {
      const name = propertyNameText(node.name);
      if (visiblePropertyNames.has(name)) {
        const value = literalText(node.initializer);
        if (value != null) push(node, node.initializer, value, `prop:${name}`);
      }
    }

    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      if (/^(dias|items|steps|tabs|options|navItems)$/i.test(node.name.text)) {
        for (const element of node.initializer.elements) {
          const value = literalText(element);
          if (value != null) push(element, element, value, `array:${node.name.text}`);
        }
      }
    }

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (/^(setError|setErro|setOk|setSuccess|setMessage|setMensagem|alert)$/.test(node.expression.text)) {
        const target = node.arguments[0];
        const value = literalText(target);
        if (value != null) push(target, target, value, `call:${node.expression.text}`);
      }
    }

    if (ts.isNewExpression(node) && node.expression.getText(sourceFile) === "Error") {
      const target = node.arguments?.[0];
      const value = literalText(target);
      if (value != null) push(target, target, value, "error");
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return candidates;
}

function buttonLabel(node, sourceFile) {
  if (!ts.isJsxElement(node)) return "";
  const parts = [];
  for (const child of node.children) {
    if (ts.isJsxText(child)) parts.push(child.getText(sourceFile));
    if (
      ts.isJsxExpression(child) &&
      child.expression &&
      (ts.isStringLiteral(child.expression) || ts.isNoSubstitutionTemplateLiteral(child.expression))
    ) {
      parts.push(child.expression.text);
    }
  }
  return normalizeText(parts.join(" "));
}

function correctedCopy(raw) {
  let value = String(raw ?? "");
  for (const variant of brandVariants) value = value.split(variant).join(canonicalBrand);
  for (const [pattern, replacement] of copyRules) {
    pattern.lastIndex = 0;
    value = value.replace(pattern, replacement);
  }
  return value;
}

function renderTarget(target, corrected) {
  if (ts.isJsxText(target)) return corrected;
  if (ts.isStringLiteral(target)) return JSON.stringify(corrected);
  if (ts.isNoSubstitutionTemplateLiteral(target)) {
    const escaped = corrected
      .replaceAll("\\", "\\\\")
      .replaceAll("`", "\\`")
      .replaceAll("${", "\\${");
    return `\`${escaped}\``;
  }
  return null;
}

const files = [];
for (const target of TARGETS) walkDirectory(path.join(ROOT, target), files);

const errors = [];
const warnings = [];
let buttonCount = 0;
let textCount = 0;
let fixedFiles = 0;
let fixedTexts = 0;

for (const file of files) {
  let source = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file).replaceAll(path.sep, "/");
  const scriptKind = file.endsWith(".tsx") || file.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind);
  const candidates = collectVisibleCandidates(sourceFile);

  if (FIX) {
    const replacements = [];
    const seen = new Set();
    for (const candidate of candidates) {
      const corrected = correctedCopy(candidate.raw);
      if (corrected === candidate.raw) continue;
      const replacement = renderTarget(candidate.target, corrected);
      if (replacement == null) continue;
      const start = candidate.target.getStart(sourceFile);
      const end = candidate.target.getEnd();
      const key = `${start}:${end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      replacements.push({ start, end, replacement });
    }

    if (replacements.length) {
      replacements.sort((a, b) => b.start - a.start);
      for (const item of replacements) {
        source = `${source.slice(0, item.start)}${item.replacement}${source.slice(item.end)}`;
      }
      fs.writeFileSync(file, source, "utf8");
      fixedFiles += 1;
      fixedTexts += replacements.length;
    }
    continue;
  }

  for (const candidate of candidates) {
    textCount += 1;
    const corrected = correctedCopy(candidate.raw);
    if (corrected !== candidate.raw) {
      errors.push(`${rel}:${lineOf(sourceFile, candidate.node)} texto visual fora do padrão PT-BR: \"${candidate.text}\".`);
    }
  }

  function visit(node) {
    const opening = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
        ? node
        : null;

    if (opening) {
      const tag = jsxTagName(opening);
      if (tag === "button" || tag === "Button") {
        buttonCount += 1;
        const attrs = jsxAttributes(opening);
        const onClick = attrs.get("onClick");
        const formAction = attrs.get("formAction");
        const type = literalText(jsxAttributeTarget(attrs.get("type")));
        const disabled = attrs.has("disabled");
        const isPrimitiveDefinition = rel === "apps/app-profissional-vite/src/components/ui/Button.tsx";
        const inForm = Boolean(
          closestAncestor(
            node,
            (ancestor) => ts.isJsxElement(ancestor) && jsxTagName(ancestor.openingElement) === "form"
          )
        );
        const label = ts.isJsxElement(node) ? buttonLabel(node, sourceFile) : "";

        if (!isPrimitiveDefinition && !disabled && !onClick && !formAction && type !== "submit" && !inForm) {
          errors.push(`${rel}:${lineOf(sourceFile, opening)} botão sem ação explícita${label ? ` (\"${label}\")` : ""}.`);
        }

        if (!disabled && !onClick && !formAction && !type && inForm) {
          warnings.push(`${rel}:${lineOf(sourceFile, opening)} botão usa submit implícito${label ? ` (\"${label}\")` : ""}; prefira type=\"submit\".`);
        }

        if (onClick) {
          const clickText = onClick.getText(sourceFile);
          if (/=>\s*\{\s*\}/.test(clickText)) {
            errors.push(`${rel}:${lineOf(sourceFile, onClick)} botão possui onClick vazio${label ? ` (\"${label}\")` : ""}.`);
          }
          if (/async\s*\(/.test(clickText) || /async\s+/.test(clickText)) {
            if (!attrs.has("disabled") && !attrs.has("loading")) {
              warnings.push(`${rel}:${lineOf(sourceFile, opening)} ação assíncrona sem loading/disabled visível${label ? ` (\"${label}\")` : ""}.`);
            }
          }
        }
      }
    }

    if (ts.isJsxExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      if (node.expression.name.text === "status") {
        warnings.push(`${rel}:${lineOf(sourceFile, node)} status bruto exibido; prefira rótulo PT-BR centralizado.`);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

if (FIX) {
  console.log(`[ui-ptbr] ${fixedTexts} textos corrigidos com segurança em ${fixedFiles} arquivos visuais.`);
  process.exit(0);
}

console.log(`[ui-audit] ${files.length} arquivos, ${buttonCount} botões e ${textCount} textos visuais analisados.`);

if (warnings.length) {
  console.log(`\n[ui-audit] AVISOS (${warnings.length})`);
  for (const warning of [...new Set(warnings)].slice(0, 250)) console.log(`- ${warning}`);
}

if (errors.length) {
  console.error(`\n[ui-audit] ERROS (${errors.length})`);
  for (const error of [...new Set(errors)].slice(0, 300)) console.error(`- ${error}`);
  console.error("\nCorrija os botões acima antes de promover a interface.");
  process.exit(1);
}

console.log("[ui-audit] OK: sem botão morto ou texto PT-BR conhecido incorreto nas superfícies auditadas.");
