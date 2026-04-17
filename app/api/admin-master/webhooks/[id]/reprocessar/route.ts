import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import {
  AdminMasterAuthError,
  requireAdminMasterUser,
} from "@/lib/admin-master/auth/requireAdminMasterUser";
import {
  buildWebhookMirrorKey,
  syncAdminMasterWebhookEvents,
} from "@/lib/admin-master/webhooks-sync";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function normalizeHost(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
}

async function buildWebhookReplayUrl() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host")?.split(",")[0];
  const forwardedProto = headerStore.get("x-forwarded-proto")?.split(",")[0];
  const host = forwardedHost || headerStore.get("host");
  const normalizedHost = normalizeHost(host);
  const isCustomDomain =
    normalizedHost === "salaopremiun.com.br" ||
    normalizedHost === "www.salaopremiun.com.br" ||
    normalizedHost.endsWith(".salaopremiun.com.br");

  const finalHost = isCustomDomain ? "www.salaopremiun.com.br" : host;
  const proto =
    normalizedHost.includes("localhost") || normalizedHost.startsWith("127.0.0.1")
      ? "http"
      : forwardedProto || "https";

  if (!finalHost) {
    throw new Error("Nao foi possivel determinar o host para reprocessar o webhook.");
  }

  return new URL("/api/webhooks/asaas", `${proto}://${finalHost}`);
}

export async function POST(
  _request: Request,
  context: RouteContext<"/api/admin-master/webhooks/[id]/reprocessar">
) {
  let reprocessamentoId: string | null = null;

  try {
    const admin = await requireAdminMasterUser("operacao_reprocessar");
    const { id } = await context.params;
    const webhookId = String(id || "").trim();

    if (!webhookId) {
      return NextResponse.json(
        { ok: false, error: "Webhook nao informado." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const mirrorKey = buildWebhookMirrorKey(webhookId);

    const { data: eventoAsaas, error: eventoError } = await supabase
      .from("asaas_webhook_eventos")
      .select("id, evento, payment_id, status_processamento, payload")
      .eq("id", webhookId)
      .maybeSingle();

    if (eventoError) {
      throw new Error(eventoError.message || "Erro ao carregar o webhook Asaas.");
    }

    if (!eventoAsaas?.id) {
      return NextResponse.json(
        { ok: false, error: "Webhook nao encontrado." },
        { status: 404 }
      );
    }

    const payload =
      eventoAsaas.payload && typeof eventoAsaas.payload === "object"
        ? (eventoAsaas.payload as Record<string, unknown>)
        : null;

    if (!payload) {
      return NextResponse.json(
        { ok: false, error: "Webhook sem payload bruto para reprocesso." },
        { status: 400 }
      );
    }

    const { data: reprocessamento } = await supabase
      .from("reprocessamentos_sistema")
      .insert({
        tipo: "manual",
        entidade: "asaas_webhook_eventos",
        entidade_id: webhookId,
        id_admin_usuario: admin.usuario.id,
        status: "processando",
        resultado_json: {
          origem: "admin_master",
          mirror_key: mirrorKey,
          evento: eventoAsaas.evento || null,
          payment_id: eventoAsaas.payment_id || null,
          status_anterior: eventoAsaas.status_processamento || null,
        },
      })
      .select("id")
      .single();

    reprocessamentoId = reprocessamento?.id || null;

    const now = new Date().toISOString();

    await supabase
      .from("asaas_webhook_eventos")
      .update({
        status_processamento: "erro",
        erro_mensagem: "Reprocessamento manual solicitado pelo AdminMaster.",
        processado_em: null,
        updated_at: now,
      })
      .eq("id", webhookId);

    await supabase
      .from("eventos_webhook")
      .update({
        status: "pendente",
        erro_texto: "Reprocessamento manual solicitado pelo AdminMaster.",
        processado_em: null,
        atualizado_em: now,
      })
      .eq("chave", mirrorKey);

    const replayUrl = await buildWebhookReplayUrl();
    const accessToken = String(process.env.ASAAS_WEBHOOK_TOKEN || "").trim();

    if (!accessToken) {
      throw new Error("ASAAS_WEBHOOK_TOKEN nao configurado para o replay interno.");
    }

    const replayResponse = await fetch(replayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "asaas-access-token": accessToken,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const replayResult = (await replayResponse
      .json()
      .catch(() => ({ ok: false, error: "Resposta nao JSON no replay." }))) as
      | Record<string, unknown>
      | { ok?: boolean; error?: string };

    const replaySucceeded =
      replayResponse.ok && (replayResult.ok === undefined || replayResult.ok !== false);

    if (reprocessamentoId) {
      await supabase
        .from("reprocessamentos_sistema")
        .update({
          status: replaySucceeded ? "processado" : "erro",
          resultado_json: {
            origem: "admin_master",
            replay_url: replayUrl.toString(),
            http_status: replayResponse.status,
            replay_result: replayResult,
          },
        })
        .eq("id", reprocessamentoId);
    }

    await registrarAdminMasterAuditoria({
      idAdmin: admin.usuario.id,
      acao: "reprocessar_webhook_asaas",
      entidade: "asaas_webhook_eventos",
      entidadeId: webhookId,
      descricao: "Reprocessamento manual de webhook solicitado pelo AdminMaster.",
      payload: {
        mirrorKey,
        replayUrl: replayUrl.toString(),
        replaySucceeded,
        httpStatus: replayResponse.status,
        replayResult,
      },
    });

    await syncAdminMasterWebhookEvents();

    if (!replaySucceeded) {
      throw new Error(
        String(replayResult.error || "Falha ao reprocessar o webhook.")
      );
    }

    return NextResponse.json({
      ok: true,
      resultado: {
        webhookId,
        mirrorKey,
        replayResult,
      },
    });
  } catch (error) {
    if (reprocessamentoId) {
      const supabase = getSupabaseAdmin();
      await supabase
        .from("reprocessamentos_sistema")
        .update({
          status: "erro",
          resultado_json: {
            origem: "admin_master",
            erro:
              error instanceof Error ? error.message : "Falha ao reprocessar webhook.",
          },
        })
        .eq("id", reprocessamentoId);
    }

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
          error instanceof Error ? error.message : "Falha ao reprocessar webhook.",
      },
      { status: 500 }
    );
  }
}
