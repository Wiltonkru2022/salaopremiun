import { NextRequest, NextResponse } from "next/server";
import { resolverAlertaAdminMaster } from "@/lib/admin-master/actions";
import { getAdminMasterAccess } from "@/lib/admin-master/auth/requireAdminMasterUser";

type Payload = {
  motivo?: string;
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminMasterAccess("dashboard_ver");

    if (!admin.ok) {
      return NextResponse.json(
        { ok: false, error: admin.message },
        { status: admin.status }
      );
    }

    if (
      !admin.permissions.operacao_reprocessar &&
      !admin.permissions.tickets_editar
    ) {
      return NextResponse.json(
        { ok: false, error: "Usuario sem permissao para resolver alertas." },
        { status: 403 }
      );
    }

    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as Payload;
    const resultado = await resolverAlertaAdminMaster({
      idAlerta: id,
      idAdmin: admin.usuario.id,
      motivo: body.motivo || "Resolvido manualmente pelo AdminMaster.",
    });

    return NextResponse.json({ ok: true, resultado });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel resolver o alerta.",
      },
      { status: 500 }
    );
  }
}
