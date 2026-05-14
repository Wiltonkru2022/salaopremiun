import { NextRequest, NextResponse } from "next/server";
import { registrarLogSistema } from "@/lib/system-logs";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RiscConfiguration = {
  issuer?: string;
  jwks_uri?: string;
};

type GoogleJsonWebKey = JsonWebKey & { kid?: string };

type JsonWebKeySet = {
  keys?: GoogleJsonWebKey[];
};

type SecurityEventPayload = {
  iss?: string;
  aud?: string | string[];
  iat?: number;
  jti?: string;
  events?: Record<string, unknown>;
};

const RISC_CONFIGURATION_URL =
  "https://accounts.google.com/.well-known/risc-configuration";

function base64UrlToBuffer(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  return Buffer.from(padded, "base64");
}

function decodeJwtPart<T>(value: string): T {
  return JSON.parse(base64UrlToBuffer(value).toString("utf8")) as T;
}

function getAllowedClientIds() {
  return [
    ...(process.env.GOOGLE_RISC_CLIENT_IDS || "").split(","),
    process.env.GOOGLE_CALENDAR_CLIENT_ID || "",
  ]
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeIssuer(value?: string) {
  return String(value || "").replace(/\/+$/, "");
}

async function extractSecurityEventToken(req: NextRequest) {
  const raw = (await req.text()).trim();
  const contentType = req.headers.get("content-type") || "";

  if (!raw) return "";

  if (contentType.includes("application/json") || raw.startsWith("{")) {
    const json = JSON.parse(raw) as { token?: string; jwt?: string };
    return String(json.token || json.jwt || "").trim();
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(raw);
    return String(params.get("token") || params.get("jwt") || "").trim();
  }

  return raw;
}

async function validateSecurityEventToken(token: string) {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("Token RISC malformado.");
  }

  const allowedClientIds = getAllowedClientIds();
  if (!allowedClientIds.length) {
    throw new Error("GOOGLE_RISC_CLIENT_IDS não configurado.");
  }

  const header = decodeJwtPart<{ kid?: string; alg?: string }>(encodedHeader);
  const payload = decodeJwtPart<SecurityEventPayload>(encodedPayload);

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Assinatura RISC inválida.");
  }

  const configResponse = await fetch(RISC_CONFIGURATION_URL, {
    cache: "force-cache",
  });
  const config = (await configResponse.json()) as RiscConfiguration;

  if (!config.issuer || !config.jwks_uri) {
    throw new Error("Configuração RISC do Google inválida.");
  }

  if (normalizeIssuer(payload.iss) !== normalizeIssuer(config.issuer)) {
    throw new Error("Emissor RISC inválido.");
  }

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud || ""];
  const audienceOk = aud.some((item) => allowedClientIds.includes(item));

  if (!audienceOk) {
    throw new Error("Audiência RISC inválida.");
  }

  const jwksResponse = await fetch(config.jwks_uri, { cache: "force-cache" });
  const jwks = (await jwksResponse.json()) as JsonWebKeySet;
  const jwk = jwks.keys?.find((item) => item.kid === header.kid);

  if (!jwk) {
    throw new Error("Chave pública RISC não encontrada.");
  }

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const verified = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlToBuffer(encodedSignature),
    Buffer.from(`${encodedHeader}.${encodedPayload}`, "utf8")
  );

  if (!verified) {
    throw new Error("Assinatura RISC não confere.");
  }

  return payload;
}

function extractSubject(payload: SecurityEventPayload) {
  const eventValues = Object.values(payload.events || {});
  const firstEvent = eventValues.find(
    (event) => event && typeof event === "object"
  ) as { subject?: Record<string, unknown> } | undefined;
  const subject = firstEvent?.subject || {};

  return {
    subjectType: String(subject.subject_type || ""),
    googleSub: String(subject.sub || ""),
    email: String(subject.email || "").toLowerCase(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const token = await extractSecurityEventToken(req);
    const payload = await validateSecurityEventToken(token);
    const eventTypes = Object.keys(payload.events || {});
    const subject = extractSubject(payload);

    if (
      subject.email &&
      eventTypes.some((type) => type.includes("token-revoked"))
    ) {
      await (getSupabaseAdmin() as any)
        .from("saloes_google_calendar_connections")
        .update({
          ativo: false,
          updated_at: new Date().toISOString(),
        })
        .eq("google_email", subject.email);
    }

    await registrarLogSistema({
      gravidade: "warning",
      modulo: "google_risc",
      mensagem: "Evento de segurança recebido do Google.",
      detalhes: {
        monitoring_event: true,
        jti: payload.jti || null,
        aud: payload.aud || null,
        event_types: eventTypes,
        subject_type: subject.subjectType || null,
        google_sub: subject.googleSub || null,
        email: subject.email || null,
      },
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    await registrarLogSistema({
      gravidade: "warning",
      modulo: "google_risc",
      mensagem: "Evento RISC rejeitado.",
      detalhes: {
        erro: error instanceof Error ? error.message : String(error),
      },
    });

    return NextResponse.json(
      { ok: false, error: "Token RISC inválido." },
      { status: 400 }
    );
  }
}
