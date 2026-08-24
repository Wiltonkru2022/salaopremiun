import { redirect } from "next/navigation";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { hasAal2 } from "@/lib/auth/mfa-assurance";

export default async function OnboardingSalaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, usuario } = await getPainelUserContext({ allowAdminAal1: true });

  if (!user || !usuario?.id_salao) {
    redirect("/login?motivo=sessao_expirada");
  }

  if (String(usuario.nivel || "").toLowerCase() === "admin" && !(await hasAal2())) {
    redirect("/seguranca/mfa?next=/onboarding-salao");
  }

  return children;
}
