import crypto from "node:crypto";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { normalizeCpf } from "@/lib/client-app/identity";

const CPF_WINDOW_MINUTES = 10;
const CPF_MAX_ATTEMPTS = 5;
const IP_WINDOW_MINUTES = 10;
const IP_MAX_ATTEMPTS = 20;

function identitySecret() {
  return (
    process.env.CLIENT_APP_IDENTITY_HASH_SECRET ||
    process.env.CLIENTE_SESSION_SECRET ||
    process.env.PROFISSIONAL_SESSION_SECRET ||
    "salaopremium-identity"
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
  /*
   * Ambiente LOCAL:
   * durante desenvolvimento não bloqueia o programador por tentativas
   * anteriores, loops de sessão ou testes repetidos.
   *
   * Isso NÃO afeta produção, porque NODE_ENV será "production".
   */
  if (process.env.NODE_ENV === "development") {
    console.log("[CLIENTE_LOGIN_RATE_LIMIT:DEV_BYPASS]", {
      cpfFinal: normalizeCpf(params.cpf).slice(-4),
      ip: params.ip || null,
    });

    return {
      allowed: true,
      attemptsByCpf: 0,
      attemptsByIp: 0,
      retryAfterSeconds: 0,
    };
  }

  const database = getDatabaseAdmin();
  const identityKey = buildClienteCpfIdentityKey(params.cpf);

  const identityQuery = database
    .from("security_login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("tipo_usuario", "cliente")
    .eq("identidade", identityKey)
    .gte("criado_em", since(CPF_WINDOW_MINUTES));

  const ip = String(params.ip || "").trim();

  const ipQuery = ip
    ? database
        .from("security_login_attempts")
        .select("id", { count: "exact", head: true })
        .eq("tipo_usuario", "cliente")
        .eq("ip", ip)
        .gte("criado_em", since(IP_WINDOW_MINUTES))
    : null;

  const [identityResult, ipResult] = await Promise.all([
    identityQuery,
    ipQuery || Promise.resolve({ count: 0, error: null }),
  ]);

  if (identityResult.error) {
    throw identityResult.error;
  }

  if (ipResult.error) {
    throw ipResult.error;
  }

  const attemptsByCpf = Number(identityResult.count || 0);
  const attemptsByIp = Number(ipResult.count || 0);

  const allowed =
    attemptsByCpf < CPF_MAX_ATTEMPTS &&
    attemptsByIp < IP_MAX_ATTEMPTS;

  return {
    allowed,
    attemptsByCpf,
    attemptsByIp,
    retryAfterSeconds: allowed
      ? 0
      : CPF_WINDOW_MINUTES * 60,
  };
}
