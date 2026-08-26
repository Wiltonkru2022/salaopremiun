import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getPainelUserContext({ allowAdminAal1: true });
  if (!context.user || !context.usuario?.id_salao || context.usuario.status !== "ativo") {
    return NextResponse.json({ user: null, usuario: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: context.user.id,
      email: context.usuario.email || context.user.email || null,
      user_metadata: {
        nome: context.usuario.nome || null,
      },
    },
    usuario: context.usuario,
  });
}
