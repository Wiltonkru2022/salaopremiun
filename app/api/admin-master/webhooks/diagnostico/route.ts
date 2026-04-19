import { NextResponse } from "next/server";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import {
  AdminMasterAuthError,
  requireAdminMasterUser,
} from "@/lib/admin-master/auth/requireAdminMasterUser";

const ASAAS_WEBHOOK_PUBLIC_URL =
  "https://salaopremiun.com.br/api/webhooks/asaas";

export async function POST() {
  try {
    const admin = await requireAdminMasterUser("operacao_reprocessar");

    const response = await fetch(ASAAS_WEBHOOK_PUBLIC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      cache: "no-store",
      redirect: "manual",
    });

    const location = response.headers.get("location");
    const healthy = response.status === 401 && !location;
    const resultado = {
      endpoint: ASAAS_WEBHOOK_PUBLIC_URL,
      httpStatus: response.status,
      redirectLocation: location,
      healthy,
      expected:
        "POST sem token deve retornar 401 direto no handler, sem redirect.",
    };

    await registrarAdminMasterAuditoria({
      idAdmin: admin.usuario.id,
      acao: "testar_endpoint_asaas_webhook",
      entidade: "eventos_webhook",
      descricao:
        "Teste manual do endpoint publico do webhook Asaas pelo AdminMaster.",
      payload: resultado,
    });

    return NextResponse.json({
      ok: healthy,
      resultado,
      error: healthy
        ? undefined
        : "Endpoint Asaas nao respondeu com 401 direto. Revise redirect de dominio.",
    });
  } catch (error) {
    if (error instanceof AdminMasterAuthError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao testar endpoint Asaas.",
      },
      { status: 500 }
    );
  }
}
