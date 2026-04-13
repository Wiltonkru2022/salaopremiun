import { createClient } from "@/lib/supabase/server";

export type ClienteProfissional = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  status: string | null;
  ativo: boolean | null;
};

export async function listarClientesDoSalao(
  idSalao: string
): Promise<ClienteProfissional[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clientes")
    .select("id, nome, telefone, email, status, ativo")
    .eq("id_salao", idSalao)
    .order("nome", { ascending: true });

  if (error) {
    throw new Error(error.message || "Erro ao carregar clientes.");
  }

  return data ?? [];
}