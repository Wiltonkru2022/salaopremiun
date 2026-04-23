import { runAdminOperation } from "@/lib/supabase/admin-ops";

export type ClienteProfissional = {
  id: string;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  status: string | null;
  ativo: string | null;
};

export async function listarClientesDoSalao(
  idSalao: string
): Promise<ClienteProfissional[]> {
  return runAdminOperation({
    action: "profissional_listar_clientes_salao",
    idSalao,
    run: async (supabase) => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, telefone, email, status, ativo")
        .eq("id_salao", idSalao)
        .order("nome", { ascending: true });

      if (error) {
        throw new Error(error.message || "Erro ao carregar clientes.");
      }

      return (data ?? []) as ClienteProfissional[];
    },
  });
}
