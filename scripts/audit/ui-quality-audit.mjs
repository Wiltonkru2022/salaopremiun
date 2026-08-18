import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const ROOT = process.cwd();
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
  [/(^|\b)Nao(\b|$)/g, "Não"],
  [/(^|\b)nao(\b|$)/g, "não"],
  [/(^|\b)possivel(\b|$)/g, "possível"],
  [/(^|\b)Proxima(\b|$)/g, "Próxima"],
  [/(^|\b)proxima(\b|$)/g, "próxima"],
  [/(^|\b)Proximo(\b|$)/g, "Próximo"],
  [/(^|\b)proximo(\b|$)/g, "próximo"],
  [/(^|\b)Servico(\b|$)/g, "Serviço"],
  [/(^|\b)servico(\b|$)/g, "serviço"],
  [/(^|\b)Servicos(\b|$)/g, "Serviços"],
  [/(^|\b)servicos(\b|$)/g, "serviços"],
  [/(^|\b)Configuracoes(\b|$)/g, "Configurações"],
  [/(^|\b)configuracoes(\b|$)/g, "configurações"],
  [/(^|\b)Horario(\b|$)/g, "Horário"],
  [/(^|\b)horario(\b|$)/g, "horário"],
  [/(^|\b)Horarios(\b|$)/g, "Horários"],
  [/(^|\b)horarios(\b|$)/g, "horários"],
  [/(^|\b)Historico(\b|$)/g, "Histórico"],
  [/(^|\b)historico(\b|$)/g, "histórico"],
  [/(^|\b)Observacao(\b|$)/g, "Observação"],
  [/(^|\b)observacao(\b|$)/g, "observação"],
  [/(^|\b)Observacoes(\b|$)/g, "Observações"],
  [/(^|\b)observacoes(\b|$)/g, "observações"],
  [/(^|\b)Informacoes(\b|$)/g, "Informações"],
  [/(^|\b)informacoes(\b|$)/g, "informações"],
  [/(^|\b)Avaliacao(\b|$)/g, "Avaliação"],
  [/(^|\b)avaliacao(\b|$)/g, "avaliação"],
  [/(^|\b)Avaliacoes(\b|$)/g, "Avaliações"],
  [/(^|\b)avaliacoes(\b|$)/g, "avaliações"],
  [/(^|\b)Comentario(\b|$)/g, "Comentário"],
  [/(^|\b)comentario(\b|$)/g, "comentário"],
  [/(^|\b)Comentarios(\b|$)/g, "Comentários"],
  [/(^|\b)comentarios(\b|$)/g, "comentários"],
  [/(^|\b)Comissao(\b|$)/g, "Comissão"],
  [/(^|\b)comissao(\b|$)/g, "comissão"],
  [/(^|\b)Comissoes(\b|$)/g, "Comissões"],
  [/(^|\b)comissoes(\b|$)/g, "comissões"],
  [/(^|\b)Producao(\b|$)/g, "Produção"],
  [/(^|\b)producao(\b|$)/g, "produção"],
  [/(^|\b)Operacao(\b|$)/g, "Operação"],
  [/(^|\b)operacao(\b|$)/g, "operação"],
  [/(^|\b)Unitario(\b|$)/g, "Unitário"],
  [/(^|\b)unitario(\b|$)/g, "unitário"],
  [/(^|\b)Credito(\b|$)/g, "Crédito"],
  [/(^|\b)credito(\b|$)/g, "crédito"],
  [/(^|\b)Almoco(\b|$)/g, "Almoço"],
  [/(^|\b)Terca(\b|$)/g, "Terça"],
  [/(^|\b)Sabado(\b|$)/g, "Sábado"],
  [/(^|\b)Inicio(\b|$)/g, "Início"],
  [/(^|\b)Dashboard(\b|$)/g, "Visão geral"],
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

function jsxAttributeString(attr) {
  if (!attr?.initializer) return null;
  if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text;
  if (
    ts.isJsxExpression(attr.initializer) &&
    attr.initializer.expression &&
    (ts.isStringLiteral(attr.initializer.expression) || ts.isNoSubstitutionTemplateLiteral(attr.initializer.expression))
  ) {
    return attr.initializer.expression.text;
  }
  return null;
}

function collectVisibleCandidates(sourceFile) {
  const candidates = [];
  const push = (node, value, kind) => {
    const text = normalizeText(value);
    if (!text || !/[A-Za-zÀ-ÿ]/.test(text)) return;
    candidates.push({ node, text, kind });
  };

  function visit(node) {
    if (ts.isJsxText(node)) push(node, node.getText(sourceFile), "jsx");

    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText();
      if (visibleAttributeNames.has(name)) {
        const value = jsxAttributeString(node);
        if (value != null) push(node, value, `attr:${name}`);
      }
    }

    if (ts.isPropertyAssignment(node)) {
      const name = propertyNameText(node.name);
      if (visiblePropertyNames.has(name)) {
        const value = literalText(node.initializer);
        if (value != null) push(node, value, `prop:${name}`);
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
          if (value != null) push(element, value, `array:${node.name.text}`);
        }
      }
    }

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (/^(setError|setErro|setOk|setSuccess|setMessage|setMensagem|alert)$/.test(node.expression.text)) {
        const value = node.arguments[0] ? literalText(node.arguments[0]) : null;
        if (value != null) push(node.arguments[0], value, `call:${node.expression.text}`);
      }
    }

    if (ts.isNewExpression(node) && node.expression.getText(sourceFile) === "Error") {
      const value = node.arguments?.[0] ? literalText(node.arguments[0]) : null;
      if (value != null) push(node.arguments[0], value, "error");
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

const files = [];
for (const target of TARGETS) walkDirectory(path.join(ROOT, target), files);

const errors = [];
const warnings = [];
let buttonCount = 0;
let textCount = 0;

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file).replaceAll(path.sep, "/");
  const scriptKind = file.endsWith(".tsx") || file.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind);

  for (const candidate of collectVisibleCandidates(sourceFile)) {
    textCount += 1;
    for (const variant of brandVariants) {
      if (candidate.text.includes(variant)) {
        errors.push(`${rel}:${lineOf(sourceFile, candidate.node)} marca visual \"${variant}\"; use \"${canonicalBrand}\".`);
      }
    }
    for (const [pattern, replacement] of copyRules) {
      pattern.lastIndex = 0;
      if (pattern.test(candidate.text)) {
        errors.push(`${rel}:${lineOf(sourceFile, candidate.node)} texto fora do PT-BR: \"${candidate.text}\"; revise para \"${replacement}\".`);
        break;
      }
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
        const type = jsxAttributeString(attrs.get("type"));
        const inForm = Boolean(
          closestAncestor(
            node,
            (ancestor) => ts.isJsxElement(ancestor) && jsxTagName(ancestor.openingElement) === "form"
          )
        );
        const label = ts.isJsxElement(node) ? buttonLabel(node, sourceFile) : "";

        if (!onClick && !formAction && type !== "submit" && !inForm) {
          errors.push(`${rel}:${lineOf(sourceFile, opening)} botão sem ação explícita${label ? ` (\"${label}\")` : ""}.`);
        }

        if (!onClick && !formAction && !type && inForm) {
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

console.log(`[ui-audit] ${files.length} arquivos, ${buttonCount} botões e ${textCount} textos visuais analisados.`);

if (warnings.length) {
  console.log(`\n[ui-audit] AVISOS (${warnings.length})`);
  for (const warning of [...new Set(warnings)].slice(0, 250)) console.log(`- ${warning}`);
}

if (errors.length) {
  console.error(`\n[ui-audit] ERROS (${errors.length})`);
  for (const error of [...new Set(errors)].slice(0, 300)) console.error(`- ${error}`);
  console.error("\nCorrija os textos/botões acima antes de promover a interface.");
  process.exit(1);
}

console.log("[ui-audit] OK: sem botão morto ou texto PT-BR conhecido incorreto nas superfícies auditadas.");
