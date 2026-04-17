import { NextRequest, NextResponse } from "next/server";
import { criarTicketSalaoAdminMaster } from "@/lib/admin-master/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";

type Payload = {
  assunto?: string;
  mensagem?: string;
  prioridade?: string | null;
  categoria?: string | null;
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminMasterUser("tickets_editar");
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Payload;

  if (!body.assunto || !body.mensagem) {
    return NextResponse.json(
      { ok: false, error: "Assunto e mensagem sao obrigatorios." },
      { status: 400 }
    );
  }

  const resultado = await criarTicketSalaoAdminMaster({
    idSalao: id,
    idAdmin: admin.usuario.id,
    assunto: body.assunto,
    mensagem: body.mensagem,
    prioridade: body.prioridade || null,
    categoria: body.categoria || null,
  });

  return NextResponse.json({ ok: true, resultado });
}
