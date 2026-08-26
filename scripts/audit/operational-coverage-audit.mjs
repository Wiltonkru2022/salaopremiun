import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const registryPath = path.join(root, "config", "operational-components.json");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const components = registry.components || [];

const IGNORED_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage", ".vercel"]);
const codeExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const output = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...walk(full));
    else if (codeExtensions.has(path.extname(entry.name))) output.push(full);
  }
  return output;
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function globToRegExp(glob) {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "§§DOUBLE§§")
    .replace(/\*/g, "[^/]*")
    .replace(/§§DOUBLE§§/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

function routeFromAppPath(file) {
  const rel = relative(file);
  if (!rel.startsWith("app/")) return null;
  const parts = rel.split("/").slice(1, -1).filter((part) => !/^\(.+\)$/.test(part));
  return `/${parts.map((part) => (part.startsWith("[") ? ":param" : part)).join("/")}`.replace(/\/$/, "") || "/";
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function classifySurface(file, content) {
  const rel = relative(file).toLowerCase();
  if (rel.startsWith("app/api/cron/")) return "jobs";
  if (/webhook/.test(rel) || /webhook/i.test(content)) return "webhooks";
  if (/asaas|payment|pagamento|checkout|assinatura/.test(rel) || /asaas|billing|payment/i.test(content)) return "payments";
  if (/auth|login|session|senha|password/.test(rel) || /auth\.|session|verifyPassword/i.test(content)) return "auth";
  if (rel.startsWith("app/api/")) return "api";
  if (/database|migration|rpc|\.from\(/i.test(content) && !rel.startsWith("app/")) return "database";
  if (/integrac|google-calendar|brevo|whatsapp|push|vapid/.test(rel)) return "integrations";
  if (rel.startsWith("app/")) return "frontend";
  return "backend";
}

function isCritical(file, content) {
  const rel = relative(file).toLowerCase();
  const isRoute = /\/route\.(ts|js)$/.test(rel);
  const mutating = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b|\b(use server|server action)\b|\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/i.test(content);
  const highRiskDomain = /auth|login|session|senha|password|asaas|payment|pagamento|checkout|webhook|cron|security|agenda|agendamento|comanda|caixa|assinatura|cobranca|cobrança/i.test(`${rel} ${content.slice(0, 5000)}`);
  const criticalPage = /app\/(?:app-cliente|app-profissional)\/(?:login|agenda|agendamentos)|app\/\(painel\)\/(?:agenda|caixa|comandas)|admin-master\/saude/i.test(rel);
  return (isRoute && (mutating || highRiskDomain)) || criticalPage;
}

function inferredDomainKeys(file, content, route) {
  const rel = relative(file).toLowerCase();
  const haystack = `${rel} ${route || ""} ${content.slice(0, 8000).toLowerCase()}`;
  const keys = new Set();

  if (/app-cliente/.test(haystack) && /login|auth|session/.test(haystack)) keys.add("client.auth");
  if (/app-cliente/.test(haystack) && /agend|disponib/.test(haystack)) keys.add("client.appointments");
  if (/app-profissional/.test(haystack) && /login|auth|session/.test(haystack)) keys.add("professional.auth");
  if (/app-profissional/.test(haystack) && /agend/.test(haystack)) keys.add("professional.agenda");
  if (/\bagenda|agendamento/.test(haystack)) keys.add("agenda.core");
  if (/cliente|crm/.test(haystack)) keys.add("crm.core");
  if (/servico|serviço/.test(haystack)) keys.add("services.core");
  if (/caixa|comanda|venda/.test(haystack)) keys.add("cash.core");
  if (/assinatura|checkout|cobranca|cobrança/.test(haystack)) keys.add("subscriptions.core");
  if (/asaas/.test(haystack)) keys.add(/webhook/.test(haystack) ? "integration.asaas.webhooks" : "integration.asaas.api");
  if (/brevo|email/.test(haystack)) keys.add("communication.brevo");
  if (/whatsapp|meta_whatsapp/.test(haystack)) keys.add("communication.whatsapp");
  if (/push|vapid/.test(haystack)) keys.add("communication.push_vapid");
  if (/google-calendar|google_calendar/.test(haystack)) keys.add("integration.google_calendar");
  if (/cron|eventos_cron/.test(haystack)) keys.add("automation.cron");
  if (/admin-master/.test(haystack)) keys.add("admin.master");
  if (/database|\.from\(|\.rpc\(/.test(haystack)) keys.add("database.database");

  return [...keys];
}

function directMatches(file, content, route) {
  const rel = relative(file);
  return components.filter((component) => {
    const sourceMatch = (component.sourcePatterns || []).some((pattern) => globToRegExp(pattern).test(rel));
    const routeMatch = route && (component.routePrefixes || []).some((prefix) => route.startsWith(prefix));
    const contentMatch = (component.contentSignals || []).some((signal) => content.includes(signal));
    return sourceMatch || routeMatch || contentMatch;
  });
}

function hasInstrumentation(content) {
  return /captureSystem(Event|Error|Metric)|monitorClientOperation|runMonitoredServerOperation|observeOperationalFailure|upsertSystemHealthCheck|runAdminOperation/i.test(content);
}

const files = [
  ...walk(path.join(root, "app")),
  ...walk(path.join(root, "apps")),
  ...walk(path.join(root, "lib")),
  ...walk(path.join(root, "services")),
  ...walk(path.join(root, "core")),
].filter((file) => !/\.test\.[^.]+$/.test(file));

const findings = [];
for (const file of files) {
  const rel = relative(file);
  const base = path.basename(file);
  if (!/(page|route|actions?)\.(ts|tsx|js|jsx)$/.test(base) && !/service|integration|webhook|cron|auth|payment|push|monitor/i.test(rel)) continue;
  const content = read(file);
  const route = routeFromAppPath(file);
  const critical = isCritical(file, content);
  const surface = classifySurface(file, content);
  const matches = directMatches(file, content, route);
  const inferred = inferredDomainKeys(file, content, route);
  const domainComponents = inferred
    .map((key) => components.find((component) => component.componentKey === key))
    .filter(Boolean);
  const candidates = [...new Map([...matches, ...domainComponents].map((component) => [component.componentKey, component])).values()];
  const specific = candidates.filter((component) => component.componentKey !== "platform.api" && component.componentKey !== "platform.site");
  const observable = hasInstrumentation(content) || specific.some((component) => component.probeKey || component.monitoringMode === "telemetry");

  findings.push({ rel, route, critical, surface, observable, components: specific.map((component) => component.componentKey) });
}

const criticalUncovered = findings.filter((finding) => finding.critical && !finding.observable);
const surfaceSummary = {};
for (const finding of findings) {
  const current = surfaceSummary[finding.surface] || { detected: 0, covered: 0, critical: 0, criticalCovered: 0 };
  current.detected += 1;
  if (finding.observable) current.covered += 1;
  if (finding.critical) current.critical += 1;
  if (finding.critical && finding.observable) current.criticalCovered += 1;
  surfaceSummary[finding.surface] = current;
}

const registered = components.length;
const withMonitor = components.filter((component) => component.probeKey || component.monitoringMode === "telemetry").length;
const criticalRegistered = components.filter((component) => component.criticality === "critical");
const criticalWithMonitor = criticalRegistered.filter((component) => component.probeKey || component.monitoringMode === "telemetry").length;

console.log("\nOperational coverage audit");
console.log(`Registry version: ${registry.version}`);
console.log(`Registered components: ${registered}`);
console.log(`Components with probe/telemetry: ${withMonitor}/${registered}`);
console.log(`Critical registry coverage: ${criticalWithMonitor}/${criticalRegistered.length}`);
console.table(surfaceSummary);

if (criticalUncovered.length) {
  console.error("\nCritical surfaces without specific operational coverage:");
  for (const finding of criticalUncovered.slice(0, 100)) {
    console.error(`- ${finding.rel}${finding.route ? ` (${finding.route})` : ""}`);
  }
  console.error(`\nFAILED: ${criticalUncovered.length} critical surface(s) have no specific probe/telemetry.`);
  process.exit(1);
}

const uncoveredNonCritical = findings.filter((finding) => !finding.critical && !finding.observable);
if (uncoveredNonCritical.length) {
  console.warn(`\nWarning: ${uncoveredNonCritical.length} non-critical surface(s) remain without specific coverage.`);
}

console.log("\nPASS: every detected critical surface has a specific operational component/probe or direct instrumentation.");
