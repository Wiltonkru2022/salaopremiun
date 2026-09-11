import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const MAX_BYTES = 1_000_000;
const ALLOWED_ENV_EXAMPLES = new Set([".env.example"]);

const binaryExtensions = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz",
  ".mp4", ".mov", ".avi", ".woff", ".woff2", ".ttf", ".eot"
]);

const secretPatterns = [
  { name: "Supabase secret key", regex: /\bsb_secret_[A-Za-z0-9._-]{16,}/g },
  { name: "Brevo API key", regex: /\bxkeysib-[A-Za-z0-9_-]{20,}/g },
  { name: "OpenAI API key", regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/g },
  { name: "GitHub token", regex: /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{20,}/g },
  { name: "Google API key", regex: /\bAIza[0-9A-Za-z_-]{30,}/g },
  { name: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/g },
];

const sensitiveAssignments = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "BREVO_API_KEY",
  "ASAAS_API_KEY",
  "OPENAI_API_KEY",
  "GOOGLE_CALENDAR_CLIENT_SECRET",
  "WEB_PUSH_PRIVATE_KEY",
  "CRON_SECRET",
  "PASSWORD_REUSE_SECRET",
  "PROFISSIONAL_SESSION_SECRET",
  "CLIENT_APP_RECOVERY_SECRET",
  "ASAAS_WEBHOOK_TOKEN",
  "BLOG_WEBHOOK_SECRET",
];

function extension(path) {
  const index = path.lastIndexOf(".");
  return index >= 0 ? path.slice(index).toLowerCase() : "";
}

function looksLikeTemplate(value) {
  return (
    !value ||
    value === "''" ||
    value === '""' ||
    value.includes("${{") ||
    value.includes("process.env") ||
    value.includes("import.meta.env") ||
    /^<[^>]+>$/.test(value) ||
    /^(changeme|example|placeholder|your[_-])/i.test(value)
  );
}

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const findings = [];

for (const file of files) {
  if (binaryExtensions.has(extension(file))) continue;

  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    continue;
  }
  if (size > MAX_BYTES) continue;

  let content = "";
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const pattern of secretPatterns) {
    pattern.regex.lastIndex = 0;
    for (const match of content.matchAll(pattern.regex)) {
      const line = content.slice(0, match.index).split("\n").length;
      findings.push({ file, line, kind: pattern.name });
    }
  }

  if (!ALLOWED_ENV_EXAMPLES.has(file)) {
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index].trim();
      for (const name of sensitiveAssignments) {
        const match = line.match(new RegExp(`^${name}\\s*=\\s*(.+)$`));
        if (!match) continue;
        const value = match[1].trim();
        if (!looksLikeTemplate(value)) {
          findings.push({ file, line: index + 1, kind: `${name} preenchida` });
        }
      }
    }
  }
}

if (findings.length) {
  console.error("[security] Possiveis segredos encontrados em arquivos versionados:");
  for (const finding of findings) {
    console.error(`- ${finding.kind}: ${finding.file}:${finding.line}`);
  }
  console.error("Remova o segredo do repositorio e rotacione a credencial antes de publicar.");
  process.exit(1);
}

console.log(`[security] OK: ${files.length} arquivos versionados verificados sem segredo conhecido exposto.`);
