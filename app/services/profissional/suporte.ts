import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type SuporteConversaContexto = {
  idSalao: string;
  idProfissional: string;
  origemPagina?: string | null;
  idComanda?: string | null;
  idAgendamento?: string | null;
  idCliente?: string | null;
};

export async function buscarOuCriarConversaSuporte(
  ctx: SuporteConversaContexto
) {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("suporte_conversas")
    .select("*")
    .eq("id_salao", ctx.idSalao)
    .eq("id_profissional", ctx.idProfissional)
    .order("atualizado_em", { ascending: false })
    .limit(1);

  if (ctx.origemPagina) {
    query = query.eq("origem_pagina", ctx.origemPagina);
  } else {
    query = query.is("origem_pagina", null);
  }

  if (ctx.idComanda) {
    query = query.eq("id_comanda", ctx.idComanda);
  } else {
    query = query.is("id_comanda", null);
  }

  if (ctx.idAgendamento) {
    query = query.eq("id_agendamento", ctx.idAgendamento);
  } else {
    query = query.is("id_agendamento", null);
  }

  if (ctx.idCliente) {
    query = query.eq("id_cliente", ctx.idCliente);
  } else {
    query = query.is("id_cliente", null);
  }

  const { data: existente, error: buscaError } = await query.maybeSingle();

  if (buscaError) {
    throw new Error(buscaError.message || "Erro ao buscar conversa de suporte.");
  }

  if (existente) {
    return existente;
  }

  const { data: criada, error: criaError } = await supabase
    .from("suporte_conversas")
    .insert({
      id_salao: ctx.idSalao,
      id_profissional: ctx.idProfissional,
      origem_pagina: ctx.origemPagina ?? null,
      id_comanda: ctx.idComanda ?? null,
      id_agendamento: ctx.idAgendamento ?? null,
      id_cliente: ctx.idCliente ?? null,
      titulo: "Suporte do app",
      atualizado_em: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (criaError || !criada) {
    throw new Error(criaError?.message || "Erro ao criar conversa de suporte.");
  }

  return criada;
}

export async function listarMensagensConversa(
  params: {
    idConversa: string;
    idSalao: string;
    idProfissional: string;
  },
  limite = 20
) {
  const supabase = getSupabaseAdmin();

  const { data: conversa, error: conversaError } = await supabase
    .from("suporte_conversas")
    .select("id")
    .eq("id", params.idConversa)
    .eq("id_salao", params.idSalao)
    .eq("id_profissional", params.idProfissional)
    .maybeSingle();

  if (conversaError || !conversa?.id) {
    throw new Error(
      conversaError?.message || "Conversa de suporte nao encontrada."
    );
  }

  const { data, error } = await supabase
    .from("suporte_mensagens")
    .select("id, papel, conteudo, metadados, criado_em")
    .eq("id_conversa", params.idConversa)
    .order("criado_em", { ascending: true })
    .limit(limite);

  if (error) {
    throw new Error(error.message || "Erro ao listar mensagens.");
  }

  return data ?? [];
}

export async function salvarMensagemConversa(params: {
  idConversa: string;
  idSalao: string;
  idProfissional: string;
  papel: "user" | "assistant" | "system";
  conteudo: string;
  metadados?: Record<string, unknown> | null;
}) {
  const supabase = getSupabaseAdmin();

  const { data: conversa, error: conversaError } = await supabase
    .from("suporte_conversas")
    .select("id")
    .eq("id", params.idConversa)
    .eq("id_salao", params.idSalao)
    .eq("id_profissional", params.idProfissional)
    .maybeSingle();

  if (conversaError || !conversa?.id) {
    throw new Error(
      conversaError?.message || "Conversa de suporte nao encontrada."
    );
  }

  const { error } = await supabase.from("suporte_mensagens").insert({
    id_conversa: params.idConversa,
    papel: params.papel,
    conteudo: params.conteudo,
    metadados: params.metadados ?? null,
  });

  if (error) {
    throw new Error(error.message || "Erro ao salvar mensagem.");
  }

  await supabase
    .from("suporte_conversas")
    .update({
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", params.idConversa)
    .eq("id_salao", params.idSalao)
    .eq("id_profissional", params.idProfissional);
}

export async function excluirConversaSuporte(params: {
  idConversa: string;
  idSalao: string;
  idProfissional: string;
}) {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("suporte_conversas")
    .delete()
    .eq("id", params.idConversa)
    .eq("id_salao", params.idSalao)
    .eq("id_profissional", params.idProfissional);

  if (error) {
    throw new Error(error.message || "Erro ao excluir conversa.");
  }
}
