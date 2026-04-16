import { NextRequest, NextResponse } from "next/server";
import { trocarPlanoSalaoAdminMaster } from "@/lib/admin-master/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";

type Payload = {
  plano?: string;
  motivo?: string;
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminMasterUser("assinaturas_ajustar");
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Payload;

  if (!body.plano) {
    return NextResponse.json(
      { ok: false, error: "Plano obrigatorio." },
      { status: 400 }
    );
  }

  await trocarPlanoSalaoAdminMaster({
    idSalao: id,
    idAdmin: admin.usuario.id,
    planoCodigo: body.plano,
    motivo: body.motivo || "Troca manual de plano pelo AdminMaster.",
  });

  return NextResponse.json({ ok: true });
}
