import { createClient } from "@/lib/supabase/server";

export type ComandaResumo = {
  id: string;
  numero: number;
  status: string;
  total: number;
  cliente_nome: string;
};

export async function listarComandasProfissional(
  idSalao: string,
  idProfissional: string
): Promise<ComandaResumo[]> {
  const supabase = await createClient();

  const { data: agendamentos, error: agendamentosError } = await supabase
    .from("agendamentos")
    .select("id_comanda")
    .eq("id_salao", idSalao)
    .eq("profissional_id", idProfissional)
    .not("id_comanda", "is", null);

  if (agendamentosError) {
    throw new Error(agendamentosError.message || "Erro ao carregar comandas.");
  }

  const comandaIds = Array.from(
    new Set(
      (agendamentos ?? [])
        .map((item: any) => item.id_comanda)
        .filter(Boolean)
    )
  );

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
    new Set((comandas ?? []).map((c: any) => c.id_cliente).filter(Boolean))
  );

  let clientesMap = new Map<string, string>();

  if (clienteIds.length) {
    const { data: clientes, error: clientesError } = await supabase
      .from("clientes")
      .select("id, nome")
      .in("id", clienteIds);

    if (clientesError) {
      throw new Error(clientesError.message || "Erro ao carregar clientes.");
    }

    clientesMap = new Map(
      (clientes ?? []).map((cliente: any) => [cliente.id, cliente.nome])
    );
  }

  return (comandas ?? []).map((comanda: any) => ({
    id: comanda.id,
    numero: comanda.numero,
    status: comanda.status,
    total: Number(comanda.total || 0),
    cliente_nome: clientesMap.get(comanda.id_cliente) ?? "Cliente",
  }));
}