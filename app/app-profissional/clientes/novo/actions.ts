"use server";

import { redirect } from "next/navigation";
import {
  assertCanCreateWithinLimit,
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

export type NovoClienteState = {
  error: string | null;
};

function somenteDigitos(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export async function criarClienteProfissionalAction(
  _prevState: NovoClienteState,
  formData: FormData
): Promise<NovoClienteState> {
  const session = await requireProfissionalAppContext();

  const nome = String(formData.get("nome") || "").trim();
  const whatsapp = somenteDigitos(String(formData.get("whatsapp") || ""));
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const observacoes = String(formData.get("observacoes") || "").trim();

  if (!nome) {
    return { error: "Informe o nome do cliente." };
  }

  try {
    await assertCanMutatePlanFeature(session.idSalao, "clientes");
    await assertCanCreateWithinLimit(session.idSalao, "clientes");
  } catch (error) {
    if (error instanceof PlanAccessError) {
      return { error: error.message };
    }
    throw error;
  }

  const errorMessage = await runAdminOperation({
    action: "app_profissional_cliente_criar",
    actorId: session.idProfissional,
    idSalao: session.idSalao,
    run: async (supabase) => {
      const { error } = await supabase.from("clientes").insert({
        id_salao: session.idSalao,
        nome,
        whatsapp: whatsapp || null,
        email: email || null,
        observacoes: observacoes || null,
        status: "ativo",
        ativo: "true",
        atualizado_em: new Date().toISOString(),
      });

      return error?.message || null;
    },
  });

  if (errorMessage) {
    return { error: errorMessage || "Nao foi possivel cadastrar o cliente." };
  }

  redirect("/app-profissional/clientes");
}
