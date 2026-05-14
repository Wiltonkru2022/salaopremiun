import { NextRequest, NextResponse } from "next/server";
import { getAdminMasterAccess } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { extendOracleVpsTrial } from "@/lib/oracle-vps/client";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const access = await getAdminMasterAccess("assinaturas_ajustar");
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.message },
      { status: access.status }
    );
  }

  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as {
      dias?: number;
      motivo?: string;
      currentTrialEndsAt?: string | null;
    };
    const dias = Math.min(Math.max(Number(body.dias || 3), 1), 30);
    const result = await extendOracleVpsTrial({
      id_salao: id,
      days: dias,
      reason: body.motivo || `Trial prorrogado por ${dias} dia(s) pelo Admin Master.`,
      currentTrialEndsAt: body.currentTrialEndsAt || null,
      requestedBy: access.usuario.id,
    });

    await registrarAdminMasterAuditoria({
      idAdmin: access.usuario.id,
      acao: "prorrogar_trial",
      entidade: "assinaturas",
      entidadeId: id,
      descricao: `Trial prorrogado por ${dias} dia(s).`,
      payload: { dias, result },
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao prorrogar teste gratis.",
      },
      { status: 500 }
    );
  }
}
