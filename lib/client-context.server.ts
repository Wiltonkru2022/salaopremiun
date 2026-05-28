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
  telefone: string | null;
};

function isUnauthorizedError(error: unknown) {
  return error instanceof Error && error.message === "UNAUTHORIZED";
}

async function getClienteAppAccount(idConta: string) {
  const supabaseAdmin = asLooseSupabaseClient(getSupabaseAdmin());
  const { data: conta, error } = await supabaseAdmin
    .from("clientes_app_auth")
    .select("id, nome, email, telefone, ativo")
    .eq("id", idConta)
    .limit(1)
    .maybeSingle<{
      id?: string | null;
      nome?: string | null;
      email?: string | null;
      telefone?: string | null;
      ativo?: boolean | null;
    }>();

  if (error) {
    throw new Error("ACCOUNT_LOOKUP_FAILED");
  }

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

  if (!session?.idConta) {
    throw new Error("UNAUTHORIZED");
  }

  let conta: Awaited<ReturnType<typeof getClienteAppAccount>>;

  try {
    conta = await getClienteAppAccount(session.idConta);
  } catch {
    const context = {
      idConta: session.idConta,
      nome: session.nome || "Cliente SalãoPremium",
      email: getClienteAppPublicEmail(session.email),
      telefone: session.telefone || null,
    };

    const securityDecision = await getClienteSecurityDecision(context);
    if (!securityDecision.allowed) {
      throw new Error("SECURITY_BLOCKED");
    }

    return context;
  }

  if (!conta?.id || conta.ativo === false) {
    throw new Error("UNAUTHORIZED");
  }

  const context = {
    idConta: conta.id,
    nome:
      String(conta.nome || "").trim() || session.nome || "Cliente SalãoPremium",
    email:
      getClienteAppPublicEmail(conta.email || session.email),
    telefone: String(conta.telefone || session.telefone || "").trim() || null,
  };

  const securityDecision = await getClienteSecurityDecision(context);
  if (!securityDecision.allowed) {
    throw new Error("SECURITY_BLOCKED");
  }

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
    if (isUnauthorizedError(error)) {
      return { context: null, reason: "unauthorized" };
    }

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
