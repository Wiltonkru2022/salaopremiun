import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { assertCanMutatePlanFeature } from "@/lib/plans/access";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

function minutes(value: string) {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

export async function POST(request: Request) {
  try {
    const session = await requireProfissionalAppContext();
    const body = await request.json().catch(() => ({}));
    const dates: string[] = Array.from(new Set(
      (Array.isArray(body.datas) ? body.datas : [])
        .map((item: unknown) => String(item))
        .filter((item: string) => /^\d{4}-\d{2}-\d{2}$/.test(item))
    ));
    const target = session.podeVerAgendaTodos && body.profissionalId ? String(body.profissionalId) : session.idProfissional;
    const start = String(body.horaInicio || "").slice(0, 5);
    const end = String(body.horaFim || "").slice(0, 5);
    const reason = String(body.motivo || "Horario bloqueado").trim();
    if (!dates.length || !target || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || minutes(end) <= minutes(start)) {
      return NextResponse.json({ ok: false, error: "Selecione dia(s), horario inicial e horario final valido." }, { status: 400 });
    }
    await assertCanMutatePlanFeature(session.idSalao, "agenda");

    await runAdminOperation({
      action: "app_profissional_pwa_bloquear_horario",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const { data: professional, error: professionalError } = await supabase
          .from("profissionais")
          .select("id, ativo, id_salao, tipo_profissional")
          .eq("id", target)
          .eq("id_salao", session.idSalao)
          .maybeSingle();
        if (professionalError) throw new Error(professionalError.message);
        if (!professional?.id || !professional.ativo || String(professional.tipo_profissional || "").toLowerCase() === "assistente") throw new Error("Profissional sem acesso a esta agenda.");

        const { data: conflicts, error: conflictError } = await supabase
          .from("agenda_bloqueios")
          .select("data, hora_inicio, hora_fim")
          .eq("id_salao", session.idSalao)
          .eq("profissional_id", target)
          .in("data", dates);
        if (conflictError) throw new Error(conflictError.message);
        if ((conflicts || []).some((item) => dates.includes(String(item.data).slice(0, 10)) && minutes(start) < minutes(String(item.hora_fim)) && minutes(end) > minutes(String(item.hora_inicio)))) {
          throw new Error("Ja existe bloqueio nesse intervalo.");
        }
        const { error } = await supabase.from("agenda_bloqueios").insert(dates.map((data) => ({
          id_salao: session.idSalao,
          profissional_id: target,
          data,
          hora_inicio: start,
          hora_fim: end,
          motivo: reason || null,
        })));
        if (error) throw new Error(error.message);
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Nao foi possivel bloquear o horario." }, { status: 400 });
  }
}
