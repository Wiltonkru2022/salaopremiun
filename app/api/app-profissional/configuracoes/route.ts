import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { assertCanMutatePlanFeature, PlanAccessError } from "@/lib/plans/access";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(request: Request) {
  try {
    const context = await requireProfissionalAppContext();
    const body = await request.json().catch(() => ({}));
    const intervalo = Number(body.intervalo);

    if (![15, 30, 60, 120].includes(intervalo)) {
      throw new Error("Intervalo invalido.");
    }

    const diasTrabalho = Array.isArray(body.diasTrabalho)
      ? body.diasTrabalho
      : [];

    if (diasTrabalho.length !== 7) {
      throw new Error("Configure os sete dias da semana.");
    }

    await assertCanMutatePlanFeature(context.idSalao, "app_profissional");

    await runAdminOperation({
      action: "app_profissional_salvar_configuracoes",
      actorId: context.idProfissional,
      idSalao: context.idSalao,
      run: async (supabase) => {
        const { error } = await (supabase as any)
          .from("profissionais")
          .update({
            nome: cleanText(body.nome) || context.nome,
            telefone: cleanText(body.telefone) || null,
            intervalo_agenda_minutos: intervalo,
            dias_trabalho: diasTrabalho.map((item: any) => ({
              dia: cleanText(item.dia),
              ativo: item.ativo !== false,
              inicio: cleanText(item.inicio) || "09:00",
              fim: cleanText(item.fim) || "18:00",
            })),
          })
          .eq("id", context.idProfissional)
          .eq("id_salao", context.idSalao);

        if (error) throw error;
        return { updated: true };
      },
    });

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Nao foi possivel salvar.",
      },
      {
        status: error instanceof PlanAccessError ? error.status : 400,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
