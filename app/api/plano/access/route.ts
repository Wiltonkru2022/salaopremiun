import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getPlanoAccessSnapshot } from "@/lib/plans/access";

export async function GET() {
  const { user, usuario } = await getPainelUserContext();

  if (!user) {
    return NextResponse.json(
      { error: "Sessao invalida." },
      { status: 401 }
    );
  }

  if (!usuario?.id_salao) {
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
