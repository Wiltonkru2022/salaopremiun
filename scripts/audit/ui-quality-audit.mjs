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
  [/(^|\b)almoco(\b|$)/g, "$1almoço$2"],
  [/(^|\b)Terca(\b|$)/g, "$1Terça$2"],
  [/(^|\b)terca(\b|$)/g, "$1terça$2"],
  [/(^|\b)Sabado(\b|$)/g, "$1Sábado$2"],
  [/(^|\b)sabado(\b|$)/g, "$1sábado$2"],
  [/(^|\b)Inicio(\b|$)/g, "$1Início$2"],
  [/(^|\b)inicio(\b|$)/g, "$1início$2"],
  [/(^|\b)Rapido(\b|$)/g, "$1Rápido$2"],
  [/(^|\b)rapido(\b|$)/g, "$1rápido$2"],
  [/(^|\b)Tecnica(\b|$)/g, "$1Técnica$2"],
  [/(^|\b)tecnica(\b|$)/g, "$1técnica$2"],
  [/(^|\b)Concluido(\b|$)/g, "$1Concluído$2"],
  [/(^|\b)concluido(\b|$)/g, "$1concluído$2"],
  [/(^|\b)Contratacao(\b|$)/g, "$1Contratação$2"],
  [/(^|\b)contratacao(\b|$)/g, "$1contratação$2"],
  [/(^|\b)Interrupcao(\b|$)/g, "$1Interrupção$2"],
  [/(^|\b)interrupcao(\b|$)/g, "$1interrupção$2"],
  [/(^|\b)Aparecera(\b|$)/g, "$1Aparecerá$2"],
  [/(^|\b)aparecera(\b|$)/g, "$1aparecerá$2"],
  [/(^|\b)Conferencia(\b|$)/g, "$1Conferência$2"],
  [/(^|\b)conferencia(\b|$)/g, "$1conferência$2"],
  [/(^|\b)Dashboard(\b|$)/g, "$1Visão geral$2"],
];

const canonicalBrand = "Salão Premiun";
const brandVariants = [
  "Salão Premium",
  "Salao Premium",
  "Salao Premiun",
  "SalãoPremium",
  "SalaoPremium",
];

function walkDirectory(dir, files) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDirectory(fullPath, files);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
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
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
}

function propertyNameText(node) {
  if (!node) return "";
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
  return node.getText();
}

function jsxTagName(opening) {
  return opening.tagName?.getText?.() || "";
}

function jsxAttributes(opening) {
  const attrs = new Map();
  for (const prop of opening.attributes?.properties || []) {
    if (ts.isJsxAttribute(prop)) attrs.set(prop.name.getText(), prop);
  }
  return attrs;
}

function jsxAttributeTarget(attr) {
  if (!attr?.initializer) return null;
  if (ts.isStringLiteral(attr.initializer)) return attr.initializer;
  if (
    ts.isJsxExpression(attr.initializer) &&
    attr.initializer.expression &&
    (ts.isStringLiteral(attr.initializer.expression) ||
      ts.isNoSubstitutionTemplateLiteral(attr.initializer.expression))
  ) {
    return attr.initializer.expression;
  }
  return null;
}

function closestAncestor(node, predicate) {
  let current = node.parent;
  while (current) {
    if (predicate(current)) return current;
    current = current.parent;
  }
  return null;
}

function insideForm(node) {
  return Boolean(
    closestAncestor(
      node,
      (ancestor) =>
        ts.isJsxElement(ancestor) && jsxTagName(ancestor.openingElement) === "form"
    )
  );
}

function collectVisibleCandidates(sourceFile) {
  const candidates = [];

  function push(node, target, value) {
    if (!target) return;
    const raw = String(value ?? "");
    const text = normalizeText(raw);
    if (!text || !/[A-Za-zÀ-ÿ]/.test(text)) return;
    candidates.push({ node, target, raw, text });
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      push(node, node, node.getText(sourceFile));
    }

    if (ts.isJsxAttribute(node) && visibleAttributeNames.has(node.name.getText())) {
      const target = jsxAttributeTarget(node);
      const value = literalText(target);
      if (value !== null) push(node, target, value);
    }

    if (ts.isPropertyAssignment(node)) {
      const name = propertyNameText(node.name);
      if (visiblePropertyNames.has(name)) {
        const value = literalText(node.initializer);
        if (value !== null) push(node, node.initializer, value);
      }
    }

    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer) &&
      /^(dias|items|steps|tabs|options|navItems)$/i.test(node.name.text)
    ) {
      for (const element of node.initializer.elements) {
        const value = literalText(element);
        if (value !== null) push(element, element, value);
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      /^(setError|setErro|setOk|setSuccess|setMessage|setMensagem|alert)$/.test(
        node.expression.text
      )
    ) {
      const target = node.arguments[0];
      const value = literalText(target);
      if (value !== null) push(target, target, value);
    }

    if (ts.isNewExpression(node) && node.expression.getText(sourceFile) === "Error") {
      const target = node.arguments?.[0];
      const value = literalText(target);
      if (value !== null) push(target, target, value);
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
      (ts.isStringLiteral(child.expression) ||
        ts.isNoSubstitutionTemplateLiteral(child.expression))
    ) {
      parts.push(child.expression.text);
    }
  }
  return normalizeText(parts.join(" "));
}

function correctedCopy(raw) {
  let value = String(raw ?? "");
  for (const variant of brandVariants) {
    value = value.split(variant).join(canonicalBrand);
  }
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
      .split("\\").join("\\\\")
      .split("`").join("\\`")
      .split("${").join("\\${");
    return `\`${escaped}\``;
  }
  return null;
}

function isDirectlyRenderedStatus(node) {
  if (!ts.isJsxExpression(node) || !node.expression) return false;
  if (!ts.isPropertyAccessExpression(node.expression)) return false;
  if (node.expression.name.text !== "status") return false;
  return ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent);
}

const files = [];
for (const target of TARGETS) {
  walkDirectory(path.join(ROOT, target), files);
}

const errors = [];
const warnings = [];
let buttonCount = 0;
let textCount = 0;
let fixedFiles = 0;
let fixedTexts = 0;

for (const file of files) {
  let source = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const scriptKind =
    file.endsWith(".tsx") || file.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );
  const candidates = collectVisibleCandidates(sourceFile);

  if (FIX) {
    const replacements = [];
    const seen = new Set();

    for (const candidate of candidates) {
      const corrected = correctedCopy(candidate.raw);
      if (corrected === candidate.raw) continue;
      const replacement = renderTarget(candidate.target, corrected);
      if (replacement === null) continue;

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
    if (correctedCopy(candidate.raw) !== candidate.raw) {
      errors.push(
        `${rel}:${lineOf(sourceFile, candidate.node)} texto visual fora do padrão PT-BR: "${candidate.text}".`
      );
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
        const loading = attrs.has("loading");
        const inForm = insideForm(node);
        const isPrimitiveDefinition =
          rel === "apps/app-profissional-vite/src/components/ui/Button.tsx";
        const label = ts.isJsxElement(node) ? buttonLabel(node, sourceFile) : "";
        const labelSuffix = label ? ` ("${label}")` : "";

        if (
          !isPrimitiveDefinition &&
          !disabled &&
          !onClick &&
          !formAction &&
          type !== "submit" &&
          !inForm
        ) {
          errors.push(
            `${rel}:${lineOf(sourceFile, opening)} botão sem ação explícita${labelSuffix}.`
          );
        }

        if (!disabled && !onClick && !formAction && !type && inForm) {
          warnings.push(
            `${rel}:${lineOf(sourceFile, opening)} botão usa submit implícito${labelSuffix}; prefira type="submit".`
          );
        }

        if (onClick) {
          const clickText = onClick.getText(sourceFile);
          if (/=>\s*\{\s*\}/.test(clickText)) {
            errors.push(
              `${rel}:${lineOf(sourceFile, onClick)} botão possui onClick vazio${labelSuffix}.`
            );
          }
          if (
            (/async\s*\(/.test(clickText) || /async\s+/.test(clickText)) &&
            !disabled &&
            !loading
          ) {
            warnings.push(
              `${rel}:${lineOf(sourceFile, opening)} ação assíncrona sem loading/disabled visível${labelSuffix}.`
            );
          }
        }
      }
    }

    if (isDirectlyRenderedStatus(node)) {
      warnings.push(
        `${rel}:${lineOf(sourceFile, node)} status bruto exibido; prefira rótulo PT-BR centralizado.`
      );
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

if (FIX) {
  console.log(
    `[ui-ptbr] ${fixedTexts} textos corrigidos com segurança em ${fixedFiles} arquivos visuais.`
  );
  process.exit(0);
}

console.log(
  `[ui-audit] ${files.length} arquivos, ${buttonCount} botões e ${textCount} textos visuais analisados.`
);

const uniqueWarnings = [...new Set(warnings)];
const uniqueErrors = [...new Set(errors)];

if (uniqueWarnings.length) {
  console.log(`\n[ui-audit] AVISOS (${uniqueWarnings.length})`);
  for (const warning of uniqueWarnings.slice(0, 250)) {
    console.log(`- ${warning}`);
  }
}

if (uniqueErrors.length) {
  console.error(`\n[ui-audit] ERROS (${uniqueErrors.length})`);
  for (const error of uniqueErrors.slice(0, 300)) {
    console.error(`- ${error}`);
  }
  console.error("\nCorrija os botões acima antes de promover a interface.");
  process.exit(1);
}

console.log(
  "[ui-audit] OK: sem botão morto ou texto PT-BR conhecido incorreto nas superfícies auditadas."
);
