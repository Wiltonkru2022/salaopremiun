import "server-only";

import crypto from "node:crypto";
import type { ClienteAppSession } from "@/lib/cliente-auth.server";
import {
  isValidCpf,
  normalizeCpf,
  normalizeWhatsapp,
  parseClienteBirthDate,
} from "@/lib/client-app/identity";
import { getClienteAppPublicEmail } from "@/app/services/cliente-app/linking";
import { queryNeonDirect } from "@/lib/neon/direct.server";
import { getClienteSecurityDecisionDirect } from "@/lib/client-app/security-access-direct.server";
import { buildSecurityBlockPath } from "@/lib/security/user-security";

type ClienteAccountRow = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  cpf: string | null;
  data_nascimento: unknown;
  auth_version: number | string | null;
  migracao_identidade_concluida: boolean | null;
  ativo: boolean | null;
};

export type ClienteDirectLoginResult =
  | { ok: true; session: ClienteAppSession }
  | { ok: false; error: string; redirectTo?: string };

const GENERIC_LOGIN_ERROR = "Não foi possível validar os dados informados.";

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

function fingerprintCpf(cpf: string) {
  return `cpf:${crypto
    .createHmac("sha256", identitySecret())
    .update(cpf)
    .digest("hex")}`;
}

function normalizeStoredDate(value: unknown) {
  if (value === null || value === undefined || value === "") return "";

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? ""
      : value.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toISOString().slice(0, 10);
}

function buildSession(account: ClienteAccountRow): ClienteAppSession {
  const whatsapp = normalizeWhatsapp(account.whatsapp || account.telefone);
  const authVersion = Number(account.auth_version || 1);

  return {
    idConta: String(account.id),
    nome: String(account.nome || "").trim() || "Cliente SalãoPremium",
    email: getClienteAppPublicEmail(account.email),
    whatsapp: whatsapp || null,
    telefone: whatsapp || null,
    authVersion:
      Number.isFinite(authVersion) && authVersion > 0 ? authVersion : 1,
    tipo: "cliente",
  };
}

async function recordFailure(params: {
  cpf: string;
  userId?: string | null;
  idSalao?: string | null;
  userAgent?: string | null;
}) {
  const now = new Date();
  const identity = fingerprintCpf(params.cpf);

  await queryNeonDirect(
    `insert into public.security_login_attempts
       (tipo_usuario, user_id, id_salao, identidade, user_agent, risco, criado_em)
     values
       ('cliente', $1, $2, $3::text, $4::text, 'baixo', $5::timestamptz)`,
    [
      params.userId || null,
      params.idSalao || null,
      identity,
      params.userAgent || null,
      now.toISOString(),
    ]
  ).catch((error) => {
    console.warn("[CLIENTE_LOGIN] falha ao registrar tentativa", error);
  });

  const counts = await queryNeonDirect<{ attempts_10m: number; attempts_1h: number }>(
    `select
       count(*) filter (where criado_em >= $1::timestamptz)::int as attempts_10m,
       count(*) filter (where criado_em >= $2::timestamptz)::int as attempts_1h
     from public.security_login_attempts
     where tipo_usuario::text = 'cliente'
       and (
         ($3::text <> '' and user_id::text = $3::text)
         or
         ($3::text = '' and identidade::text = $4::text)
       )`,
    [
      new Date(now.getTime() - 10 * 60_000).toISOString(),
      new Date(now.getTime() - 60 * 60_000).toISOString(),
      String(params.userId || ""),
      identity,
    ]
  ).catch(() => ({ rows: [{ attempts_10m: 0, attempts_1h: 0 }] } as any));

  const attempts10m = Number(counts.rows[0]?.attempts_10m || 0);
  const attempts1h = Number(counts.rows[0]?.attempts_1h || 0);
  const shouldVerify = attempts1h >= 10;
  const shouldBlock = attempts10m >= 5 || shouldVerify;

  if (!shouldBlock || !params.userId) {
    return { blocked: false as const };
  }

  const status = shouldVerify ? "verificacao_necessaria" : "bloqueado_temporario";
  const blockedUntil = new Date(
    now.getTime() + (shouldVerify ? 60 : 15) * 60_000
  ).toISOString();
  const motivo = shouldVerify
    ? "Detectamos muitas tentativas de acesso. Confirme sua identidade para continuar."
    : "Bloqueio temporário por muitas tentativas de login.";

  await queryNeonDirect(
    `insert into public.user_security_status
       (user_id, tipo_usuario, status, motivo, risco_atual, bloqueado_ate,
        verificacao_necessaria, atualizado_em)
     values
       ($1, 'cliente', $2::text, $3::text, $4::text, $5::timestamptz, $6::boolean, $7::timestamptz)
     on conflict (user_id) do update set
       tipo_usuario = excluded.tipo_usuario,
       status = excluded.status,
       motivo = excluded.motivo,
       risco_atual = excluded.risco_atual,
       bloqueado_ate = excluded.bloqueado_ate,
       verificacao_necessaria = excluded.verificacao_necessaria,
       atualizado_em = excluded.atualizado_em`,
    [
      params.userId,
      status,
      motivo,
      shouldVerify ? "alto" : "medio",
      blockedUntil,
      shouldVerify,
      now.toISOString(),
    ]
  );

  return {
    blocked: true as const,
    redirectTo: buildSecurityBlockPath({
      tipoUsuario: "cliente",
      motivo,
      origem: "login_attempts",
    }),
  };
}

export async function loginClienteCpfNascimentoDirect(params: {
  cpf: string;
  dataNascimento: string;
  idSalao?: string | null;
  userAgent?: string | null;
}): Promise<ClienteDirectLoginResult> {
  const cpf = normalizeCpf(params.cpf);
  const dataNascimento = parseClienteBirthDate(params.dataNascimento);
  const idSalao = String(params.idSalao || "").trim() || null;

  if (!isValidCpf(cpf) || !dataNascimento) {
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  const result = await queryNeonDirect<ClienteAccountRow>(
    `select id::text,
            nome::text,
            email::text,
            telefone::text,
            whatsapp::text,
            cpf::text,
            data_nascimento,
            auth_version,
            migracao_identidade_concluida,
            ativo
       from public.clientes_app_auth
      where cpf::text = $1::text
      limit 1`,
    [cpf]
  );

  const account = result.rows[0] || null;
  const birthMatches =
    Boolean(account?.id) &&
    normalizeStoredDate(account?.data_nascimento) === dataNascimento;

  if (!account?.id || account.ativo === false || !birthMatches) {
    const failure = await recordFailure({
      cpf,
      userId: account?.id || null,
      idSalao,
      userAgent: params.userAgent,
    });

    if (failure.blocked) {
      return {
        ok: false,
        error: GENERIC_LOGIN_ERROR,
        redirectTo: failure.redirectTo,
      };
    }

    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  const security = await getClienteSecurityDecisionDirect({
    userId: account.id,
    idSalao,
  });

  if (!security.allowed) {
    return {
      ok: false,
      error: security.error || "Acesso bloqueado por segurança.",
      redirectTo: security.redirectTo || undefined,
    };
  }

  await queryNeonDirect(
    `update public.clientes_app_auth
        set ultimo_login_em = $1::timestamptz,
            migracao_identidade_concluida = true
      where id::text = $2::text`,
    [new Date().toISOString(), account.id]
  );

  return {
    ok: true,
    session: buildSession(account),
  };
}
