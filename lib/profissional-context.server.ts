import { redirect } from "next/navigation";
import { canUsePlanFeature, isSalaoStatusOperational } from "@/lib/plans/access";
import { getDatabaseAdmin } from "@/lib/db/admin";
import {
  getProfissionalSessionFromCookie,
} from "@/lib/profissional-auth.server";
import {
  buildSecurityBlockPath,
  getSecurityAccessDecision,
} from "@/lib/security/user-security";

export type ProfissionalServerContext = {
  idProfissional: string;
  idSalao: string;
  nome: string;
  email: string | null;
  nivelAcesso: string;
  podeVerAgendaTodos: boolean;
};

function isUnauthorizedError(error: unknown) {
  return error instanceof Error && error.message === "UNAUTHORIZED";
}

async function loadProfissionalServerContext(): Promise<ProfissionalServerContext> {
  const session = await getProfissionalSessionFromCookie();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  const database = getDatabaseAdmin();
  const [{ data: profissional, error: profissionalError }, acessoResult] = await Promise.all([
    database
      .from("profissionais")
      .select(
        "id, id_salao, nome, nome_exibicao, email, ativo, tipo_profissional, nivel_acesso, pode_usar_sistema"
      )
      .eq("id", session.idProfissional)
      .eq("id_salao", session.idSalao)
      .maybeSingle(),
    database
      .from("profissionais_acessos")
      .select("id, auth_version, ativo")
      .eq("id_profissional", session.idProfissional)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle(),
  ]);

  const acesso = acessoResult.data as
    | { id?: string | null; auth_version?: number | string | null; ativo?: boolean | null }
    | null;
  const acessoError = acessoResult.error;
  const authVersionAtual = Number(acesso?.auth_version || 0);

  if (
    profissionalError ||
    !profissional?.id ||
    profissional.ativo === false ||
    acessoError ||
    !acesso?.id ||
    !Number.isSafeInteger(authVersionAtual) ||
    authVersionAtual < 1 ||
    authVersionAtual !== session.authVersion
  ) {
    throw new Error("UNAUTHORIZED");
  }

  if (
    String(profissional.tipo_profissional || "profissional").toLowerCase() ===
    "assistente"
  ) {
    throw new Error("UNAUTHORIZED");
  }

  const { data: salao, error: salaoError } = await database
    .from("saloes")
    .select("id, status")
    .eq("id", session.idSalao)
    .maybeSingle();

  if (
    salaoError ||
    !salao?.id ||
    !isSalaoStatusOperational(salao.status)
  ) {
    throw new Error("UNAUTHORIZED");
  }

  const securityDecision = await getSecurityAccessDecision({
    tipoUsuario: "profissional",
    userId: profissional.id,
    idSalao: session.idSalao,
  });

  if (!securityDecision.allowed) {
    throw new Error("SECURITY_BLOCKED");
  }

  const nivelAcesso = String(profissional.nivel_acesso || "proprio").toLowerCase();
  if (profissional.pode_usar_sistema === false || nivelAcesso === "sem_acesso") {
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
    nivelAcesso,
    podeVerAgendaTodos: nivelAcesso === "todos",
  };
}

export async function requireProfissionalServerContext(): Promise<ProfissionalServerContext> {
  return loadProfissionalServerContext();
}

export async function validateProfissionalAppSession(): Promise<{
  context: ProfissionalServerContext | null;
  reason: "unauthorized" | "security_blocked" | "plan_blocked" | null;
}> {
  let context: ProfissionalServerContext;

  try {
    context = await loadProfissionalServerContext();
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return { context: null, reason: "unauthorized" };
    }

    if (error instanceof Error && error.message === "SECURITY_BLOCKED") {
      return { context: null, reason: "security_blocked" };
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
    const destino =
      validation.reason === "security_blocked"
        ? buildSecurityBlockPath({
            tipoUsuario: "profissional",
            origem: "profissional_app_context",
            returnTo: "/app-profissional",
          })
        : validation.reason === "plan_blocked"
          ? "/app-profissional/login?erro=plano_sem_app"
          : "/app-profissional/login?erro=sessao_expirada";

    redirect(
      `/app-profissional/logout?destino=${encodeURIComponent(destino)}`
    );
  }

  return validation.context;
}
