import { NextRequest, NextResponse } from "next/server";
import { ajustarVencimentoSalaoAdminMaster } from "@/lib/admin-master/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";

type Payload = {
  vencimentoEm?: string;
  motivo?: string;
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminMasterUser("assinaturas_ajustar");
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Payload;

  if (!body.vencimentoEm) {
    return NextResponse.json(
      { ok: false, error: "Vencimento obrigatorio." },
      { status: 400 }
    );
  }

  await ajustarVencimentoSalaoAdminMaster({
    idSalao: id,
    idAdmin: admin.usuario.id,
    vencimentoEm: body.vencimentoEm,
    motivo: body.motivo || "Ajuste manual de vencimento pelo AdminMaster.",
  });

  return NextResponse.json({ ok: true });
}
