import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getClienteSessionFromCookie } from "@/lib/cliente-auth.server";
import { asLooseSupabaseClient } from "@/lib/supabase/loose-client";
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

function isUnauthorizedError(error: unknown) {
  return error instanceof Error && error.message === "UNAUTHORIZED";
}

async function getClienteAppAccount(idConta: string) {
  const supabaseAdmin = asLooseSupabaseClient(getSupabaseAdmin());
  const { data: conta, error } = await supabaseAdmin
    .from("clientes_app_auth")
    .select(
      "id, nome, email, telefone, whatsapp, cpf, data_nascimento, ativo, auth_version, migracao_identidade_concluida"
    )
    .eq("id", idConta)
    .limit(1)
    .maybeSingle<{
      id?: string | null;
      nome?: string | null;
      email?: string | null;
      telefone?: string | null;
      whatsapp?: string | null;
      cpf?: string | null;
      data_nascimento?: string | null;
      ativo?: boolean | null;
      auth_version?: number | null;
      migracao_identidade_concluida?: boolean | null;
    }>();

  if (error) throw new Error("ACCOUNT_LOOKUP_FAILED");
  return conta;
}

async function getClienteSecurityDecision(context: ClienteAppServerContext) {
  return getSecurityAccessDecision({
    tipoUsuario: "cliente",
    userId: context.idConta,
  });
}

async function loadClienteAppServerContext(): Promise<ClienteAppServerContext> {
  const session = await getClienteSessionFromCookie();
  if (!session?.idConta) throw new Error("UNAUTHORIZED");

  const conta = await getClienteAppAccount(session.idConta).catch(() => null);
  if (!conta?.id || conta.ativo === false) throw new Error("UNAUTHORIZED");

  const authVersion = Number(conta.auth_version || 1);
  if (Number(session.authVersion || 1) !== authVersion) {
    throw new Error("UNAUTHORIZED");
  }

  const context: ClienteAppServerContext = {
    idConta: String(conta.id),
    nome: String(conta.nome || "").trim() || session.nome || "Cliente SalãoPremium",
    email: getClienteAppPublicEmail(conta.email || session.email),
    whatsapp:
      String(conta.whatsapp || session.whatsapp || conta.telefone || session.telefone || "").trim() || null,
    telefone:
      String(conta.telefone || session.telefone || conta.whatsapp || session.whatsapp || "").trim() || null,
    cpf: String(conta.cpf || "").trim() || null,
    dataNascimento: String(conta.data_nascimento || "").trim() || null,
    migracaoIdentidadeConcluida: Boolean(conta.migracao_identidade_concluida),
  };

  const securityDecision = await getClienteSecurityDecision(context);
  if (!securityDecision.allowed) throw new Error("SECURITY_BLOCKED");
  return context;
}

export async function validateClienteAppSession(): Promise<{
  context: ClienteAppServerContext | null;
  reason: "unauthorized" | "security_blocked" | null;
}> {
  try {
    const context = await loadClienteAppServerContext();
    return { context, reason: null };
  } catch (error) {
    if (isUnauthorizedError(error)) return { context: null, reason: "unauthorized" };
    if (error instanceof Error && error.message === "SECURITY_BLOCKED") {
      return { context: null, reason: "security_blocked" };
    }
    throw error;
  }
}

export async function requireClienteAppContext(): Promise<ClienteAppServerContext> {
  const validation = await validateClienteAppSession();
  if (!validation.context) {
    const destino =
      validation.reason === "security_blocked"
        ? buildSecurityBlockPath({
            tipoUsuario: "cliente",
            origem: "cliente_app_context",
            returnTo: "/app-cliente",
          })
        : "/app-cliente/login?erro=sessao_expirada";
    redirect(`/app-cliente/logout?destino=${encodeURIComponent(destino)}`);
  }
  return validation.context;
}
