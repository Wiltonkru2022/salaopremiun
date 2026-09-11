import { NextResponse } from "next/server";
import { registrarCriacaoAgendamento } from "@/lib/agenda/agendamento-audit";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

function normalizeTime(value: unknown) {
  return String(value || "").trim().slice(0, 5);
}

function isISODate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(request: Request) {
  try {
    const session = await requireProfissionalAppContext();
    const body = await request.json().catch(() => ({}));
    const clienteId = String(body.clienteId || "").trim();
    const servicoId = String(body.servicoId || "").trim();
    const data = String(body.data || "").trim().slice(0, 10);
    const horaInicio = normalizeTime(body.horaInicio);
    const profissionalSolicitado = String(body.profissionalId || "").trim();
    const profissionalId =
      session.podeVerAgendaTodos && profissionalSolicitado
        ? profissionalSolicitado
        : session.idProfissional;

    if (!clienteId || !servicoId || !isISODate(data) || !horaInicio) {
      return NextResponse.json(
        { ok: false, error: "Dados do agendamento incompletos para auditoria." },
        { status: 400 }
      );
    }

    const result = await runAdminOperation({
      action: "app_profissional_auditar_criacao_agendamento",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const { data: rows, error } = await (supabase as any)
          .from("agendamentos")
          .select("id, cliente_id, hora_inicio, created_at, origem")
          .eq("id_salao", session.idSalao)
          .eq("profissional_id", profissionalId)
          .eq("cliente_id", clienteId)
          .eq("servico_id", servicoId)
          .eq("data", data)
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) throw new Error(error.message);

        const agendamento = (rows || []).find(
          (item: any) => normalizeTime(item.hora_inicio) === horaInicio
        );

        if (!agendamento?.id) {
          return { encontrado: false, auditado: false };
        }

        if (String(agendamento.origem || "").toLowerCase() !== "app_profissional") {
          const { error: origemError } = await (supabase as any)
            .from("agendamentos")
            .update({ origem: "app_profissional" })
            .eq("id", agendamento.id)
            .eq("id_salao", session.idSalao);

          if (origemError) {
            console.error("[AGENDAMENTO_ORIGEM_ERROR]", origemError.message);
          }
        }

        const auditado = await registrarCriacaoAgendamento({
          supabase,
          idSalao: session.idSalao,
          idAgendamento: String(agendamento.id),
          idCliente: clienteId,
          origem: "app_profissional",
          atorTipo: "profissional",
          atorId: session.idProfissional,
          atorNome: session.nome,
          createdAt: agendamento.created_at || null,
        });

        return { encontrado: true, auditado };
      },
    });

    return NextResponse.json({ ok: true, ...result });
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
