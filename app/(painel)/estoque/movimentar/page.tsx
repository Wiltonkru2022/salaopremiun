import { redirect } from "next/navigation";
import MovimentacaoForm from "@/components/estoque/MovimentacaoForm";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getPlanoAccessSnapshot } from "@/lib/plans/access";

export default async function MovimentarEstoquePage() {
  const { user, usuario } = await getPainelUserContext();

  if (!user) {
    redirect("/login");
  }

  if (!usuario?.id_salao) {
    redirect("/dashboard");
  }

  const access = await getPlanoAccessSnapshot(usuario.id_salao);

  if (!access.recursos.estoque) {
    redirect("/meu-plano?motivo=recurso_estoque_bloqueado");
  }

  return <MovimentacaoForm />;
}
