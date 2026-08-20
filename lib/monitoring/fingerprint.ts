import { createHash } from "node:crypto";

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const ISO_DATE_RE = /\b\d{4}-\d{2}-\d{2}(?:[T ][0-9:.+-]+Z?)?\b/g;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const LONG_NUMBER_RE = /\b\d{8,}\b/g;
const JWTISH_RE = /\beyJ[A-Za-z0-9_-]{20,}(?:\.[A-Za-z0-9_-]{10,}){1,2}\b/g;
const HEX_TOKEN_RE = /\b[a-f0-9]{24,}\b/gi;

export function normalizeRouteForFingerprint(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const pathname = raw.split("?")[0].split("#")[0];
  return pathname
    .replace(UUID_RE, ":uuid")
    .split("/")
    .map((part) => {
      if (/^\d{4,}$/.test(part)) return ":id";
      if (/^[A-Za-z0-9_-]{20,}$/.test(part)) return ":token";
      return part;
    })
    .join("/") || "/";
}

export function sanitizeOperationalText(value?: string | null) {
  return String(value || "")
    .replace(EMAIL_RE, "<email>")
    .replace(UUID_RE, "<uuid>")
    .replace(ISO_DATE_RE, "<timestamp>")
    .replace(JWTISH_RE, "<token>")
    .replace(HEX_TOKEN_RE, "<token>")
    .replace(LONG_NUMBER_RE, "<id>")
    .replace(/([?&](?:token|key|secret|code|signature|authorization)=)[^&\s]+/gi, "$1<redacted>")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, 500);
}

export function topRelevantStackFrame(value?: string | null) {
  const frame = String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.includes("node_modules") && !line.includes("next/dist"));
  return sanitizeOperationalText(frame || "-");
}

export function buildOperationalFingerprint(input: {
  componentKey?: string | null;
  module?: string | null;
  action?: string | null;
  route?: string | null;
  errorCode?: string | null;
  message?: string | null;
  stack?: string | null;
  dependency?: string | null;
}) {
  const canonical = [
    String(input.componentKey || "unknown").trim().toLowerCase(),
    String(input.module || "system").trim().toLowerCase(),
    String(input.action || "-").trim().toLowerCase(),
    normalizeRouteForFingerprint(input.route),
    String(input.errorCode || "unknown_operational_error").trim().toLowerCase(),
    sanitizeOperationalText(input.message),
    topRelevantStackFrame(input.stack),
    String(input.dependency || "-").trim().toLowerCase(),
  ].join("|");

  return createHash("sha256").update(canonical).digest("hex");
}
