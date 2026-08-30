import "server-only";

import crypto from "node:crypto";
import { normalizeCpf } from "@/lib/client-app/identity";
import { queryNeonDirect } from "@/lib/neon/direct.server";

const CPF_WINDOW_MINUTES = 10;
const CPF_MAX_ATTEMPTS = 5;
const IP_WINDOW_MINUTES = 10;
const IP_MAX_ATTEMPTS = 20;

function identitySecret() {
  const configured = String(
    process.env.CLIENT_APP_IDENTITY_HASH_SECRET || ""
  ).trim();

  if (configured.length >= 16) return configured;

  if (process.env.NODE_ENV === "development") {
    return "salaopremium-local-dev-identity-secret";
  }

  throw new Error(
    "CLIENT_APP_IDENTITY_HASH_SECRET não configurada ou muito curta."
  );
}

export function buildClienteCpfIdentityKey(cpfInput: string) {
  const cpf = normalizeCpf(cpfInput);
  const digest = crypto
    .createHmac("sha256", identitySecret())
    .update(cpf)
    .digest("hex");

  return `cpf:${digest}`;
}

function since(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export async function assertClienteCpfLoginAllowed(params: {
  cpf: string;
  ip?: string | null;
}) {
  if (process.env.NODE_ENV === "development") {
    return {
      allowed: true,
      attemptsByCpf: 0,
      attemptsByIp: 0,
      retryAfterSeconds: 0,
    };
  }

  const identityKey = buildClienteCpfIdentityKey(params.cpf);
  const ip = String(params.ip || "").trim();

  const [identityResult, ipResult] = await Promise.all([
    queryNeonDirect<{ count: number }>(
      `select count(*)::int as count
         from public.security_login_attempts
        where tipo_usuario::text = 'cliente'
          and identidade::text = $1::text
          and criado_em >= $2::timestamptz`,
      [identityKey, since(CPF_WINDOW_MINUTES)]
    ),
    ip
      ? queryNeonDirect<{ count: number }>(
          `select count(*)::int as count
             from public.security_login_attempts
            where tipo_usuario::text = 'cliente'
              and ip::text = $1::text
              and criado_em >= $2::timestamptz`,
          [ip, since(IP_WINDOW_MINUTES)]
        )
      : Promise.resolve({ rows: [{ count: 0 }] } as any),
  ]);

  const attemptsByCpf = Number(identityResult.rows[0]?.count || 0);
  const attemptsByIp = Number(ipResult.rows[0]?.count || 0);

  const allowed =
    attemptsByCpf < CPF_MAX_ATTEMPTS &&
    attemptsByIp < IP_MAX_ATTEMPTS;

  return {
    allowed,
    attemptsByCpf,
    attemptsByIp,
    retryAfterSeconds: allowed ? 0 : CPF_WINDOW_MINUTES * 60,
  };
}
