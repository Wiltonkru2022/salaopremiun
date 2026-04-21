import { z } from "zod";
import type { AdminMasterOperacaoService } from "@/services/adminMasterOperacaoService";
import type { AdminMasterPermissionKey } from "@/lib/admin-master/auth/adminMasterPermissions";

const criarTicketCheckoutSchema = z.object({
  mensagem: z.string().trim().nullable().optional(),
  assumir: z.boolean().optional(),
});

const avaliarTrialSchema = z.object({
  idSalao: z.string().trim().nullable().optional(),
});

export class AdminMasterOperacaoUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AdminMasterOperacaoUseCaseError";
  }
}

async function requireAccess(
  service: AdminMasterOperacaoService,
  permission: AdminMasterPermissionKey
) {
  const admin = await service.getAccess(permission);

  if (!admin.ok) {
    throw new AdminMasterOperacaoUseCaseError(admin.message, admin.status);
  }

  return admin;
}

function mapOperacaoError(error: unknown, fallback: string): never {
  if (error instanceof AdminMasterOperacaoUseCaseError) {
    throw error;
  }

  if (error instanceof z.ZodError) {
    throw new AdminMasterOperacaoUseCaseError(
      error.issues[0]?.message || "Payload invalido.",
      400
    );
  }

  throw new AdminMasterOperacaoUseCaseError(
    error instanceof Error ? error.message : fallback,
    500
  );
}

export async function criarTicketCheckoutAdminMasterUseCase(params: {
  idCheckoutLock: string;
  body: unknown;
  service: AdminMasterOperacaoService;
}) {
  try {
    const admin = await requireAccess(params.service, "dashboard_ver");

    if (
      !admin.permissions.tickets_editar &&
      !admin.permissions.cobrancas_reprocessar &&
      !admin.permissions.operacao_reprocessar
    ) {
      throw new AdminMasterOperacaoUseCaseError(
        "Usuario sem permissao para criar ticket de reconciliacao.",
        403
      );
    }

    const input = criarTicketCheckoutSchema.parse(params.body);
    const resultado = await params.service.criarTicketPorCheckout({
      idCheckoutLock: params.idCheckoutLock,
      idAdmin: admin.usuario.id,
      mensagem: input.mensagem || null,
      assumir: input.assumir ?? true,
    });

    return {
      status: 200,
      body: {
        ok: true,
        resultado,
      },
    };
  } catch (error) {
    mapOperacaoError(error, "Erro ao criar ticket de reconciliacao.");
  }
}

export async function avaliarTrialExtraAdminMasterUseCase(params: {
  body: unknown;
  service: AdminMasterOperacaoService;
}) {
  try {
    await requireAccess(params.service, "operacao_reprocessar");
    const input = avaliarTrialSchema.parse(params.body);
    const data = await params.service.avaliarExtensaoTrial(input.idSalao || null);

    return {
      status: 200,
      body: {
        ok: true,
        data,
      },
    };
  } catch (error) {
    mapOperacaoError(error, "Erro ao avaliar extensao de trial.");
  }
}

export async function sincronizarAdminMasterOperacaoUseCase(params: {
  service: AdminMasterOperacaoService;
}) {
  try {
    const admin = await requireAccess(params.service, "operacao_reprocessar");
    const webhooks = await params.service.sincronizarWebhooks();
    const alertas = await params.service.sincronizarAlertas();
    const resultado = { webhooks, alertas };

    await params.service.registrarAuditoria({
      idAdmin: admin.usuario.id,
      acao: "sincronizar_operacao_admin_master",
      entidade: "operacao",
      descricao:
        "Sincronizacao manual de webhooks e alertas operacionais do AdminMaster.",
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
    mapOperacaoError(error, "Erro ao sincronizar operacao.");
  }
}
