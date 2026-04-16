import { NextRequest, NextResponse } from "next/server";
import { registrarAdminMasterAuditoria } from "@/lib/admin-master/actions";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { updateAdminTicketStatus } from "@/lib/support/tickets";

type Payload = {
  status?: string;
  prioridade?: string | null;
  motivo?: string | null;
  assumir?: boolean;
};

function buildErrorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  if (message === "NOT_FOUND") {
    return NextResponse.json({ ok: false, error: "Ticket nao encontrado." }, { status: 404 });
  }

  if (message === "UNAUTHORIZED") {
    return NextResponse.json({ ok: false, error: "Sessao invalida." }, { status: 401 });
  }

  return NextResponse.json({ ok: false, error: message || fallback }, { status: 500 });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminMasterUser("tickets_ver");

    if (!admin.permissions.tickets_editar) {
      return NextResponse.json(
        { ok: false, error: "Usuario sem permissao para atualizar tickets." },
        { status: 403 }
      );
    }

    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as Payload;
    const result = await updateAdminTicketStatus({
      context: {
        origem: "admin_master",
        idAdmin: admin.usuario.id,
        nome: admin.usuario.nome,
      },
      idTicket: id,
      status: body.status || "em_atendimento",
      prioridade: body.prioridade || null,
      motivo: body.motivo || null,
      assumir: body.assumir ?? true,
    });

    await registrarAdminMasterAuditoria({
      idAdmin: admin.usuario.id,
      acao: "atualizar_ticket",
      entidade: "tickets",
      entidadeId: id,
      descricao: body.motivo || "Status do ticket ajustado no AdminMaster.",
      payload: {
        status: result.status,
        prioridade: result.prioridade,
        assumir: body.assumir ?? true,
      },
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return buildErrorResponse(error, "Erro ao atualizar ticket.");
  }
}
