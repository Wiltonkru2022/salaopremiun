"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"] as const;

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function checked(value: FormDataEntryValue | null) {
  return String(value || "") === "on" || String(value || "") === "true";
}

function normalizeTime(value: FormDataEntryValue | null, fallback: string) {
  const raw = String(value || "").trim();
  if (!/^\d{2}:\d{2}$/.test(raw)) return fallback;
  return raw;
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function buildHorariosUrl(key: "ok" | "erro", value: string) {
  const query = new URLSearchParams();
  query.set(key, value);
  return `/app-profissional/perfil/horarios?${query.toString()}`;
}

export async function salvarHorariosProfissionalAction(formData: FormData) {
  const session = await requireProfissionalAppContext();

  try {
    const intervalo = Number(formData.get("intervalo_agenda_minutos") || 30);
    if (![30, 60, 120].includes(intervalo)) {
      throw new Error("Escolha um intervalo valido para a agenda.");
    }

    const diasTrabalho = DIAS.map((dia) => {
      const inicio = normalizeTime(formData.get(`${dia}_inicio`), "09:00");
      const fim = normalizeTime(formData.get(`${dia}_fim`), "18:00");
      const ativo = checked(formData.get(`${dia}_ativo`));

      if (ativo && minutes(inicio) >= minutes(fim)) {
        throw new Error(`Horario invalido em ${dia}: inicio precisa ser antes do fim.`);
      }

      return {
        dia,
        ativo,
        inicio,
        fim,
      };
    });

    await runAdminOperation({
      action: "app_profissional_salvar_horarios",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const { error } = await supabase
          .from("profissionais")
          .update({
            intervalo_agenda_minutos: intervalo,
            dias_trabalho: diasTrabalho,
          })
          .eq("id", session.idProfissional)
          .eq("id_salao", session.idSalao);

        if (error) throw new Error(error.message);
      },
    });

    revalidatePath("/app-profissional/perfil");
    revalidatePath("/app-profissional/perfil/horarios");
    revalidatePath("/app-profissional/agenda");
    revalidatePath("/app-profissional/agenda/novo");
    revalidatePath("/app-cliente");
    redirect(buildHorariosUrl("ok", "Horarios da agenda salvos."));
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message =
      error instanceof Error ? error.message : "Erro ao salvar horarios.";
    redirect(buildHorariosUrl("erro", message));
  }
}
