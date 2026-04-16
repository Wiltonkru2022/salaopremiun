import { NextRequest, NextResponse } from "next/server";
import { criarTicketPorAlertaAdminMaster } from "@/lib/admin-master/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";

type Payload = {
  mensagem?: string;
  assumir?: boolean;
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminMasterUser("dashboard_ver");

  if (
    !admin.permissions.tickets_editar &&
    !admin.permissions.operacao_reprocessar
  ) {
    return NextResponse.json(
      { ok: false, error: "Usuario sem permissao para criar ticket por alerta." },
      { status: 403 }
    );
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Payload;
  const resultado = await criarTicketPorAlertaAdminMaster({
    idAlerta: id,
    idAdmin: admin.usuario.id,
    mensagem: body.mensagem || null,
    assumir: body.assumir ?? true,
  });

  return NextResponse.json({ ok: true, resultado });
}
