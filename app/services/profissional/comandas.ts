import { runAdminOperation } from "@/lib/supabase/admin-ops";

export type ComandaResumo = {
  id: string;
  numero: number;
  status: string;
  total: number;
  cliente_nome: string;
};

type AgendamentoComandaRow = {
  id_comanda: string | null;
};

type ComandaRow = {
  id: string;
  numero: number;
  status: string;
  total: number | string | null;
  id_cliente: string | null;
};

type ClienteNomeRow = {
  id: string;
  nome: string;
};

export async function listarComandasProfissional(
  idSalao: string,
  idProfissional: string
): Promise<ComandaResumo[]> {
  return runAdminOperation({
    action: "profissional_listar_comandas",
    actorId: idProfissional,
    idSalao,
    run: async (supabase) => {
      const { data: agendamentos, error: agendamentosError } = await supabase
        .from("agendamentos")
        .select("id_comanda")
        .eq("id_salao", idSalao)
        .eq("profissional_id", idProfissional)
        .not("id_comanda", "is", null);

      if (agendamentosError) {
        throw new Error(
          agendamentosError.message || "Erro ao carregar comandas."
        );
      }

      const comandaIds = Array.from(
        new Set(
          ((agendamentos ?? []) as AgendamentoComandaRow[])
            .map((item) => item.id_comanda)
            .filter(Boolean)
        )
      ) as string[];

      if (!comandaIds.length) {
        return [];
      }

      const { data: comandas, error: comandasError } = await supabase
        .from("comandas")
        .select("id, numero, status, total, id_cliente")
        .eq("id_salao", idSalao)
        .in("id", comandaIds)
        .order("numero", { ascending: false });

      if (comandasError) {
        throw new Error(comandasError.message || "Erro ao carregar comandas.");
      }

      const clienteIds = Array.from(
        new Set(
          ((comandas ?? []) as ComandaRow[])
            .map((comanda) => comanda.id_cliente)
            .filter(Boolean)
        )
      ) as string[];

      let clientesMap = new Map<string, string>();

      if (clienteIds.length) {
        const { data: clientes, error: clientesError } = await supabase
          .from("clientes")
          .select("id, nome")
          .eq("id_salao", idSalao)
          .in("id", clienteIds);

        if (clientesError) {
          throw new Error(clientesError.message || "Erro ao carregar clientes.");
        }

        clientesMap = new Map(
          ((clientes ?? []) as ClienteNomeRow[]).map((cliente) => [
            cliente.id,
            cliente.nome,
          ])
        );
      }

      return ((comandas ?? []) as ComandaRow[]).map((comanda) => ({
        id: comanda.id,
        numero: comanda.numero,
        status: comanda.status,
        total: Number(comanda.total || 0),
        cliente_nome: comanda.id_cliente
          ? clientesMap.get(comanda.id_cliente) ?? "Cliente"
          : "Cliente",
      }));
    },
  });
}
