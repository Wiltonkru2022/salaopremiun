import { NextResponse } from "next/server";
import { getAdminMasterAccess } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { queueOracleVpsNotificationProcessing } from "@/lib/oracle-vps/client";

function oracleNotificationProcessingFailed(value: unknown) {
  if (!value || typeof value !== "object") return false;

  const result = value as Record<string, unknown>;
  return result.ok === false || result.success === false || result.status === "error";
}

export async function POST() {
  const access = await getAdminMasterAccess("operacao_reprocessar");

  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.message },
      { status: access.status }
    );
  }

  try {
    const result = await queueOracleVpsNotificationProcessing({
      batchSize: 10,
      requestedBy: access.usuario.id,
      requestedFrom: "admin_master_saude",
    });

    if (oracleNotificationProcessingFailed(result)) {
      return NextResponse.json(
        { ok: false, error: "Oracle VPS retornou falha ao processar notificacoes.", result },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, result }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao registrar job de notificações na VPS.",
      },
      { status: 502 }
    );
  }
}
