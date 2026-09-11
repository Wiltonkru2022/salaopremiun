import { runAdminOperation } from "@/lib/supabase/admin-ops";

export type ClienteProfissional = {
  id: string;
  nome: string | null;
  telefone: string | null;
  whatsapp?: string | null;
  email: string | null;
  status: string | null;
  ativo: boolean | string | number | null;
};

type ListarClientesOptions = {
  busca?: string;
  limit?: number;
  page?: number;
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
      const buscaDigits = buscaLimpa.replace(/\D/g, "");
      const limit = options.limit ?? 10;
      const page = Math.max(0, options.page ?? 0);
      const from = page * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("clientes")
        .select("id, nome, telefone, whatsapp, email, status, ativo")
        .eq("id_salao", idSalao)
        .order("nome", { ascending: true });

      if (buscaLimpa) {
        const termo = buscaLimpa
          .replaceAll("\\", "\\\\")
          .replaceAll("%", "\\%")
          .replaceAll("_", "\\_")
          .replaceAll(",", " ")
          .trim();
        const filtros = [
          `nome.ilike.%${termo}%`,
          `telefone.ilike.%${termo}%`,
          `whatsapp.ilike.%${termo}%`,
          `email.ilike.%${termo}%`,
        ];

        if (buscaDigits && buscaDigits !== termo) {
          filtros.push(
            `telefone.ilike.%${buscaDigits}%`,
            `whatsapp.ilike.%${buscaDigits}%`
          );
        }

        query = query.or(filtros.join(","));
      }

      const { data, error } = await query.range(from, to);

      if (error) {
        throw new Error(error.message || "Erro ao carregar clientes.");
      }

      return (data ?? []) as ClienteProfissional[];
    },
  });
}
