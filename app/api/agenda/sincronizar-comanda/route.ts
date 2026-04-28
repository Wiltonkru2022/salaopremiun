import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import {
  AuthzError,
  requireSalaoAnyPermission,
} from "@/lib/auth/require-salao-permission";
import { adicionarItemComanda } from "@/lib/comandas/processar";
import {
  removerAgendamentoDaComanda,
} from "@/lib/agenda/sincronizarAgendamentoComComanda";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const payloadSchema = z.object({
  idSalao: z.string().uuid(),
  idAgendamento: z.string().uuid(),
  idComandaNova: z.string().uuid().nullable(),
  idServico: z.string().uuid(),
  idProfissional: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const body = payloadSchema.parse(await req.json());

    await requireSalaoAnyPermission(body.idSalao, [
      "agenda_editar",
      "agenda_excluir",
      "comandas_editar",
      "comandas_criar",
    ]);

    const supabaseAdmin = getSupabaseAdmin();

    await removerAgendamentoDaComanda({
      supabase: supabaseAdmin,
      idSalao: body.idSalao,
      idAgendamento: body.idAgendamento,
    });

    if (!body.idComandaNova) {
      const { error: clearAgendamentoError } = await supabaseAdmin
        .from("agendamentos")
        .update({
          id_comanda: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.idAgendamento)
        .eq("id_salao", body.idSalao);

      if (clearAgendamentoError) {
        throw clearAgendamentoError;
      }

      return NextResponse.json({ ok: true, idComanda: null });
    }

    const [{ data: agendamento, error: agendamentoError }, { data: comanda, error: comandaError }] =
      await Promise.all([
        supabaseAdmin
          .from("agendamentos")
          .select("id, cliente_id, observacoes")
          .eq("id", body.idAgendamento)
          .eq("id_salao", body.idSalao)
          .maybeSingle(),
        supabaseAdmin
          .from("comandas")
          .select("id, status, id_cliente, desconto, acrescimo")
          .eq("id", body.idComandaNova)
          .eq("id_salao", body.idSalao)
          .maybeSingle(),
      ]);

    if (agendamentoError || !agendamento?.id) {
      throw agendamentoError || new Error("Agendamento nao encontrado.");
    }

    if (comandaError || !comanda?.id) {
      throw comandaError || new Error("Comanda nao encontrada.");
    }

    const statusComanda = String(comanda.status || "").toLowerCase();
    if (statusComanda === "fechada") {
      throw new Error("A comanda selecionada nao pode receber itens.");
    }

    if (statusComanda === "cancelada") {
      const { error: reopenError } = await supabaseAdmin
        .from("comandas")
        .update({
          status: "aberta",
          motivo_cancelamento: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", comanda.id)
        .eq("id_salao", body.idSalao);

      if (reopenError) {
        throw reopenError;
      }
    }

    await adicionarItemComanda({
      supabaseAdmin,
      idSalao: body.idSalao,
      comanda: {
        idComanda: comanda.id,
        idCliente: comanda.id_cliente || agendamento.cliente_id || null,
        desconto: Number(comanda.desconto || 0),
        acrescimo: Number(comanda.acrescimo || 0),
      },
      item: {
        tipo_item: "servico",
        quantidade: 1,
        id_servico: body.idServico,
        id_agendamento: body.idAgendamento,
        id_profissional: body.idProfissional,
        observacoes: agendamento.observacoes,
        origem: "agenda",
      },
      idempotencyKey: `agenda-sync:${body.idAgendamento}:${comanda.id}:${body.idServico}:${body.idProfissional}`,
    });

    const { error: updateAgendamentoError } = await supabaseAdmin
      .from("agendamentos")
      .update({
        id_comanda: comanda.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.idAgendamento)
      .eq("id_salao", body.idSalao);

    if (updateAgendamentoError) {
      throw updateAgendamentoError;
    }

    return NextResponse.json({ ok: true, idComanda: comanda.id });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message || "Payload invalido.",
          issues: error.flatten(),
        },
        { status: 400 }
      );
    }

    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    console.error("Erro ao sincronizar agendamento com comanda:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao sincronizar agendamento com comanda.",
      },
      { status: 500 }
    );
  }
}
