import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getClienteSessionFromCookie } from "@/lib/cliente-auth.server";
import { asLooseSupabaseClient } from "@/lib/supabase/loose-client";

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

async function loadClienteAppServerContext(): Promise<ClienteAppServerContext> {
  const session = await getClienteSessionFromCookie();

  if (!session?.idConta) {
    throw new Error("UNAUTHORIZED");
  }

  let conta: Awaited<ReturnType<typeof getClienteAppAccount>>;

  try {
    conta = await getClienteAppAccount(session.idConta);
  } catch {
    return {
      idConta: session.idConta,
      nome: session.nome || "Cliente SalaoPremium",
      email: session.email || "cliente@salaopremium.local",
      telefone: session.telefone || null,
    };
  }

  if (!conta?.id || conta.ativo === false) {
    throw new Error("UNAUTHORIZED");
  }

  return {
    idConta: conta.id,
    nome:
      String(conta.nome || "").trim() || session.nome || "Cliente SalaoPremium",
    email:
      String(conta.email || session.email || "").trim() ||
      "cliente@salaopremium.local",
    telefone: String(conta.telefone || session.telefone || "").trim() || null,
  };
}

export async function validateClienteAppSession(): Promise<{
  context: ClienteAppServerContext | null;
  reason: "unauthorized" | null;
}> {
  try {
    const context = await loadClienteAppServerContext();
    return { context, reason: null };
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return { context: null, reason: "unauthorized" };
    }

    throw error;
  }
}

export async function requireClienteAppContext(): Promise<ClienteAppServerContext> {
  const validation = await validateClienteAppSession();

  if (!validation.context) {
    const destino = "/app-cliente/login?erro=sessao_expirada";
    redirect(`/app-cliente/logout?destino=${encodeURIComponent(destino)}`);
  }

  return validation.context;
}
