import { NextResponse } from "next/server";
import { registrarCriacaoAgendamento } from "@/lib/agenda/agendamento-audit";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { user, usuario } = await getPainelUserContext();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Sessao expirada." }, { status: 401 });
  }

  if (!usuario?.id_salao || String(usuario.status || "").toLowerCase() !== "ativo") {
    return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const idAgendamento = String(body.idAgendamento || "").trim();

    if (!idAgendamento) {
      return NextResponse.json(
        { ok: false, error: "Agendamento nao informado." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: agendamento, error } = await (supabase as any)
      .from("agendamentos")
      .select("id, cliente_id, created_at, origem")
      .eq("id", idAgendamento)
      .eq("id_salao", usuario.id_salao)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!agendamento?.id || !agendamento.cliente_id) {
      return NextResponse.json(
        { ok: false, error: "Agendamento nao encontrado." },
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
        "Equipe do salao",
      createdBy: usuario.id,
      createdAt: agendamento.created_at || null,
    });

    return NextResponse.json({ ok: true, auditado });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel registrar a origem do agendamento.",
      },
      { status: 400 }
    );
  }
}
