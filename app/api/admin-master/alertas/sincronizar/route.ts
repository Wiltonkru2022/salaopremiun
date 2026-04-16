import { NextResponse } from "next/server";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { syncAdminMasterAlerts } from "@/lib/admin-master/alerts-sync";

export async function POST() {
  const admin = await requireAdminMasterUser("operacao_reprocessar");
  const resultado = await syncAdminMasterAlerts();

  await registrarAdminMasterAuditoria({
    idAdmin: admin.usuario.id,
    acao: "sincronizar_alertas_admin_master",
    entidade: "alertas_sistema",
    descricao: "Sincronizacao manual de alertas automaticos do AdminMaster.",
    payload: resultado,
  });

  return NextResponse.json({ ok: true, resultado });
}
