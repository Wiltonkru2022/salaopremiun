import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import {
  AuthzError,
  requireSalaoAnyPermission,
} from "@/lib/auth/require-salao-permission";
import {
  sincronizarAgendamentoComComandaNoCaixa,
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
    const resultado = await sincronizarAgendamentoComComandaNoCaixa({
      supabase: supabaseAdmin,
      idSalao: body.idSalao,
      idAgendamento: body.idAgendamento,
      idComandaNova: body.idComandaNova,
      idServico: body.idServico,
      idProfissional: body.idProfissional,
    });

    return NextResponse.json({ ok: true, idComanda: resultado.idComanda });
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
