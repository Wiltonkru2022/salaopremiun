import { runAdminOperation } from "@/lib/supabase/admin-ops";

export type AgendamentoInicio = {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string | null;
  status: string;
  cliente_nome: string;
  servico_nome: string;
  id_comanda: string | null;
};

type AgendamentoInicioRow = {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string | null;
  status: string;
  id_comanda: string | null;
  cliente_id: string | null;
  servico_id: string | null;
};

type NomeRow = {
  id: string;
  nome: string;
};

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function listarProximosAgendamentosProfissional(
  idSalao: string,
  idProfissional: string
): Promise<AgendamentoInicio[]> {
  return runAdminOperation({
    action: "profissional_inicio_listar_agendamentos",
    actorId: idProfissional,
    idSalao,
    run: async (supabase) => {
      const { data: agendamentos, error: agendamentosError } = await supabase
        .from("agendamentos")
        .select(
          "id, data, hora_inicio, hora_fim, status, id_comanda, cliente_id, servico_id"
        )
        .eq("id_salao", idSalao)
        .eq("profissional_id", idProfissional)
        .gte("data", hojeISO())
        .order("data", { ascending: true })
        .order("hora_inicio", { ascending: true })
        .limit(10);

      if (agendamentosError) {
        throw new Error(
          agendamentosError.message || "Erro ao carregar agendamentos."
        );
      }

      const rows = (agendamentos ?? []) as AgendamentoInicioRow[];
      const clienteIds = Array.from(
        new Set(rows.map((item) => item.cliente_id).filter(Boolean))
      ) as string[];
      const servicoIds = Array.from(
        new Set(rows.map((item) => item.servico_id).filter(Boolean))
      ) as string[];

      let clientesMap = new Map<string, string>();
      let servicosMap = new Map<string, string>();

      if (clienteIds.length > 0) {
        const { data: clientes, error: clientesError } = await supabase
          .from("clientes")
          .select("id, nome")
          .eq("id_salao", idSalao)
          .in("id", clienteIds);

        if (clientesError) {
          throw new Error(clientesError.message || "Erro ao carregar clientes.");
        }

        clientesMap = new Map(
          ((clientes ?? []) as NomeRow[]).map((cliente) => [
            cliente.id,
            cliente.nome,
          ])
        );
      }

      if (servicoIds.length > 0) {
        const { data: servicos, error: servicosError } = await supabase
          .from("servicos")
          .select("id, nome")
          .eq("id_salao", idSalao)
          .in("id", servicoIds);

        if (servicosError) {
          throw new Error(servicosError.message || "Erro ao carregar serviços.");
        }

        servicosMap = new Map(
          ((servicos ?? []) as NomeRow[]).map((servico) => [
            servico.id,
            servico.nome,
          ])
        );
      }

      return rows.map((item) => ({
        id: item.id,
        data: item.data,
        hora_inicio: item.hora_inicio,
        hora_fim: item.hora_fim,
        status: item.status,
        id_comanda: item.id_comanda ?? null,
        cliente_nome: item.cliente_id
          ? clientesMap.get(item.cliente_id) ?? "Cliente"
          : "Cliente",
        servico_nome: item.servico_id
          ? servicosMap.get(item.servico_id) ?? "Servico"
          : "Servico",
      }));
    },
  });
}
