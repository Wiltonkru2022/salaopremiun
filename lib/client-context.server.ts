import { redirect } from "next/navigation";
import { canSalonAppearInClientApp } from "@/lib/client-app/eligibility";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getClienteSessionFromCookie } from "@/lib/cliente-auth.server";

export type ClienteAppServerContext = {
  idCliente: string;
  idSalao: string;
  nome: string;
  email: string;
};

function isUnauthorizedError(error: unknown) {
  return error instanceof Error && error.message === "UNAUTHORIZED";
}

async function loadClienteAppServerContext(): Promise<ClienteAppServerContext> {
  const session = await getClienteSessionFromCookie();

  if (!session?.idCliente || !session?.idSalao) {
    throw new Error("UNAUTHORIZED");
  }

  const supabaseAdmin = getSupabaseAdmin();
  const [{ data: cliente, error: clienteError }, { data: authRows, error: authError }] =
    await Promise.all([
      supabaseAdmin
        .from("clientes")
        .select("id, id_salao, nome, email, status, ativo")
        .eq("id", session.idCliente)
        .eq("id_salao", session.idSalao)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("clientes_auth")
        .select("id, email, app_ativo")
        .eq("id_cliente", session.idCliente)
        .eq("id_salao", session.idSalao)
        .eq("app_ativo", true)
        .limit(1),
    ]);

  const auth = authRows?.[0];

  if (
    clienteError ||
    authError ||
    !cliente?.id ||
    !auth?.id ||
    String(cliente.status || "").toLowerCase() === "inativo"
  ) {
    throw new Error("UNAUTHORIZED");
  }

  const elegibilidade = await canSalonAppearInClientApp(session.idSalao);
  if (!elegibilidade.allowed) {
    throw new Error("PLAN_BLOCKED");
  }

  return {
    idCliente: cliente.id,
    idSalao: String(cliente.id_salao || session.idSalao),
    nome:
      String(cliente.nome || "").trim() || session.nome || "Cliente SalaoPremium",
    email:
      String(auth.email || cliente.email || session.email || "").trim() ||
      "cliente@salaopremium.local",
  };
}

export async function validateClienteAppSession(): Promise<{
  context: ClienteAppServerContext | null;
  reason: "unauthorized" | "plan_blocked" | null;
}> {
  try {
    const context = await loadClienteAppServerContext();
    return { context, reason: null };
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return { context: null, reason: "unauthorized" };
    }

    if (error instanceof Error && error.message === "PLAN_BLOCKED") {
      return { context: null, reason: "plan_blocked" };
    }

    throw error;
  }
}

export async function requireClienteAppContext(): Promise<ClienteAppServerContext> {
  const validation = await validateClienteAppSession();

  if (!validation.context) {
    const destino =
      validation.reason === "plan_blocked"
        ? "/app-cliente/login?erro=salao_indisponivel"
        : "/app-cliente/login?erro=sessao_expirada";

    redirect(`/app-cliente/logout?destino=${encodeURIComponent(destino)}`);
  }

  return validation.context;
}
