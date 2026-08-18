import { NextRequest, NextResponse } from "next/server";
import { getAdminMasterAccess } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { sendTrialAlertNow } from "@/services/trialLifecycleService";

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
      tipo?: string;
      markSent?: boolean;
    };
    const result = await sendTrialAlertNow({
      idSalao: id,
      type: body.tipo || "manual",
      markSent: Boolean(body.markSent),
    });

    await registrarAdminMasterAuditoria({
      idAdmin: access.usuario.id,
      acao: "enviar_email_trial",
      entidade: "assinaturas",
      entidadeId: id,
      descricao: "Aviso de teste gratis enviado pelo sistema.",
      payload: { tipo: body.tipo || "manual", result },
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao enviar aviso de teste gratis.",
      },
      { status: 500 }
    );
  }
}
