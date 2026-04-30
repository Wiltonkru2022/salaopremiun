import { redirect } from "next/navigation";
import MovimentacaoForm from "@/components/estoque/MovimentacaoForm";
import { getPlanoAccessSnapshot } from "@/lib/plans/access";
import { createClient } from "@/lib/supabase/server";

export default async function MovimentarEstoquePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id_salao")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!usuario?.id_salao) {
    redirect("/dashboard");
  }

  const access = await getPlanoAccessSnapshot(usuario.id_salao);

  if (!access.recursos.estoque) {
    redirect("/meu-plano?motivo=recurso_estoque_bloqueado");
  }

  return <MovimentacaoForm />;
}
