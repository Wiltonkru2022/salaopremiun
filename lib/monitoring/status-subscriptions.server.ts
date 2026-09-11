import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { htmlEscape, sendBrevoEmail } from "@/lib/email/brevo";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function subscriptionSecret() {
  return String(process.env.STATUS_SUBSCRIPTION_SECRET || process.env.CRON_SECRET || "").trim();
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(value: unknown) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function statusBaseUrl() {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    "https://salaopremiun.com.br";
  return `${String(origin).replace(/\/$/, "")}/status`;
}

function makeUnsubscribeToken(id: string) {
  const secret = subscriptionSecret();
  if (!secret) throw new Error("STATUS_SUBSCRIPTION_SECRET/CRON_SECRET não configurado.");
  const signature = createHmac("sha256", secret).update(id).digest("base64url");
  return `${id}.${signature}`;
}

function verifyUnsubscribeToken(token: string) {
  const [id, signature] = String(token || "").split(".");
  if (!id || !signature) return null;
  const secret = subscriptionSecret();
  if (!secret) return null;
  const expected = createHmac("sha256", secret).update(id).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}

export async function requestStatusSubscription(rawEmail: unknown) {
  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: true, accepted: false };
  if (!subscriptionSecret()) return { ok: false, accepted: false, reason: "subscription_not_configured" };

  const supabase = getSupabaseAdmin() as any;
  const { data: existing } = await supabase
    .from("status_subscriptions")
    .select("id, status, updated_at")
    .ilike("email", email)
    .maybeSingle();

  const lastUpdated = existing?.updated_at ? Date.parse(existing.updated_at) : 0;
  if (existing && Date.now() - lastUpdated < 15 * 60 * 1000) {
    return { ok: true, accepted: true, throttled: true };
  }

  const confirmationToken = randomBytes(32).toString("base64url");
  let id = existing?.id as string | undefined;

  if (id) {
    const unsubscribeToken = makeUnsubscribeToken(id);
    await supabase
      .from("status_subscriptions")
      .update({
        email,
        status: "pending",
        confirm_token_hash: sha256(confirmationToken),
        unsubscribe_token_hash: sha256(unsubscribeToken),
        unsubscribed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  } else {
    const temporaryUnsubscribeHash = sha256(randomBytes(32).toString("base64url"));
    const { data, error } = await supabase
      .from("status_subscriptions")
      .insert({
        email,
        status: "pending",
        confirm_token_hash: sha256(confirmationToken),
        unsubscribe_token_hash: temporaryUnsubscribeHash,
      })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
    const unsubscribeToken = makeUnsubscribeToken(id!);
    await supabase
      .from("status_subscriptions")
      .update({ unsubscribe_token_hash: sha256(unsubscribeToken) })
      .eq("id", id);
  }

  const confirmUrl = `${statusBaseUrl()}/confirmar?token=${encodeURIComponent(confirmationToken)}`;
  await sendBrevoEmail({
    from: "SalãoPremium Status <status@salaopremiun.com.br>",
    to: email,
    subject: "Confirme as atualizações de status do SalãoPremium",
    idempotencyKey: `status-confirm:${id}:${sha256(confirmationToken).slice(0, 16)}`,
    text: `Confirme sua inscrição nas atualizações de status do SalãoPremium: ${confirmUrl}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#18181b"><h1>Atualizações de status</h1><p>Confirme que deseja receber avisos sobre incidentes públicos do SalãoPremium.</p><p><a href="${htmlEscape(confirmUrl)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#111827;color:#fff;text-decoration:none;font-weight:700">Confirmar inscrição</a></p><p style="font-size:12px;color:#71717a">Se você não solicitou, ignore este e-mail.</p></div>`,
  });

  return { ok: true, accepted: true };
}

export async function confirmStatusSubscription(token: string) {
  const hash = sha256(String(token || ""));
  const supabase = getSupabaseAdmin() as any;
  const { data, error } = await supabase
    .from("status_subscriptions")
    .select("id, status")
    .eq("confirm_token_hash", hash)
    .maybeSingle();
  if (error || !data?.id) return false;

  const unsubscribeToken = makeUnsubscribeToken(data.id);
  const { error: updateError } = await supabase
    .from("status_subscriptions")
    .update({
      status: "active",
      confirm_token_hash: null,
      unsubscribe_token_hash: sha256(unsubscribeToken),
      confirmado_em: new Date().toISOString(),
      unsubscribed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);
  return !updateError;
}

export async function unsubscribeStatus(token: string) {
  const id = verifyUnsubscribeToken(token);
  if (!id) return false;
  const supabase = getSupabaseAdmin() as any;
  const { data, error } = await supabase
    .from("status_subscriptions")
    .select("unsubscribe_token_hash")
    .eq("id", id)
    .maybeSingle();
  if (error || !data?.unsubscribe_token_hash) return false;
  if (data.unsubscribe_token_hash !== sha256(token)) return false;
  const { error: updateError } = await supabase
    .from("status_subscriptions")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  return !updateError;
}

export async function sendPendingPublicStatusNotifications() {
  if (!subscriptionSecret() || !process.env.BREVO_API_KEY) {
    return { sent: 0, skipped: true };
  }
  const supabase = getSupabaseAdmin() as any;
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const [{ data: updates }, { data: subscriptions }] = await Promise.all([
    supabase
      .from("incident_updates")
      .select("id, incident_id, status_to, public_message, created_at, incidentes_sistema(titulo, mensagem_publica, operational_components(nome))")
      .eq("public_visible", true)
      .not("public_message", "is", null)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(20),
    supabase
      .from("status_subscriptions")
      .select("id, email")
      .eq("status", "active")
      .limit(200),
  ]);

  let sent = 0;
  for (const update of updates || []) {
    for (const subscription of subscriptions || []) {
      if (sent >= 50) return { sent, capped: true };
      const { data: delivery } = await supabase
        .from("status_notification_deliveries")
        .select("id, status")
        .eq("subscription_id", subscription.id)
        .eq("incident_update_id", update.id)
        .maybeSingle();
      if (delivery?.status === "sent") continue;

      const unsubscribeToken = makeUnsubscribeToken(subscription.id);
      const unsubscribeUrl = `${statusBaseUrl()}/cancelar-inscricao?token=${encodeURIComponent(unsubscribeToken)}`;
      const incidentData = Array.isArray(update.incidentes_sistema)
        ? update.incidentes_sistema[0]
        : update.incidentes_sistema;
      const componentData = Array.isArray(incidentData?.operational_components)
        ? incidentData.operational_components[0]
        : incidentData?.operational_components;
      const title = String(incidentData?.titulo || "Atualização operacional");
      const component = String(componentData?.nome || "SalãoPremium");
      const publicMessage = String(update.public_message || incidentData?.mensagem_publica || "Atualização de status disponível.");

      const { data: deliveryRow, error: deliveryError } = await supabase
        .from("status_notification_deliveries")
        .upsert(
          {
            subscription_id: subscription.id,
            incident_update_id: update.id,
            status: "pending",
          },
          { onConflict: "subscription_id,incident_update_id" }
        )
        .select("id")
        .single();
      if (deliveryError) continue;

      try {
        const providerMessageId = await sendBrevoEmail({
          from: "SalãoPremium Status <status@salaopremiun.com.br>",
          to: subscription.email,
          subject: `${component}: ${title}`,
          idempotencyKey: `status-update:${subscription.id}:${update.id}`,
          text: `${component}\n${title}\n${publicMessage}\n\nStatus: ${statusBaseUrl()}\nCancelar inscrição: ${unsubscribeUrl}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#18181b"><div style="font-size:12px;font-weight:700;color:#6b7280">${htmlEscape(component)}</div><h1>${htmlEscape(title)}</h1><p>${htmlEscape(publicMessage)}</p><p><a href="${htmlEscape(statusBaseUrl())}">Ver status do SalãoPremium</a></p><hr style="border:0;border-top:1px solid #e5e7eb"><p style="font-size:12px;color:#71717a"><a href="${htmlEscape(unsubscribeUrl)}">Cancelar inscrição</a></p></div>`,
        });
        await supabase
          .from("status_notification_deliveries")
          .update({ status: "sent", provider_message_id: providerMessageId, sent_at: new Date().toISOString() })
          .eq("id", deliveryRow.id);
        sent += 1;
      } catch (error) {
        await supabase
          .from("status_notification_deliveries")
          .update({ status: "failed", erro_texto: error instanceof Error ? error.message.slice(0, 300) : "Falha no envio." })
          .eq("id", deliveryRow.id);
      }
    }
  }

  return { sent, capped: false };
}
