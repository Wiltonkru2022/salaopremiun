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

function hojeLocalISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
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
        .gte("data", hojeLocalISO())
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

      const [clientesResult, servicosResult] = await Promise.all([
        clienteIds.length > 0
          ? supabase
              .from("clientes")
              .select("id, nome")
              .eq("id_salao", idSalao)
              .in("id", clienteIds)
          : Promise.resolve({ data: [], error: null }),
        servicoIds.length > 0
          ? supabase
              .from("servicos")
              .select("id, nome")
              .eq("id_salao", idSalao)
              .in("id", servicoIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (clientesResult.error) {
        console.error(
          "[profissional_inicio] Falha ao carregar nomes de clientes:",
          clientesResult.error.message
        );
      }

      if (servicosResult.error) {
        console.error(
          "[profissional_inicio] Falha ao carregar nomes de servicos:",
          servicosResult.error.message
        );
      }

      const clientesMap = new Map(
        (((clientesResult.data ?? []) as NomeRow[]) || []).map((cliente) => [
          cliente.id,
          cliente.nome,
        ])
      );
      const servicosMap = new Map(
        (((servicosResult.data ?? []) as NomeRow[]) || []).map((servico) => [
          servico.id,
          servico.nome,
        ])
      );

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
