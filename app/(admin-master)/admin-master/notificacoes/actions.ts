"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  broadcastPushNotification,
  type BroadcastPushTarget,
} from "@/lib/push-notifications";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import {
  CLIENT_VISUAL_NOTIFICATION_CHANNEL,
  normalizeClientVisualNoticeUrl,
  parseClientVisualNoticeConfig,
  parseSaoPauloDateTimeLocal,
} from "@/lib/client-app/visual-notifications";
import { getDatabaseAdmin } from "@/lib/db/admin";

function isTarget(value: string): value is BroadcastPushTarget {
  return ["todos", "clientes", "profissionais", "saloes"].includes(value);
}

function visualError(message: string): never {
  redirect(
    `/admin-master/notificacoes/nova?erro=${encodeURIComponent(message)}`
  );
}

function readVisualForm(formData: FormData) {
  const title = String(formData.get("visual_title") || "").trim();
  const body = String(formData.get("visual_body") || "").trim();
  const toneValue = String(formData.get("visual_type") || "informacao").trim();
  const presentationValue = String(
    formData.get("visual_presentation") || "modal"
  ).trim();
  const buttonText =
    String(formData.get("visual_button_text") || "").trim().slice(0, 40) || null;
  const url = normalizeClientVisualNoticeUrl(formData.get("visual_url"));
  const blocking = formData.get("visual_blocking") === "on";
  const dismissible =
    !blocking && formData.get("visual_dismissible") === "on";
  const priorityRaw = Number(formData.get("visual_priority") || 0);
  const priority = Number.isFinite(priorityRaw)
    ? Math.max(-100, Math.min(100, Math.trunc(priorityRaw)))
    : 0;
  const startsAt =
    parseSaoPauloDateTimeLocal(formData.get("visual_starts_at")) ||
    new Date().toISOString();
  const endsAt = parseSaoPauloDateTimeLocal(formData.get("visual_ends_at"));
  const allowedTones = new Set([
    "informacao",
    "manutencao",
    "aviso",
    "promocao",
  ]);
  const tone = allowedTones.has(toneValue) ? toneValue : "informacao";
  const presentation =
    blocking || presentationValue !== "banner" ? "modal" : "banner";

  if (!title || title.length > 80) {
    visualError("Informe um título de até 80 caracteres.");
  }
  if (!body || body.length > 500) {
    visualError("Informe uma mensagem de até 500 caracteres.");
  }

  const startsAtMs = new Date(startsAt).getTime();
  const endsAtMs = endsAt ? new Date(endsAt).getTime() : null;
  if (endsAtMs !== null && endsAtMs <= startsAtMs) {
    visualError("O término do aviso precisa ser posterior ao início.");
  }

  return {
    title,
    body,
    tone,
    presentation,
    buttonText,
    url,
    blocking,
    dismissible,
    priority,
    startsAt,
    endsAt,
  };
}

function visualFilters(input: ReturnType<typeof readVisualForm>) {
  return {
    canal: CLIENT_VISUAL_NOTIFICATION_CHANNEL,
    apresentacao: input.presentation,
    dispensavel: input.dismissible,
    bloqueante: input.blocking,
    botao_texto: input.buttonText,
    fim_em: input.endsAt,
    prioridade: input.priority,
  };
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
          : "Não foi possível enviar a notificação."
      )}`
    );
  }

  redirect(
    `/admin-master/notificacoes/nova?ok=${encodeURIComponent(
      `Notificação enviada para ${sent} aparelho(s).`
    )}`
  );
}

export async function publicarAvisoVisualClienteAction(formData: FormData) {
  const access = await requireAdminMasterUser("notificacoes_editar");
  const input = readVisualForm(formData);
  const database = getDatabaseAdmin() as any;
  const now = new Date();
  const startsAtMs = new Date(input.startsAt).getTime();
  const status = startsAtMs > now.getTime() ? "agendada" : "publicada";

  const { data, error } = await database
    .from("notificacoes_globais")
    .insert({
      titulo: input.title,
      descricao: input.body,
      tipo: input.tone,
      publico_tipo: "clientes",
      filtros_json: visualFilters(input),
      link_url: input.url,
      status,
      agendada_em: input.startsAt,
      enviada_em: status === "publicada" ? now.toISOString() : null,
      criada_por: access.usuario.id,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error("[admin-visual-notice] create failed", error);
    visualError("Não foi possível publicar o aviso visual.");
  }

  revalidatePath("/admin-master/notificacoes");
  redirect(
    `/admin-master/notificacoes/${data.id}?ok=${encodeURIComponent(
      status === "agendada"
        ? "Aviso visual agendado para o App Cliente."
        : "Aviso visual publicado no App Cliente."
    )}`
  );
}

export async function atualizarAvisoVisualClienteAction(formData: FormData) {
  await requireAdminMasterUser("notificacoes_editar");
  const id = String(formData.get("id") || "").trim();
  if (!id) visualError("Aviso inválido.");

  const input = readVisualForm(formData);
  const database = getDatabaseAdmin() as any;
  const { data: current, error: currentError } = await database
    .from("notificacoes_globais")
    .select("id, filtros_json")
    .eq("id", id)
    .maybeSingle();

  if (
    currentError ||
    !current?.id ||
    !parseClientVisualNoticeConfig(current.filtros_json)
  ) {
    visualError("Aviso visual não encontrado.");
  }

  const now = new Date();
  const startsAtMs = new Date(input.startsAt).getTime();
  const status = startsAtMs > now.getTime() ? "agendada" : "publicada";
  const { error } = await database
    .from("notificacoes_globais")
    .update({
      titulo: input.title,
      descricao: input.body,
      tipo: input.tone,
      filtros_json: visualFilters(input),
      link_url: input.url,
      status,
      agendada_em: input.startsAt,
      enviada_em: status === "publicada" ? now.toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    console.error("[admin-visual-notice] update failed", error);
    visualError("Não foi possível atualizar o aviso visual.");
  }

  revalidatePath("/admin-master/notificacoes");
  revalidatePath(`/admin-master/notificacoes/${id}`);
  redirect(
    `/admin-master/notificacoes/${id}?ok=${encodeURIComponent(
      "Aviso visual atualizado."
    )}`
  );
}

export async function encerrarAvisoVisualClienteAction(formData: FormData) {
  await requireAdminMasterUser("notificacoes_editar");
  const id = String(formData.get("id") || "").trim();
  if (!id) visualError("Aviso inválido.");

  const database = getDatabaseAdmin() as any;
  const { data: current, error: currentError } = await database
    .from("notificacoes_globais")
    .select("id, filtros_json")
    .eq("id", id)
    .maybeSingle();

  if (
    currentError ||
    !current?.id ||
    !parseClientVisualNoticeConfig(current.filtros_json)
  ) {
    visualError("Aviso visual não encontrado.");
  }

  const { error } = await database
    .from("notificacoes_globais")
    .update({ status: "encerrada" })
    .eq("id", id);

  if (error) {
    console.error("[admin-visual-notice] close failed", error);
    visualError("Não foi possível encerrar o aviso visual.");
  }

  revalidatePath("/admin-master/notificacoes");
  revalidatePath(`/admin-master/notificacoes/${id}`);
  redirect(
    `/admin-master/notificacoes/${id}?ok=${encodeURIComponent(
      "Aviso visual encerrado. Ele não aparecerá mais no App Cliente."
    )}`
  );
}
