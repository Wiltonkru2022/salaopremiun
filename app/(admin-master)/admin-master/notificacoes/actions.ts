"use server";

import { redirect } from "next/navigation";
import {
  broadcastPushNotification,
  type BroadcastPushTarget,
} from "@/lib/push-notifications";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";

function isTarget(value: string): value is BroadcastPushTarget {
  return ["todos", "clientes", "profissionais", "saloes"].includes(value);
}

export async function dispararNotificacaoAdminMasterAction(formData: FormData) {
  await requireAdminMasterUser("notificacoes_editar");

  const targetValue = String(formData.get("target") || "todos").trim();
  const target = isTarget(targetValue) ? targetValue : "todos";
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const url = String(formData.get("url") || "").trim() || "/";
  const idSalao = String(formData.get("id_salao") || "").trim() || null;
  let sent = 0;

  try {
    const result = await broadcastPushNotification({
      target,
      title,
      body,
      url,
      idSalao,
    });
    sent = result.sent;
  } catch (error) {
    redirect(
      `/admin-master/notificacoes/nova?erro=${encodeURIComponent(
        error instanceof Error
          ? error.message
          : "Nao foi possivel enviar a notificacao."
      )}`
    );
  }

  redirect(
    `/admin-master/notificacoes/nova?ok=${encodeURIComponent(
      `Notificacao enviada para ${sent} aparelho(s).`
    )}`
  );
}
