import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getClienteSessionFromCookie } from "@/lib/cliente-auth.server";

export type ClienteAppServerContext = {
  idConta: string;
  nome: string;
  email: string;
  telefone: string | null;
};

function isUnauthorizedError(error: unknown) {
  return error instanceof Error && error.message === "UNAUTHORIZED";
}

const getClienteAppAccountCached = unstable_cache(
  async (idConta: string) => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: conta, error } = await (supabaseAdmin as any)
      .from("clientes_app_auth")
      .select("id, nome, email, telefone, ativo")
      .eq("id", idConta)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error("ACCOUNT_LOOKUP_FAILED");
    }

    return conta as
      | {
          id?: string | null;
          nome?: string | null;
          email?: string | null;
          telefone?: string | null;
          ativo?: boolean | null;
        }
      | null;
  },
  ["cliente-app-account-context-v1"],
  {
    revalidate: 60,
    tags: ["cliente-app-session"],
  }
);

async function loadClienteAppServerContext(): Promise<ClienteAppServerContext> {
  const session = await getClienteSessionFromCookie();

  if (!session?.idConta) {
    throw new Error("UNAUTHORIZED");
  }

  let conta: Awaited<ReturnType<typeof getClienteAppAccountCached>>;

  try {
    conta = await getClienteAppAccountCached(session.idConta);
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
    redirect(
      `/app-cliente/logout?destino=${encodeURIComponent(
        "/app-cliente/login?erro=sessao_expirada"
      )}`
    );
  }

  return validation.context;
}
