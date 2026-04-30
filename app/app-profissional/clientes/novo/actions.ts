"use server";

import { redirect } from "next/navigation";
import { assertCanCreateWithinLimit, PlanAccessError } from "@/lib/plans/access";
import { createClient } from "@/lib/supabase/server";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";

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
  const session = await getProfissionalSessionFromCookie();

  if (!session) {
    return { error: "Sessao expirada. Faca login novamente." };
  }

  const nome = String(formData.get("nome") || "").trim();
  const telefone = somenteDigitos(String(formData.get("telefone") || ""));
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const observacoes = String(formData.get("observacoes") || "").trim();

  if (!nome) {
    return { error: "Informe o nome do cliente." };
  }

  const supabase = await createClient();
  try {
    await assertCanCreateWithinLimit(session.idSalao, "clientes");
  } catch (error) {
    if (error instanceof PlanAccessError) {
      return { error: error.message };
    }
    throw error;
  }

  const { error } = await supabase.from("clientes").insert({
    id_salao: session.idSalao,
    nome,
    telefone: telefone || null,
    email: email || null,
    observacoes: observacoes || null,
    status: "ativo",
    ativo: "true",
    atualizado_em: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message || "Nao foi possivel cadastrar o cliente." };
  }

  redirect("/app-profissional/clientes");
}
