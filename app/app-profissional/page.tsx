import { redirect } from "next/navigation";
import {
  clearProfissionalSession,
  getProfissionalSessionFromCookie,
} from "@/lib/profissional-auth.server";
import { validateProfissionalAppSession } from "@/lib/profissional-context.server";

export default async function AppProfissionalRootPage() {
  const session = await getProfissionalSessionFromCookie();

  if (!session) {
    redirect("/app-profissional/login");
  }

  const validation = await validateProfissionalAppSession();

  if (!validation.context) {
    await clearProfissionalSession();
    redirect(
      validation.reason === "plan_blocked"
        ? "/app-profissional/login?erro=plano_sem_app"
        : "/app-profissional/login?erro=sessao_expirada"
    );
  }

  redirect("/app-profissional/inicio");
}
