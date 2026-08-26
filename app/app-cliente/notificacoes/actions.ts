"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClienteAppContext } from "@/lib/client-context.server";
import { getDatabaseAdmin } from "@/lib/db/admin";

async function loadOwnedNotification(idConta: string, id: string) {
  const { data, error } = await (getDatabaseAdmin() as any)
    .from("notification_jobs")
    .select("id, metadata")
    .eq("id", id)
    .eq("cliente_app_conta_id", idConta)
    .eq("canal", "cliente_app")
    .maybeSingle();

  if (error || !data?.id) return null;
  return data as { id: string; metadata?: Record<string, unknown> | null };
}

function revalidateClienteNotificationSurfaces() {
  revalidatePath("/app-cliente");
  revalidatePath("/app-cliente/perfil");
  revalidatePath("/app-cliente/notificacoes");
}

export async function markClienteNotificationReadAction(formData: FormData) {
  const session = await requireClienteAppContext();
  const id = String(formData.get("notificacao") || "").trim();
  if (!id) return;

  const notification = await loadOwnedNotification(session.idConta, id);
  if (!notification) return;

  await (getDatabaseAdmin() as any)
    .from("notification_jobs")
    .update({
      metadata: {
        ...(notification.metadata || {}),
        cliente_lida_em: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("cliente_app_conta_id", session.idConta)
    .eq("canal", "cliente_app");

  revalidateClienteNotificationSurfaces();
}

export async function openClienteNotificationAction(formData: FormData) {
  await markClienteNotificationReadAction(formData);

  const requestedDestination = String(formData.get("destino") || "").trim();
  const destination =
    requestedDestination === "/app-cliente" ||
    requestedDestination.startsWith("/app-cliente/")
      ? requestedDestination
      : "/app-cliente/notificacoes";

  redirect(destination);
}

export async function markClienteNotificationUnreadAction(formData: FormData) {
  const session = await requireClienteAppContext();
  const id = String(formData.get("notificacao") || "").trim();
  if (!id) return;

  const notification = await loadOwnedNotification(session.idConta, id);
  if (!notification) return;

  const metadata = { ...(notification.metadata || {}) };
  delete metadata.cliente_lida_em;

  await (getDatabaseAdmin() as any)
    .from("notification_jobs")
    .update({
      metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("cliente_app_conta_id", session.idConta)
    .eq("canal", "cliente_app");

  revalidateClienteNotificationSurfaces();
}

export async function markAllClienteNotificationsReadAction() {
  const session = await requireClienteAppContext();
  const { data } = await (getDatabaseAdmin() as any)
    .from("notification_jobs")
    .select("id, metadata")
    .eq("cliente_app_conta_id", session.idConta)
    .eq("canal", "cliente_app")
    .limit(200);

  const now = new Date().toISOString();
  await Promise.all(
    ((data || []) as Array<{ id: string; metadata?: Record<string, unknown> | null }>)
      .filter((item) => !item.metadata?.cliente_lida_em)
      .map((item) =>
        (getDatabaseAdmin() as any)
          .from("notification_jobs")
          .update({
            metadata: {
              ...(item.metadata || {}),
              cliente_lida_em: now,
            },
            updated_at: now,
          })
          .eq("id", item.id)
      )
  );

  revalidateClienteNotificationSurfaces();
}
