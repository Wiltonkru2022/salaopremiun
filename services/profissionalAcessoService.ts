import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.generated";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

type ProfissionalAcessoRow = {
  id: string;
  senha_hash?: string | null;
};

type ProfissionalResumoRow = {
  id: string;
  id_salao?: string | null;
  nome?: string | null;
};

type SalaoResumoRow = {
  id: string;
  nome?: string | null;
  nome_fantasia?: string | null;
};

export function createProfissionalAcessoService(
  supabaseAdmin: SupabaseAdminClient = getSupabaseAdmin()
) {
  return {
    async buscarProfissional(idProfissional: string) {
      const { data, error } = await supabaseAdmin
        .from("profissionais")
        .select("id, id_salao, nome")
        .eq("id", idProfissional)
        .maybeSingle();

      if (error) throw error;
      return (data as ProfissionalResumoRow | null) || null;
    },

    async buscarSalao(idSalao: string) {
      const { data, error } = await supabaseAdmin
        .from("saloes")
        .select("id, nome, nome_fantasia")
        .eq("id", idSalao)
        .maybeSingle();

      if (error) throw error;
      return (data as SalaoResumoRow | null) || null;
    },

    async buscarCpfEmUso(params: {
      idSalao: string;
      cpf: string;
      idProfissional: string;
    }) {
      const { data, error } = await supabaseAdmin
        .from("profissionais_acessos")
        .select("id, id_profissional")
        .eq("cpf", params.cpf)
        .neq("id_profissional", params.idProfissional)
        .limit(20);

      if (error) throw error;

      const candidatos = data || [];
      if (!candidatos.length) return null;

      const idsProfissionais = candidatos
        .map((item) => item.id_profissional)
        .filter(Boolean);

      const { data: profissionais, error: profissionaisError } =
        await supabaseAdmin
          .from("profissionais")
          .select("id")
          .eq("id_salao", params.idSalao)
          .in("id", idsProfissionais);

      if (profissionaisError) throw profissionaisError;

      const idsDoSalao = new Set((profissionais || []).map((item) => item.id));
      return (
        candidatos.find((item) => idsDoSalao.has(item.id_profissional)) || null
      );
    },

    async buscarAcessoExistente(params: {
      idSalao: string;
      idProfissional: string;
    }) {
      const { data, error } = await supabaseAdmin
        .from("profissionais_acessos")
        .select("id, senha_hash")
        .eq("id_profissional", params.idProfissional)
        .maybeSingle();

      if (error) throw error;
      return (data as ProfissionalAcessoRow | null) || null;
    },

    async salvarAcesso(params: {
      idSalao: string;
      idProfissional: string;
      cpf: string;
      senhaHash: string | null;
      ativo: boolean;
      idAcesso?: string;
    }) {
      const payload = {
        id_profissional: params.idProfissional,
        cpf: params.cpf,
        ativo: params.ativo,
        ...(params.senhaHash ? { senha_hash: params.senhaHash } : {}),
      };

      if (params.idAcesso) {
        const { error } = await supabaseAdmin
          .from("profissionais_acessos")
          .update(payload)
          .eq("id", params.idAcesso)
          .eq("id_profissional", params.idProfissional);

        if (error) throw error;
        return;
      }

      if (!params.senhaHash) {
        throw new Error("Senha obrigatoria para criar acesso profissional.");
      }

      const { error } = await supabaseAdmin
        .from("profissionais_acessos")
        .insert({
          ...payload,
          senha_hash: params.senhaHash,
        });

      if (error) throw error;
    },

    async finalizarTicketRecuperacao(params: {
      idSalao: string;
      idProfissional: string;
      idTicket: string;
      nomeProfissional: string;
      nomeSalao: string;
    }) {
      const { data: ticket, error: ticketError } = await supabaseAdmin
        .from("tickets")
        .select("id, origem, origem_contexto")
        .eq("id", params.idTicket)
        .eq("id_salao", params.idSalao)
        .maybeSingle();

      if (ticketError) throw ticketError;

      const normalizedOrigin = String(ticket?.origem || "").trim().toLowerCase();
      const origemContexto =
        ticket?.origem_contexto &&
        typeof ticket.origem_contexto === "object" &&
        !Array.isArray(ticket.origem_contexto)
          ? ticket.origem_contexto
          : {};

      if (!ticket?.id || normalizedOrigin !== "app_profissional_login") {
        return;
      }

      if (String(origemContexto.id_profissional || "").trim() !== params.idProfissional) {
        return;
      }

      const now = new Date().toISOString();
      const mensagem = `Senha do app redefinida pelo salao ${params.nomeSalao}. O profissional ja pode entrar com a nova senha.`;

      await supabaseAdmin.from("ticket_mensagens").insert({
        id_ticket: params.idTicket,
        autor_tipo: "usuario",
        autor_nome: params.nomeSalao,
        mensagem,
        interna: false,
      });

      await supabaseAdmin.from("ticket_eventos").insert({
        id_ticket: params.idTicket,
        evento: "senha_redefinida_salao",
        descricao: `Senha redefinida pelo salao ${params.nomeSalao} para ${params.nomeProfissional}.`,
        payload_json: {
          nome_salao: params.nomeSalao,
          nome_profissional: params.nomeProfissional,
          id_profissional: params.idProfissional,
        } as Json,
      });

      const { error: updateError } = await supabaseAdmin
        .from("tickets")
        .update({
          status: "resolvido",
          atualizado_em: now,
          ultima_interacao_em: now,
          fechado_em: now,
        })
        .eq("id", params.idTicket)
        .eq("id_salao", params.idSalao);

      if (updateError) throw updateError;
    },
  };
}

export type ProfissionalAcessoService = ReturnType<
  typeof createProfissionalAcessoService
>;
