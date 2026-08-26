import { NextResponse } from "next/server";
import { registrarCriacaoAgendamento } from "@/lib/agenda/agendamento-audit";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { requireSalaoPermission } from "@/lib/auth/require-salao-permission";
import { getDatabaseAdmin } from "@/lib/db/admin";

export async function POST(request: Request) {
  const { user, usuario } = await getPainelUserContext();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sessão expirada." }, { status: 401 });
  }
  if (!usuario?.id_salao || String(usuario.status || "").toLowerCase() !== "ativo") {
    return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
  }

  try {
    await requireSalaoPermission(usuario.id_salao, "agenda_criar");
    const body = await request.json().catch(() => ({}));
    const idAgendamento = String(body.idAgendamento || "").trim();

    if (!idAgendamento) {
      return NextResponse.json(
        { ok: false, error: "Agendamento não informado." },
        { status: 400 }
      );
    }

    const supabase = getDatabaseAdmin();
    const { data: agendamento, error } = await (supabase as any)
      .from("agendamentos")
      .select("id, cliente_id, created_at, origem")
      .eq("id", idAgendamento)
      .eq("id_salao", usuario.id_salao)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!agendamento?.id || !agendamento.cliente_id) {
      return NextResponse.json(
        { ok: false, error: "Agendamento não encontrado." },
        { status: 404 }
      );
    }

    if (!agendamento.origem || String(agendamento.origem).toLowerCase() === "manual") {
      const { error: origemError } = await (supabase as any)
        .from("agendamentos")
        .update({ origem: "painel" })
        .eq("id", idAgendamento)
        .eq("id_salao", usuario.id_salao);

      if (origemError) {
        console.error("[AGENDAMENTO_ORIGEM_ERROR]", origemError.message);
      }
    }

    const auditado = await registrarCriacaoAgendamento({
      supabase,
      idSalao: usuario.id_salao,
      idAgendamento,
      idCliente: String(agendamento.cliente_id),
      origem: "painel",
      atorTipo: "painel",
      atorId: usuario.id,
      atorNome:
        String(usuario.nome || "").trim() ||
        String(usuario.email || "").trim() ||
        "Equipe do salão",
      createdBy: usuario.id,
      createdAt: agendamento.created_at || null,
    });

    return NextResponse.json({ ok: true, auditado });
  } catch (error) {
    const statusCode =
      typeof error === "object" && error && "status" in error
        ? Number((error as { status?: unknown }).status || 400)
        : 400;
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível registrar a origem do agendamento.",
      },
      { status: statusCode >= 400 && statusCode < 600 ? statusCode : 400 }
    );
  }
}
