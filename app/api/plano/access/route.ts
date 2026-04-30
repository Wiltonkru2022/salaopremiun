import { NextResponse } from "next/server";
import { getPlanoAccessSnapshot } from "@/lib/plans/access";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Sessao invalida." },
      { status: 401 }
    );
  }

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("id_salao, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError || !usuario?.id_salao) {
    return NextResponse.json(
      { error: "Nao foi possivel identificar o salao do usuario." },
      { status: 403 }
    );
  }

  if (usuario.status && usuario.status !== "ativo") {
    return NextResponse.json({ error: "Usuario inativo." }, { status: 403 });
  }

  const access = await getPlanoAccessSnapshot(usuario.id_salao);

  return NextResponse.json({
    planoCodigo: access.planoCodigo,
    planoNome: access.planoNome,
    bloqueioTotal: access.bloqueioTotal,
    modoRestrito: access.modoRestrito,
    recursos: access.recursos,
    limites: access.limites,
    uso: access.uso,
  });
}
