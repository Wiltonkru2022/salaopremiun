import "server-only";

import { createClienteAppAppointment } from "@/app/services/cliente-app/appointments";
import { findClienteRowsByNormalizedPhone } from "@/app/services/cliente-app/linking";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { normalizeWhatsapp } from "@/lib/client-app/identity";

type BookingParams = Parameters<typeof createClienteAppAppointment>[0];

type ResolvePersonResult =
  | { ok: true; idCliente: string; nome: string; whatsapp: string }
  | { ok: false; error: string };

async function resolvePessoaAtendida(params: {
  idSalao: string;
  nome: string;
  whatsapp: string;
}): Promise<ResolvePersonResult> {
  const nome = String(params.nome || "").trim().replace(/\s+/g, " ");
  const whatsapp = normalizeWhatsapp(params.whatsapp);

  if (nome.length < 2) {
    return { ok: false, error: "Informe o nome da pessoa que será atendida." };
  }
  if (whatsapp.length < 10 || whatsapp.length > 13) {
    return { ok: false, error: "Informe um WhatsApp válido da pessoa que será atendida." };
  }

  const databaseAdmin = getDatabaseAdmin();
  const found = await findClienteRowsByNormalizedPhone({
    databaseAdmin,
    telefone: whatsapp,
    idSalao: params.idSalao,
    limit: 10,
  });

  if (found.error) {
    return { ok: false, error: "Não foi possível validar o cadastro da pessoa agora." };
  }

  if (found.data.length > 1) {
    return {
      ok: false,
      error:
        "Encontramos mais de um cadastro com este WhatsApp no salão. Peça ao salão para corrigir os cadastros antes de continuar.",
    };
  }

  if (found.data.length === 1) {
    const idCliente = String(found.data[0].id || "").trim();
    const { error } = await (databaseAdmin as any)
      .from("clientes")
      .update({
        nome,
        whatsapp,
        telefone: whatsapp,
        status: "ativo",
        ativo: "ativo",
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", idCliente)
      .eq("id_salao", params.idSalao);

    if (error) {
      return { ok: false, error: "Não foi possível atualizar o cadastro da pessoa agora." };
    }

    return { ok: true, idCliente, nome, whatsapp };
  }

  const { data, error } = await (databaseAdmin as any)
    .from("clientes")
    .insert({
      id_salao: params.idSalao,
      nome,
      whatsapp,
      telefone: whatsapp,
      status: "ativo",
      ativo: "ativo",
    })
    .select("id")
    .maybeSingle();

  if (error || !data?.id) {
    return { ok: false, error: "Não foi possível cadastrar a pessoa que será atendida." };
  }

  return { ok: true, idCliente: String(data.id), nome, whatsapp };
}

export async function createClienteAppAppointmentForPerson(
  params: BookingParams
): ReturnType<typeof createClienteAppAppointment> {
  const pessoaTipo =
    String(params.pessoaAgendadaTipo || "mim") === "outra_pessoa"
      ? "outra_pessoa"
      : "mim";

  if (pessoaTipo === "mim") {
    return createClienteAppAppointment({
      ...params,
      pessoaAgendadaTipo: "mim",
      pessoaAgendadaNome: null,
      pessoaAgendadaWhatsapp: null,
      pessoaAgendadaObservacao: null,
    });
  }

  const pessoa = await resolvePessoaAtendida({
    idSalao: params.idSalao,
    nome: String(params.pessoaAgendadaNome || ""),
    whatsapp: String(params.pessoaAgendadaWhatsapp || ""),
  });

  if (!pessoa.ok) return pessoa;

  const result = await createClienteAppAppointment({
    ...params,
    pessoaAgendadaTipo: "outra_pessoa",
    pessoaAgendadaNome: pessoa.nome,
    pessoaAgendadaWhatsapp: pessoa.whatsapp,
  });

  if (!result.ok || !result.idAgendamento) return result;

  const databaseAdmin = getDatabaseAdmin();
  const { error } = await (databaseAdmin as any)
    .from("agendamentos")
    .update({
      pessoa_agendada_tipo: "outra_pessoa",
      pessoa_agendada_nome: pessoa.nome,
      pessoa_agendada_whatsapp: pessoa.whatsapp,
      pessoa_atendida_cliente_id: pessoa.idCliente,
      agendado_por_app_conta_id: params.idConta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", result.idAgendamento)
    .eq("id_salao", params.idSalao);

  if (error) {
    return {
      ok: false,
      error:
        "O horário foi reservado, mas não foi possível registrar quem será atendido. Entre em contato com o salão antes de tentar novamente.",
    };
  }

  return result;
}
