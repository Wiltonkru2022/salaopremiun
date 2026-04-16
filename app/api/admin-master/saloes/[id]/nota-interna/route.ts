import { NextRequest, NextResponse } from "next/server";
import { criarNotaSalaoAdminMaster } from "@/lib/admin-master/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";

type Payload = {
  titulo?: string;
  nota?: string;
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminMasterUser("saloes_editar");
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Payload;

  if (!body.titulo || !body.nota) {
    return NextResponse.json(
      { ok: false, error: "Titulo e nota sao obrigatorios." },
      { status: 400 }
    );
  }

  await criarNotaSalaoAdminMaster({
    idSalao: id,
    idAdmin: admin.usuario.id,
    titulo: body.titulo,
    nota: body.nota,
  });

  return NextResponse.json({ ok: true });
}
