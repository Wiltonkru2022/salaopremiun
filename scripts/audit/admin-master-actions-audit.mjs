import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();

const files = [
  "components/admin-master/AdminMasterModuleActionButton.tsx",
  "components/admin-master/AdminMasterRowActionButton.tsx",
  "components/admin-master/AdminMasterSalaoActions.tsx",
  "components/admin-master/AdminMasterWebhookReprocessButton.tsx",
];

function read(file) {
  return fs.readFileSync(path.join(cwd, file), "utf8");
}

function listPages() {
  const pages = new Set();

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      if (entry.isFile() && entry.name === "page.tsx") {
        pages.add(
          `/${path
            .relative(path.join(cwd, "app"), path.dirname(full))
            .replaceAll(path.sep, "/")
            .replace(/\(.+?\)\//g, "")}`
        );
      }
    }
  }

  walk(path.join(cwd, "app"));
  return pages;
}

function routePatternFromEndpoint(endpoint) {
  const clean = endpoint.replace(/\$\{encodeURIComponent\((.+?)\)\}/g, ":[id]");
  return clean
    .replace(/`/g, "")
    .replace(/\/api\//, "app/api/")
    .replace(/:\[id\]/g, "[id]");
}

function routeExists(endpoint) {
  const normalized = endpoint
    .replace(/`\s*\+\s*`/g, "")
    .replace(/\$\{encodeURIComponent\([^}]+\)\}/g, "__DYNAMIC__")
    .replace(/\$\{[^}]+\}/g, "__DYNAMIC__");

  const parts = normalized
    .replace(/^\/api\//, "")
    .split("/")
    .filter(Boolean);

  let dir = path.join(cwd, "app", "api");
  for (const part of parts) {
    if (part === "__DYNAMIC__") {
      const dynamic = fs
        .readdirSync(dir, { withFileTypes: true })
        .find((entry) => entry.isDirectory() && /^\[.+\]$/.test(entry.name));
      if (!dynamic) return false;
      dir = path.join(dir, dynamic.name);
      continue;
    }

    dir = path.join(dir, part);
    if (!fs.existsSync(dir)) return false;
  }

  return fs.existsSync(path.join(dir, "route.ts"));
}

const pages = listPages();
const findings = [];

for (const file of files) {
  const source = read(file);
  const endpoints = Array.from(source.matchAll(/endpoint:\s*([`"'])(.*?)\1/gs)).map(
    (match) => match[2]
  );
  const fetchEndpoints = Array.from(source.matchAll(/fetch\(\s*([`"'])(.*?)\1/gs)).map(
    (match) => match[2]
  );
  const hrefs = Array.from(source.matchAll(/href:\s*["']([^"']+)["']/g)).map(
    (match) => match[1]
  );

  for (const endpoint of [...endpoints, ...fetchEndpoints]) {
    if (!endpoint.startsWith("/api/")) continue;
    if (!routeExists(endpoint)) {
      findings.push({
        file,
        type: "endpoint_missing",
        value: endpoint,
        expected: routePatternFromEndpoint(endpoint),
      });
    }
  }

  for (const href of hrefs) {
    if (!href.startsWith("/admin-master")) continue;
    if (!pages.has(href)) {
      findings.push({
        file,
        type: "page_missing",
        value: href,
      });
    }
  }

  const hasFetch = /fetch\(/.test(source);
  if (hasFetch && !/router\.refresh\(\)/.test(source)) {
    findings.push({
      file,
      type: "missing_refresh",
      value: "fetch sem router.refresh",
    });
  }

  if (hasFetch && !/catch\s*\(/.test(source) && !/catch\s*\{/.test(source)) {
    findings.push({
      file,
      type: "missing_error_feedback",
      value: "fetch sem catch/feedback de erro",
    });
  }
}

if (findings.length) {
  console.error(JSON.stringify({ ok: false, findings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, auditedFiles: files.length }, null, 2));
