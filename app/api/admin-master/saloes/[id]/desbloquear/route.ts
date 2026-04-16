import { NextRequest, NextResponse } from "next/server";
import { desbloquearSalaoAdminMaster } from "@/lib/admin-master/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminMasterUser("saloes_editar");
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { motivo?: string };

  await desbloquearSalaoAdminMaster({
    idSalao: id,
    idAdmin: admin.usuario.id,
    motivo: body.motivo || "Desbloqueio manual pelo AdminMaster.",
  });

  return NextResponse.json({ ok: true });
}
