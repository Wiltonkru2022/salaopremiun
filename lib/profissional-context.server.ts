import { redirect } from "next/navigation";
import { canUsePlanFeature } from "@/lib/plans/access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  clearProfissionalSession,
  getProfissionalSessionFromCookie,
} from "@/lib/profissional-auth.server";

export type ProfissionalServerContext = {
  idProfissional: string;
  idSalao: string;
  nome: string;
  email: string | null;
};

function isUnauthorizedError(error: unknown) {
  return error instanceof Error && error.message === "UNAUTHORIZED";
}

async function loadProfissionalServerContext(): Promise<ProfissionalServerContext> {
  const session = await getProfissionalSessionFromCookie();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: profissional, error: profissionalError } = await supabaseAdmin
    .from("profissionais")
    .select("id, id_salao, nome, nome_exibicao, email, ativo, tipo_profissional")
    .eq("id", session.idProfissional)
    .eq("id_salao", session.idSalao)
    .maybeSingle();

  if (profissionalError || !profissional?.id || profissional.ativo === false) {
    throw new Error("UNAUTHORIZED");
  }

  if (
    String(profissional.tipo_profissional || "profissional").toLowerCase() ===
    "assistente"
  ) {
    throw new Error("UNAUTHORIZED");
  }

  const { data: salao, error: salaoError } = await supabaseAdmin
    .from("saloes")
    .select("id, status")
    .eq("id", session.idSalao)
    .maybeSingle();

  if (
    salaoError ||
    !salao?.id ||
    String(salao.status || "").toLowerCase() !== "ativo"
  ) {
    throw new Error("UNAUTHORIZED");
  }

  return {
    idProfissional: profissional.id,
    idSalao: session.idSalao,
    nome:
      String(profissional.nome_exibicao || "").trim() ||
      String(profissional.nome || "").trim() ||
      session.nome,
    email: String(profissional.email || "").trim() || null,
  };
}

export async function requireProfissionalServerContext(): Promise<ProfissionalServerContext> {
  return loadProfissionalServerContext();
}

export async function validateProfissionalAppSession(): Promise<{
  context: ProfissionalServerContext | null;
  reason: "unauthorized" | "plan_blocked" | null;
}> {
  let context: ProfissionalServerContext;

  try {
    context = await loadProfissionalServerContext();
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return { context: null, reason: "unauthorized" };
    }

    throw error;
  }

  const access = await canUsePlanFeature(context.idSalao, "app_profissional");

  if (!access.allowed) {
    return { context: null, reason: "plan_blocked" };
  }

  return { context, reason: null };
}

export async function requireProfissionalAppContext(): Promise<ProfissionalServerContext> {
  const validation = await validateProfissionalAppSession();

  if (!validation.context) {
    await clearProfissionalSession();

    if (validation.reason === "plan_blocked") {
      redirect("/app-profissional/login?erro=plano_sem_app");
    }

    redirect("/app-profissional/login?erro=sessao_expirada");
  }

  return validation.context;
}
