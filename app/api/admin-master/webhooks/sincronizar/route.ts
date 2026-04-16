import { NextResponse } from "next/server";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { syncAdminMasterWebhookEvents } from "@/lib/admin-master/webhooks-sync";

export async function POST() {
  const admin = await requireAdminMasterUser("operacao_reprocessar");
  const resultado = await syncAdminMasterWebhookEvents();

  await registrarAdminMasterAuditoria({
    idAdmin: admin.usuario.id,
    acao: "sincronizar_webhooks_admin_master",
    entidade: "eventos_webhook",
    descricao:
      "Sincronizacao manual dos eventos reais do Asaas para diagnostico no AdminMaster.",
    payload: resultado,
  });

  return NextResponse.json({ ok: true, resultado });
}
