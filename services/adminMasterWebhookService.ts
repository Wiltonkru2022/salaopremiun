import { headers } from "next/headers";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import {
  getAdminMasterAccess,
  type AdminMasterAccessResult,
} from "@/lib/admin-master/auth/requireAdminMasterUser";
import type { AdminMasterPermissionKey } from "@/lib/admin-master/auth/adminMasterPermissions";
import {
  buildWebhookMirrorKey,
  syncAdminMasterWebhookEvents,
} from "@/lib/admin-master/webhooks-sync";
import {
  DOMINIO_WWW,
  getPublicWebhookUrl,
  isLocalHost,
  isManagedAppHost,
  normalizeHost,
} from "@/lib/proxy/domain-config";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import type { Json } from "@/types/database.generated";

export type AdminMasterWebhookReplayEvent = {
  id: string;
  evento?: string | null;
  payment_id?: string | null;
  status_processamento?: string | null;
  payload?: Record<string, unknown> | null;
};

export function createAdminMasterWebhookService() {
  return {
    getAccess(
      permission: AdminMasterPermissionKey
    ): Promise<AdminMasterAccessResult> {
      return getAdminMasterAccess(permission);
    },

    sincronizarEventos() {
      return syncAdminMasterWebhookEvents();
    },

    buildMirrorKey(webhookId: string) {
      return buildWebhookMirrorKey(webhookId);
    },

    async testarEndpointPublico() {
      const endpoint = getPublicWebhookUrl();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        cache: "no-store",
        redirect: "manual",
      });
      const location = response.headers.get("location");
      const healthy = response.status === 401 && !location;

      return {
        endpoint,
        httpStatus: response.status,
        redirectLocation: location,
        healthy,
        expected:
          "POST sem token deve retornar 401 direto no handler, sem redirect.",
      };
    },

    async carregarEventoAsaas(webhookId: string) {
      return runAdminOperation({
        action: "admin_master_webhook_carregar_evento_asaas",
        run: async (supabase) => {
          const { data, error } = await supabase
            .from("asaas_webhook_eventos")
            .select("id, evento, payment_id, status_processamento, payload")
            .eq("id", webhookId)
            .maybeSingle();

          if (error) {
            throw new Error(
              error.message || "Erro ao carregar o webhook Asaas."
            );
          }

          return (data || null) as AdminMasterWebhookReplayEvent | null;
        },
      });
    },

    async iniciarReprocessamento(params: {
      webhookId: string;
      idAdmin: string;
      mirrorKey: string;
      evento?: string | null;
      paymentId?: string | null;
      statusAnterior?: string | null;
    }) {
      return runAdminOperation({
        action: "admin_master_webhook_iniciar_reprocessamento",
        actorId: params.idAdmin,
        run: async (supabase) => {
          const { data } = await supabase
            .from("reprocessamentos_sistema")
            .insert({
              tipo: "manual",
              entidade: "asaas_webhook_eventos",
              entidade_id: params.webhookId,
              id_admin_usuario: params.idAdmin,
              status: "processando",
              resultado_json: {
                origem: "admin_master",
                mirror_key: params.mirrorKey,
                evento: params.evento || null,
                payment_id: params.paymentId || null,
                status_anterior: params.statusAnterior || null,
              },
            })
            .select("id")
            .single();

          return String(data?.id || "");
        },
      });
    },

    async prepararEventoParaReplay(params: {
      webhookId: string;
      mirrorKey: string;
      nowIso: string;
    }) {
      await runAdminOperation({
        action: "admin_master_webhook_preparar_evento_replay",
        run: async (supabase) => {
          await supabase
            .from("asaas_webhook_eventos")
            .update({
              status_processamento: "erro",
              erro_mensagem:
                "Reprocessamento manual solicitado pelo AdminMaster.",
              processado_em: null,
              updated_at: params.nowIso,
            })
            .eq("id", params.webhookId);

          await supabase
            .from("eventos_webhook")
            .update({
              status: "pendente",
              erro_texto: "Reprocessamento manual solicitado pelo AdminMaster.",
              processado_em: null,
              atualizado_em: params.nowIso,
            })
            .eq("chave", params.mirrorKey);
        },
      });
    },

    async buildReplayUrl() {
      const headerStore = await headers();
      const forwardedHost = headerStore.get("x-forwarded-host")?.split(",")[0];
      const forwardedProto = headerStore.get("x-forwarded-proto")?.split(",")[0];
      const host = forwardedHost || headerStore.get("host");
      const normalizedHost = normalizeHost(host);
      const isCustomDomain = isManagedAppHost(normalizedHost);
      const finalHost = isCustomDomain ? DOMINIO_WWW : host;
      const proto = isLocalHost(normalizedHost)
        ? "http"
        : forwardedProto || "https";

      if (!finalHost) {
        throw new Error(
          "Nao foi possivel determinar o host para reprocessar o webhook."
        );
      }

      return new URL("/api/webhooks/asaas", `${proto}://${finalHost}`);
    },

    async replayWebhook(params: { replayUrl: URL; payload: Record<string, unknown> }) {
      const accessToken = String(process.env.ASAAS_WEBHOOK_TOKEN || "").trim();

      if (!accessToken) {
        throw new Error("ASAAS_WEBHOOK_TOKEN nao configurado para o replay interno.");
      }

      const response = await fetch(params.replayUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "asaas-access-token": accessToken,
        },
        body: JSON.stringify(params.payload),
        cache: "no-store",
      });
      const result = (await response
        .json()
        .catch(() => ({ ok: false, error: "Resposta nao JSON no replay." }))) as
        | Record<string, unknown>
        | { ok?: boolean; error?: string };
      const succeeded =
        response.ok && (result.ok === undefined || result.ok !== false);

      return {
        httpStatus: response.status,
        result,
        succeeded,
      };
    },

    async finalizarReprocessamento(params: {
      reprocessamentoId: string;
      status: "processado" | "erro";
      resultado: Record<string, unknown>;
    }) {
      if (!params.reprocessamentoId) return;

      await runAdminOperation({
        action: "admin_master_webhook_finalizar_reprocessamento",
        run: async (supabase) => {
          await supabase
            .from("reprocessamentos_sistema")
            .update({
              status: params.status,
              resultado_json: params.resultado as Json,
            })
            .eq("id", params.reprocessamentoId);
        },
      });
    },

    registrarAuditoria(params: Parameters<typeof registrarAdminMasterAuditoria>[0]) {
      return registrarAdminMasterAuditoria(params);
    },
  };
}

export type AdminMasterWebhookService = ReturnType<
  typeof createAdminMasterWebhookService
>;
