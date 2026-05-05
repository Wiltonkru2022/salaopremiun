import { redirect } from "next/navigation";
import {
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
    const destino =
      validation.reason === "plan_blocked"
        ? "/app-profissional/login?erro=plano_sem_app"
        : "/app-profissional/login?erro=sessao_expirada";

    redirect(
      `/app-profissional/logout?destino=${encodeURIComponent(destino)}`
    );
  }

  redirect("/app-profissional/inicio");
}
