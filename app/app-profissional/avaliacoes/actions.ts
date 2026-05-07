"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

export async function removerAvaliacaoProfissionalAction(formData: FormData) {
  const session = await requireProfissionalAppContext();
  const idAvaliacao = String(formData.get("avaliacao") || "").trim();

  if (!idAvaliacao) {
    redirect("/app-profissional/avaliacoes?status=erro");
  }

  const result = await runAdminOperation({
    action: "profissional_avaliacao_remover",
    actorId: session.idProfissional,
    idSalao: session.idSalao,
    run: async (supabase) => {
      const { data: avaliacao, error } = await (supabase as any)
        .from("clientes_avaliacoes")
        .select("id, id_salao, agendamentos(profissional_id)")
        .eq("id", idAvaliacao)
        .eq("id_salao", session.idSalao)
        .maybeSingle();

      const profissionalId = Array.isArray(avaliacao?.agendamentos)
        ? avaliacao?.agendamentos[0]?.profissional_id
        : avaliacao?.agendamentos?.profissional_id;

      if (error || !avaliacao?.id || profissionalId !== session.idProfissional) {
        return { ok: false as const };
      }

      const { error: deleteError } = await (supabase as any)
        .from("clientes_avaliacoes")
        .delete()
        .eq("id", idAvaliacao)
        .eq("id_salao", session.idSalao);

      return { ok: !deleteError };
    },
  });

  revalidatePath("/app-profissional/avaliacoes");
  redirect(`/app-profissional/avaliacoes?status=${result.ok ? "removida" : "erro"}`);
}
