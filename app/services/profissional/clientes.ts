import { runAdminOperation } from "@/lib/supabase/admin-ops";

export type ClienteProfissional = {
  id: string;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  status: string | null;
  ativo: string | null;
};

type ListarClientesOptions = {
  busca?: string;
  limit?: number;
};

export async function listarClientesDoSalao(
  idSalao: string,
  options: ListarClientesOptions = {}
): Promise<ClienteProfissional[]> {
  return runAdminOperation({
    action: "profissional_listar_clientes_salao",
    idSalao,
    run: async (supabase) => {
      const buscaLimpa = String(options.busca || "").trim();
      let query = supabase
        .from("clientes")
        .select("id, nome, telefone, email, status, ativo")
        .eq("id_salao", idSalao)
        .order("nome", { ascending: true })
        .limit(options.limit ?? 60);

      if (buscaLimpa) {
        query = query.or(
          `nome.ilike.%${buscaLimpa}%,telefone.ilike.%${buscaLimpa}%,email.ilike.%${buscaLimpa}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message || "Erro ao carregar clientes.");
      }

      return (data ?? []) as ClienteProfissional[];
    },
  });
}
