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

export async function requireProfissionalServerContext(): Promise<ProfissionalServerContext> {
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

export async function requireProfissionalAppContext(): Promise<ProfissionalServerContext> {
  let context: ProfissionalServerContext;

  try {
    context = await requireProfissionalServerContext();
  } catch (error) {
    if (isUnauthorizedError(error)) {
      await clearProfissionalSession();
      redirect("/app-profissional/login?erro=sessao_expirada");
    }

    throw error;
  }

  const access = await canUsePlanFeature(context.idSalao, "app_profissional");

  if (!access.allowed) {
    await clearProfissionalSession();
    redirect("/app-profissional/login?erro=plano_sem_app");
  }

  return context;
}
