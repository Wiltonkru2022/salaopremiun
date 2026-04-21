import { z } from "zod";
import type { AdminMasterAlertaService } from "@/services/adminMasterAlertaService";

const resolverAlertaSchema = z.object({
  motivo: z.string().trim().optional(),
});

const criarTicketAlertaSchema = z.object({
  mensagem: z.string().trim().nullable().optional(),
  assumir: z.boolean().optional(),
});

export class AdminMasterAlertaUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AdminMasterAlertaUseCaseError";
  }
}

function mapAlertError(error: unknown, fallback: string) {
  if (error instanceof AdminMasterAlertaUseCaseError) {
    return error;
  }

  const message = error instanceof Error ? error.message : fallback;
  return new AdminMasterAlertaUseCaseError(message || fallback, 500);
}

async function requireAccess(
  service: AdminMasterAlertaService,
  permission: Parameters<AdminMasterAlertaService["getAccess"]>[0]
) {
  const admin = await service.getAccess(permission);

  if (!admin.ok) {
    throw new AdminMasterAlertaUseCaseError(admin.message, admin.status);
  }

  return admin;
}

function assertCanManageAlerts(
  admin: Awaited<ReturnType<typeof requireAccess>>,
  message: string
) {
  if (!admin.permissions.operacao_reprocessar && !admin.permissions.tickets_editar) {
    throw new AdminMasterAlertaUseCaseError(message, 403);
  }
}

export async function sincronizarAdminMasterAlertasUseCase(params: {
  service: AdminMasterAlertaService;
}) {
  try {
    const admin = await requireAccess(params.service, "operacao_reprocessar");
    const resultado = await params.service.sincronizarAlertas();

    await params.service.registrarAuditoria({
      idAdmin: admin.usuario.id,
      acao: "sincronizar_alertas_admin_master",
      entidade: "alertas_sistema",
      descricao: "Sincronizacao manual de alertas automaticos do AdminMaster.",
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
    throw mapAlertError(error, "Nao foi possivel sincronizar alertas.");
  }
}

export async function resolverAdminMasterAlertaUseCase(params: {
  idAlerta: string;
  body: unknown;
  service: AdminMasterAlertaService;
}) {
  try {
    const admin = await requireAccess(params.service, "dashboard_ver");
    assertCanManageAlerts(admin, "Usuario sem permissao para resolver alertas.");

    const input = resolverAlertaSchema.parse(params.body);
    const resultado = await params.service.resolverAlerta({
      idAlerta: params.idAlerta,
      idAdmin: admin.usuario.id,
      motivo: input.motivo || "Resolvido manualmente pelo AdminMaster.",
    });

    return {
      status: 200,
      body: {
        ok: true,
        resultado,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AdminMasterAlertaUseCaseError(
        error.issues[0]?.message || "Payload invalido.",
        400
      );
    }

    throw mapAlertError(error, "Nao foi possivel resolver o alerta.");
  }
}

export async function criarTicketAdminMasterAlertaUseCase(params: {
  idAlerta: string;
  body: unknown;
  service: AdminMasterAlertaService;
}) {
  try {
    const admin = await requireAccess(params.service, "dashboard_ver");
    assertCanManageAlerts(
      admin,
      "Usuario sem permissao para criar ticket por alerta."
    );

    const input = criarTicketAlertaSchema.parse(params.body);
    const resultado = await params.service.criarTicketPorAlerta({
      idAlerta: params.idAlerta,
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
    if (error instanceof z.ZodError) {
      throw new AdminMasterAlertaUseCaseError(
        error.issues[0]?.message || "Payload invalido.",
        400
      );
    }

    throw mapAlertError(error, "Nao foi possivel criar ticket por alerta.");
  }
}
