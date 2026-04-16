import { NextResponse } from "next/server";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { syncAdminMasterAlerts } from "@/lib/admin-master/alerts-sync";
import { syncAdminMasterWebhookEvents } from "@/lib/admin-master/webhooks-sync";

export async function POST() {
  const admin = await requireAdminMasterUser("operacao_reprocessar");
  const webhooks = await syncAdminMasterWebhookEvents();
  const alertas = await syncAdminMasterAlerts();
  const resultado = { webhooks, alertas };

  await registrarAdminMasterAuditoria({
    idAdmin: admin.usuario.id,
    acao: "sincronizar_operacao_admin_master",
    entidade: "operacao",
    descricao:
      "Sincronizacao manual de webhooks e alertas operacionais do AdminMaster.",
    payload: resultado,
  });

  return NextResponse.json({ ok: true, resultado });
}
