import { redirect } from "next/navigation";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { getClienteSessionFromCookie } from "@/lib/cliente-auth.server";
import { getClienteAppPublicEmail } from "@/app/services/cliente-app/linking";
import {
  buildSecurityBlockPath,
  getSecurityAccessDecision,
} from "@/lib/security/user-security";

export type ClienteAppServerContext = {
  idConta: string;
  nome: string;
  email: string;
  whatsapp: string | null;
  telefone: string | null;
  cpf: string | null;
  dataNascimento: string | null;
  migracaoIdentidadeConcluida: boolean;
};

type ClienteContaRow = {
  id?: string | null;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  cpf?: string | null;
  data_nascimento?: unknown;
  ativo?: boolean | null;
  auth_version?: number | string | null;
  migracao_identidade_concluida?: boolean | null;
};

function normalizeDbDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

async function loadAccount(idConta: string) {
  const db = getDatabaseAdmin();

  const result = await db
    .from<ClienteContaRow>("clientes_app_auth")
    .select(
      "id, nome, email, telefone, whatsapp, cpf, data_nascimento, ativo, auth_version, migracao_identidade_concluida"
    )
    .eq("id", idConta)
    .limit(1);

  if (result.error) {
    throw new Error("ACCOUNT_LOOKUP_FAILED");
  }

  if (
    !Array.isArray(result.data) ||
    result.data.length !== 1
  ) {
    return null;
  }

  return result.data[0] as ClienteContaRow;
}

async function loadClienteAppServerContext(): Promise<ClienteAppServerContext> {
  const session = await getClienteSessionFromCookie();

  if (!session?.idConta) {
    throw new Error("UNAUTHORIZED");
  }

  const account = await loadAccount(session.idConta);

  if (!account?.id || account.ativo === false) {
    throw new Error("UNAUTHORIZED");
  }

  const dbAuthVersion = Number(account.auth_version);

  if (
    !Number.isFinite(dbAuthVersion) ||
    dbAuthVersion < 1 ||
    Number(session.authVersion) !== dbAuthVersion
  ) {
    throw new Error("UNAUTHORIZED");
  }

  const context: ClienteAppServerContext = {
    idConta: String(account.id),
    nome:
      String(account.nome || "").trim() ||
      session.nome ||
      "Cliente SalãoPremium",
    email: getClienteAppPublicEmail(
      account.email || session.email
    ),
    whatsapp:
      String(
        account.whatsapp ||
          session.whatsapp ||
          account.telefone ||
          session.telefone ||
          ""
      ).trim() || null,
    telefone:
      String(
        account.telefone ||
          session.telefone ||
          account.whatsapp ||
          session.whatsapp ||
          ""
      ).trim() || null,
    cpf: String(account.cpf || "").trim() || null,
    dataNascimento: normalizeDbDate(
      account.data_nascimento
    ),
    migracaoIdentidadeConcluida: Boolean(
      account.migracao_identidade_concluida
    ),
  };

  const security = await getSecurityAccessDecision({
    tipoUsuario: "cliente",
    userId: context.idConta,
  });

  if (!security.allowed) {
    throw new Error("SECURITY_BLOCKED");
  }

  return context;
}

export async function validateClienteAppSession(): Promise<{
  context: ClienteAppServerContext | null;
  reason:
    | "unauthorized"
    | "security_blocked"
    | null;
}> {
  try {
    return {
      context: await loadClienteAppServerContext(),
      reason: null,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "UNAUTHORIZED"
    ) {
      return {
        context: null,
        reason: "unauthorized",
      };
    }

    if (
      error instanceof Error &&
      error.message === "SECURITY_BLOCKED"
    ) {
      return {
        context: null,
        reason: "security_blocked",
      };
    }

    throw error;
  }
}

export async function requireClienteAppContext(): Promise<ClienteAppServerContext> {
  const validation =
    await validateClienteAppSession();

  if (validation.context) {
    return validation.context;
  }

  const destino =
    validation.reason === "security_blocked"
      ? buildSecurityBlockPath({
          tipoUsuario: "cliente",
          origem: "cliente_app_context",
          returnTo: "/app-cliente",
        })
      : "/app-cliente/login?erro=sessao_expirada";

  /*
   * marker=0 significa invalidação de sessão, não logout explícito.
   */
  redirect(
    `/app-cliente/logout?marker=0&destino=${encodeURIComponent(
      destino
    )}`
  );
}
