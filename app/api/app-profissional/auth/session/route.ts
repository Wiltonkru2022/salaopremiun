import { NextResponse } from "next/server";
import { validateProfissionalAppSession } from "@/lib/profissional-context.server";
import { getDatabaseAdmin } from "@/lib/db/admin";

export async function GET() {
  const validation = await validateProfissionalAppSession().catch(() => ({
    context: null,
    reason: "unauthorized" as const,
  }));

  if (!validation.context) {
    return NextResponse.json(
      { ok: false, reason: validation.reason },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const supabase = getDatabaseAdmin();
  const { data: profissional, error } = await supabase
    .from("profissionais")
    .select("id, id_salao, nome, nome_exibicao, cpf, telefone, whatsapp, email, cargo, categoria, bio, pix_tipo, pix_chave, sinal_pix_recebedor, nivel_acesso, ativo, intervalo_agenda_minutos, dias_trabalho, pausas")
    .eq("id", validation.context.idProfissional)
    .eq("id_salao", validation.context.idSalao)
    .maybeSingle();

  if (error || !profissional?.id) {
    return NextResponse.json(
      { ok: false, reason: "profile_unavailable" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json({
    ok: true,
    profissional: {
      ...profissional,
      nome: profissional.nome_exibicao || profissional.nome || validation.context.nome,
      podeVerAgendaTodos: validation.context.podeVerAgendaTodos,
      pode_ver_agenda_todos: validation.context.podeVerAgendaTodos,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
