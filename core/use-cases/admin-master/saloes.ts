import { z } from "zod";
import type { AdminMasterSalaoService } from "@/services/adminMasterSalaoService";
import type { AdminMasterPermissionKey } from "@/lib/admin-master/auth/adminMasterPermissions";

const motivoSchema = z.object({
  motivo: z.string().trim().optional(),
});

const trocarPlanoSchema = z.object({
  plano: z.string().trim().min(1, "Plano obrigatorio."),
  motivo: z.string().trim().optional(),
});

const ajustarVencimentoSchema = z.object({
  vencimentoEm: z.string().trim().min(1, "Vencimento obrigatorio."),
  motivo: z.string().trim().optional(),
});

const notaInternaSchema = z.object({
  titulo: z.string().trim().min(1, "Titulo e nota sao obrigatorios."),
  nota: z.string().trim().min(1, "Titulo e nota sao obrigatorios."),
});

const criarTicketSchema = z.object({
  assunto: z.string().trim().min(1, "Assunto e mensagem sao obrigatorios."),
  mensagem: z.string().trim().min(1, "Assunto e mensagem sao obrigatorios."),
  prioridade: z.string().trim().nullable().optional(),
  categoria: z.string().trim().nullable().optional(),
});

export class AdminMasterSalaoUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AdminMasterSalaoUseCaseError";
  }
}

async function requireAccess(
  service: AdminMasterSalaoService,
  permission: AdminMasterPermissionKey
) {
  const admin = await service.getAccess(permission);

  if (!admin.ok) {
    throw new AdminMasterSalaoUseCaseError(admin.message, admin.status);
  }

  return admin;
}

function handleSalaoError(error: unknown, fallback: string): never {
  if (error instanceof AdminMasterSalaoUseCaseError) {
    throw error;
  }

  if (error instanceof z.ZodError) {
    throw new AdminMasterSalaoUseCaseError(
      error.issues[0]?.message || "Payload invalido.",
      400
    );
  }

  throw new AdminMasterSalaoUseCaseError(
    error instanceof Error ? error.message : fallback,
    500
  );
}

export async function bloquearAdminMasterSalaoUseCase(params: {
  idSalao: string;
  body: unknown;
  service: AdminMasterSalaoService;
}) {
  try {
    const admin = await requireAccess(params.service, "saloes_editar");
    const input = motivoSchema.parse(params.body);

    await params.service.bloquearSalao({
      idSalao: params.idSalao,
      idAdmin: admin.usuario.id,
      motivo: input.motivo || "Bloqueio manual pelo AdminMaster.",
    });

    return { status: 200, body: { ok: true } };
  } catch (error) {
    handleSalaoError(error, "Erro ao bloquear salao.");
  }
}

export async function listarAdminMasterSaloesUseCase(params: {
  service: AdminMasterSalaoService;
}) {
  try {
    await requireAccess(params.service, "saloes_ver");
    const data = await params.service.listarSaloes();

    return {
      status: 200,
      body: {
        ok: true,
        data,
      },
    };
  } catch (error) {
    handleSalaoError(error, "Erro ao listar saloes.");
  }
}

export async function desbloquearAdminMasterSalaoUseCase(params: {
  idSalao: string;
  body: unknown;
  service: AdminMasterSalaoService;
}) {
  try {
    const admin = await requireAccess(params.service, "saloes_editar");
    const input = motivoSchema.parse(params.body);

    await params.service.desbloquearSalao({
      idSalao: params.idSalao,
      idAdmin: admin.usuario.id,
      motivo: input.motivo || "Desbloqueio manual pelo AdminMaster.",
    });

    return { status: 200, body: { ok: true } };
  } catch (error) {
    handleSalaoError(error, "Erro ao desbloquear salao.");
  }
}

export async function trocarPlanoAdminMasterSalaoUseCase(params: {
  idSalao: string;
  body: unknown;
  service: AdminMasterSalaoService;
}) {
  try {
    const admin = await requireAccess(params.service, "assinaturas_ajustar");
    const input = trocarPlanoSchema.parse(params.body);

    await params.service.trocarPlano({
      idSalao: params.idSalao,
      idAdmin: admin.usuario.id,
      planoCodigo: input.plano,
      motivo: input.motivo || "Troca manual de plano pelo AdminMaster.",
    });

    return { status: 200, body: { ok: true } };
  } catch (error) {
    handleSalaoError(error, "Erro ao trocar plano do salao.");
  }
}

export async function ajustarVencimentoAdminMasterSalaoUseCase(params: {
  idSalao: string;
  body: unknown;
  service: AdminMasterSalaoService;
}) {
  try {
    const admin = await requireAccess(params.service, "assinaturas_ajustar");
    const input = ajustarVencimentoSchema.parse(params.body);

    await params.service.ajustarVencimento({
      idSalao: params.idSalao,
      idAdmin: admin.usuario.id,
      vencimentoEm: input.vencimentoEm,
      motivo: input.motivo || "Ajuste manual de vencimento pelo AdminMaster.",
    });

    return { status: 200, body: { ok: true } };
  } catch (error) {
    handleSalaoError(error, "Erro ao ajustar vencimento do salao.");
  }
}

export async function criarNotaInternaAdminMasterSalaoUseCase(params: {
  idSalao: string;
  body: unknown;
  service: AdminMasterSalaoService;
}) {
  try {
    const admin = await requireAccess(params.service, "saloes_editar");
    const input = notaInternaSchema.parse(params.body);

    await params.service.criarNota({
      idSalao: params.idSalao,
      idAdmin: admin.usuario.id,
      titulo: input.titulo,
      nota: input.nota,
    });

    return { status: 200, body: { ok: true } };
  } catch (error) {
    handleSalaoError(error, "Erro ao criar nota interna.");
  }
}

export async function criarTicketAdminMasterSalaoUseCase(params: {
  idSalao: string;
  body: unknown;
  service: AdminMasterSalaoService;
}) {
  try {
    const admin = await requireAccess(params.service, "tickets_editar");
    const input = criarTicketSchema.parse(params.body);
    const resultado = await params.service.criarTicket({
      idSalao: params.idSalao,
      idAdmin: admin.usuario.id,
      assunto: input.assunto,
      mensagem: input.mensagem,
      prioridade: input.prioridade || null,
      categoria: input.categoria || null,
    });

    return {
      status: 200,
      body: {
        ok: true,
        resultado,
      },
    };
  } catch (error) {
    handleSalaoError(error, "Erro ao criar ticket do salao.");
  }
}
