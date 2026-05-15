import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import {
  AuthzError,
  requireSalaoAnyPermission,
} from "@/lib/auth/require-salao-permission";
import { notifyWaitlistAboutReleasedSlot } from "@/lib/client-app/waitlist";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const payloadSchema = z.object({
  idSalao: z.string().uuid(),
  idServico: z.string().uuid().nullable(),
  idProfissional: z.string().uuid().nullable(),
  data: z.string().min(8).max(10),
  horaInicio: z.string().min(4).max(8).nullable(),
  servicoNome: z.string().max(160).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = payloadSchema.parse(await req.json());

    await requireSalaoAnyPermission(body.idSalao, [
      "agenda_editar",
      "agenda_excluir",
    ]);

    const resultado = await notifyWaitlistAboutReleasedSlot({
      supabaseAdmin: getSupabaseAdmin(),
      releasedSlot: {
        idSalao: body.idSalao,
        idServico: body.idServico,
        idProfissional: body.idProfissional,
        data: body.data,
        horaInicio: body.horaInicio,
        servicoNome: body.servicoNome || null,
      },
    });

    return NextResponse.json({ ok: true, ...resultado });
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

    console.error("Erro ao avisar lista de espera:", error);
    return NextResponse.json(
      { error: "Nao foi possivel avisar a lista de espera agora." },
      { status: 500 }
    );
  }
}
