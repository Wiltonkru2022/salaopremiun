import type { AdminMasterWebhookService } from "@/services/adminMasterWebhookService";

export class AdminMasterWebhookUseCaseError extends Error {
  constructor(
    message: string,
    public status: number,
    public reprocessamentoId?: string
  ) {
    super(message);
    this.name = "AdminMasterWebhookUseCaseError";
  }
}

async function requireAccess(service: AdminMasterWebhookService) {
  const admin = await service.getAccess("operacao_reprocessar");

  if (!admin.ok) {
    throw new AdminMasterWebhookUseCaseError(admin.message, admin.status);
  }

  return admin;
}

function mapWebhookError(error: unknown, fallback: string) {
  if (error instanceof AdminMasterWebhookUseCaseError) {
    return error;
  }

  const message = error instanceof Error ? error.message : fallback;
  return new AdminMasterWebhookUseCaseError(message || fallback, 500);
}

export async function diagnosticarAdminMasterWebhookUseCase(params: {
  service: AdminMasterWebhookService;
}) {
  try {
    const admin = await requireAccess(params.service);
    const resultado = await params.service.testarEndpointPublico();

    await params.service.registrarAuditoria({
      idAdmin: admin.usuario.id,
      acao: "testar_endpoint_asaas_webhook",
      entidade: "eventos_webhook",
      descricao:
        "Teste manual do endpoint publico do webhook Asaas pelo AdminMaster.",
      payload: resultado,
    });

    return {
      status: 200,
      body: {
        ok: resultado.healthy,
        resultado,
        error: resultado.healthy
          ? undefined
          : "Endpoint Asaas nao respondeu com 401 direto. Revise redirect de dominio.",
      },
    };
  } catch (error) {
    throw mapWebhookError(error, "Falha ao testar endpoint Asaas.");
  }
}

export async function sincronizarAdminMasterWebhooksUseCase(params: {
  service: AdminMasterWebhookService;
}) {
  try {
    const admin = await requireAccess(params.service);
    const resultado = await params.service.sincronizarEventos();

    await params.service.registrarAuditoria({
      idAdmin: admin.usuario.id,
      acao: "sincronizar_webhooks_admin_master",
      entidade: "eventos_webhook",
      descricao:
        "Sincronizacao manual dos eventos reais do Asaas para diagnostico no AdminMaster.",
      payload: resultado,
    });

    return {
      status: 200,
      body: {
        ok: true,
        resultado,
      },
    };
  } catch (error) {
    throw mapWebhookError(error, "Falha ao sincronizar webhooks.");
  }
}

export async function reprocessarAdminMasterWebhookUseCase(params: {
  webhookId: string;
  service: AdminMasterWebhookService;
}) {
  let reprocessamentoId = "";

  try {
    const admin = await requireAccess(params.service);
    const webhookId = String(params.webhookId || "").trim();

    if (!webhookId) {
      throw new AdminMasterWebhookUseCaseError("Webhook nao informado.", 400);
    }

    const mirrorKey = params.service.buildMirrorKey(webhookId);
    const eventoAsaas = await params.service.carregarEventoAsaas(webhookId);

    if (!eventoAsaas?.id) {
      throw new AdminMasterWebhookUseCaseError("Webhook nao encontrado.", 404);
    }

    const payload =
      eventoAsaas.payload && typeof eventoAsaas.payload === "object"
        ? eventoAsaas.payload
        : null;

    if (!payload) {
      throw new AdminMasterWebhookUseCaseError(
        "Webhook sem payload bruto para reprocesso.",
        400
      );
    }

    reprocessamentoId = await params.service.iniciarReprocessamento({
      webhookId,
      idAdmin: admin.usuario.id,
      mirrorKey,
      evento: eventoAsaas.evento,
      paymentId: eventoAsaas.payment_id,
      statusAnterior: eventoAsaas.status_processamento,
    });

    const nowIso = new Date().toISOString();
    await params.service.prepararEventoParaReplay({
      webhookId,
      mirrorKey,
      nowIso,
    });

    const replayUrl = await params.service.buildReplayUrl();
    const replay = await params.service.replayWebhook({ replayUrl, payload });

    await params.service.finalizarReprocessamento({
      reprocessamentoId,
      status: replay.succeeded ? "processado" : "erro",
      resultado: {
        origem: "admin_master",
        replay_url: replayUrl.toString(),
        http_status: replay.httpStatus,
        replay_result: replay.result,
      },
    });

    await params.service.registrarAuditoria({
      idAdmin: admin.usuario.id,
      acao: "reprocessar_webhook_asaas",
      entidade: "asaas_webhook_eventos",
      entidadeId: webhookId,
      descricao: "Reprocessamento manual de webhook solicitado pelo AdminMaster.",
      payload: {
        mirrorKey,
        replayUrl: replayUrl.toString(),
        replaySucceeded: replay.succeeded,
        httpStatus: replay.httpStatus,
        replayResult: replay.result,
      },
    });

    await params.service.sincronizarEventos();

    if (!replay.succeeded) {
      throw new AdminMasterWebhookUseCaseError(
        String(replay.result.error || "Falha ao reprocessar o webhook."),
        500,
        reprocessamentoId
      );
    }

    return {
      status: 200,
      body: {
        ok: true,
        resultado: {
          webhookId,
          mirrorKey,
          replayResult: replay.result,
        },
      },
    };
  } catch (error) {
    const mapped = mapWebhookError(error, "Falha ao reprocessar webhook.");
    mapped.reprocessamentoId ||= reprocessamentoId;

    if (mapped.reprocessamentoId) {
      await params.service.finalizarReprocessamento({
        reprocessamentoId: mapped.reprocessamentoId,
        status: "erro",
        resultado: {
          origem: "admin_master",
          erro: mapped.message,
        },
      });
    }

    throw mapped;
  }
}
