import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.generated";

export type CategoriaServicoResult = {
  id: string;
  nome: string;
};

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

export function createServicoService(
  supabaseAdmin: SupabaseAdminClient = getSupabaseAdmin()
) {
  return {
    async criarOuObterCategoria(params: { idSalao: string; nome: string }) {
      const { data, error } = await supabaseAdmin.rpc(
        "fn_get_or_create_servico_categoria",
        {
          p_id_salao: params.idSalao,
          p_nome: params.nome,
        }
      );

      if (error) {
        throw error;
      }

      const categoria = (Array.isArray(data) ? data[0] : data) as
        | CategoriaServicoResult
        | null;

      if (!categoria?.id) {
        throw new Error("Nao foi possivel criar a categoria.");
      }

      return categoria;
    },

    async obterCategoria(params: { idSalao: string; idCategoria: string }) {
      const { data, error } = await supabaseAdmin
        .from("servicos_categorias")
        .select("id, nome")
        .eq("id", params.idCategoria)
        .eq("id_salao", params.idSalao)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data?.id) {
        throw new Error("Categoria do servico nao encontrada para este salao.");
      }

      return data as CategoriaServicoResult;
    },

    async salvarCatalogoTransacional(params: {
      idSalao: string;
      idServico: string | null;
      servicoPayload: Record<string, unknown>;
      vinculos: unknown[];
      consumos: unknown[];
    }) {
      const { data, error } = await supabaseAdmin.rpc(
        "fn_salvar_servico_catalogo_transacional",
        {
          p_id_salao: params.idSalao,
          p_id_servico: params.idServico as unknown as string,
          p_servico: params.servicoPayload as Json,
          p_vinculos: params.vinculos as Json,
          p_consumos: params.consumos as Json,
        }
      );

      if (error) throw error;

      const result = (Array.isArray(data) ? data[0] : data) as
        | { id_servico?: string | null }
        | string
        | null;
      const idServico =
        typeof result === "string" ? result : result?.id_servico || null;

      if (!idServico) {
        throw new Error("Nao foi possivel obter o servico salvo.");
      }

      return idServico;
    },

    async alterarStatus(params: {
      idSalao: string;
      idServico: string;
      ativo: boolean;
    }) {
      const { data, error } = await supabaseAdmin
        .from("servicos")
        .update({
          ativo: params.ativo,
          status: params.ativo ? "ativo" : "inativo",
        })
        .eq("id", params.idServico)
        .eq("id_salao", params.idSalao)
        .select("id, ativo, status")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data?.id) {
        throw new Error("Servico nao encontrado para alterar status.");
      }

      return {
        idServico: data.id,
        ativo: data.ativo,
        status: data.status,
      };
    },

    async excluir(params: { idSalao: string; idServico: string }) {
      const { error } = await supabaseAdmin.rpc("fn_excluir_servico_catalogo", {
        p_id_salao: params.idSalao,
        p_id_servico: params.idServico,
      });

      if (error) {
        throw error;
      }

      return {
        idServico: params.idServico,
      };
    },
  };
}

export type ServicoService = ReturnType<typeof createServicoService>;
