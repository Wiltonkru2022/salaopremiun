import "server-only";

type OrigemAgendamento = "app_cliente" | "app_profissional" | "painel";
type AtorAgendamento = "cliente" | "profissional" | "painel";

type RegistrarCriacaoAgendamentoParams = {
  database: any;
  idSalao: string;
  idAgendamento: string;
  idCliente: string;
  origem: OrigemAgendamento;
  atorTipo: AtorAgendamento;
  atorId?: string | null;
  atorNome: string;
  createdBy?: string | null;
  createdAt?: string | null;
};

function origemLabel(origem: OrigemAgendamento) {
  if (origem === "app_cliente") return "App Cliente";
  if (origem === "app_profissional") return "App Profissional";
  return "Painel do salao";
}

/**
 * Registra, de forma idempotente e best-effort, quem criou um agendamento.
 * A agenda nunca deve falhar porque a trilha de auditoria ficou indisponivel.
 */
export async function registrarCriacaoAgendamento({
  database,
  idSalao,
  idAgendamento,
  idCliente,
  origem,
  atorTipo,
  atorId = null,
  atorNome,
  createdBy = null,
  createdAt = null,
}: RegistrarCriacaoAgendamentoParams) {
  const nome = String(atorNome || "").trim() || "Nao identificado";
  const metadata = {
    evento: "agendamento_criado",
    agendamento_id: idAgendamento,
    origem,
    ator_tipo: atorTipo,
    ator_id: atorId,
    ator_nome: nome,
  };

  try {
    const { data: existente, error: existingError } = await (database as any)
      .from("clientes_timeline")
      .select("id")
      .eq("id_salao", idSalao)
      .eq("id_cliente", idCliente)
      .eq("tipo", "agendamento")
      .contains("metadata", {
        evento: "agendamento_criado",
        agendamento_id: idAgendamento,
      })
      .limit(1)
      .maybeSingle();

    if (!existingError && existente?.id) {
      return true;
    }

    const { error } = await (database as any).from("clientes_timeline").insert({
      id_salao: idSalao,
      id_cliente: idCliente,
      tipo: "agendamento",
      titulo: "Agendamento criado",
      descricao: `Agendado por ${nome} via ${origemLabel(origem)}.`,
      metadata,
      created_by: createdBy || null,
      created_at: createdAt || new Date().toISOString(),
    });

    if (error) {
      console.error("[AGENDAMENTO_AUDIT_ERROR]", {
        idSalao,
        idAgendamento,
        origem,
        error: error.message,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error("[AGENDAMENTO_AUDIT_ERROR]", {
      idSalao,
      idAgendamento,
      origem,
      error: error instanceof Error ? error.message : "erro_desconhecido",
    });
    return false;
  }
}
