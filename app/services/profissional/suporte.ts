import { runAdminOperation } from "@/lib/supabase/admin-ops";
import type { Json } from "@/types/database.generated";

export type SuporteConversaContexto = {
  idSalao: string;
  idProfissional: string;
  origemPagina?: string | null;
  idComanda?: string | null;
  idAgendamento?: string | null;
  idCliente?: string | null;
};

const SUPORTE_CONVERSA_SELECT = `
  id,
  id_salao,
  id_profissional,
  origem_pagina,
  id_comanda,
  id_agendamento,
  id_cliente,
  titulo,
  atualizado_em
`;

export async function buscarOuCriarConversaSuporte(
  ctx: SuporteConversaContexto
) {
  return runAdminOperation({
    action: "profissional_suporte_buscar_ou_criar_conversa",
    actorId: ctx.idProfissional,
    idSalao: ctx.idSalao,
    run: async (supabase) => {
      let query = supabase
        .from("suporte_conversas")
        .select(SUPORTE_CONVERSA_SELECT)
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
        throw new Error(
          buscaError.message || "Erro ao buscar conversa de suporte."
        );
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
        .select(SUPORTE_CONVERSA_SELECT)
        .single();

      if (criaError || !criada) {
        throw new Error(
          criaError?.message || "Erro ao criar conversa de suporte."
        );
      }

      return criada;
    },
  });
}

export async function listarMensagensConversa(
  params: {
    idConversa: string;
    idSalao: string;
    idProfissional: string;
  },
  limite = 20
) {
  return runAdminOperation({
    action: "profissional_suporte_listar_mensagens",
    actorId: params.idProfissional,
    idSalao: params.idSalao,
    run: async (supabase) => {
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
    },
  });
}

export async function salvarMensagemConversa(params: {
  idConversa: string;
  idSalao: string;
  idProfissional: string;
  papel: "user" | "assistant" | "system";
  conteudo: string;
  metadados?: Record<string, unknown> | null;
}) {
  await runAdminOperation({
    action: "profissional_suporte_salvar_mensagem",
    actorId: params.idProfissional,
    idSalao: params.idSalao,
    run: async (supabase) => {
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
        metadados: (params.metadados ?? null) as Json,
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
    },
  });
}

export async function excluirConversaSuporte(params: {
  idConversa: string;
  idSalao: string;
  idProfissional: string;
}) {
  await runAdminOperation({
    action: "profissional_suporte_excluir_conversa",
    actorId: params.idProfissional,
    idSalao: params.idSalao,
    run: async (supabase) => {
      const { error } = await supabase
        .from("suporte_conversas")
        .delete()
        .eq("id", params.idConversa)
        .eq("id_salao", params.idSalao)
        .eq("id_profissional", params.idProfissional);

      if (error) {
        throw new Error(error.message || "Erro ao excluir conversa.");
      }
    },
  });
}
