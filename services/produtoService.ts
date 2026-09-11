import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.generated";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;
type ProdutoPayload = Database["public"]["Tables"]["produtos"]["Insert"];

export function createProdutoService(
  supabaseAdmin: SupabaseAdminClient = getSupabaseAdmin()
) {
  return {
    async salvar(params: {
      idSalao: string;
      idProduto: string | null;
      payload: Record<string, unknown>;
    }) {
      if (params.idProduto) {
        const { data, error } = await supabaseAdmin
          .from("produtos")
          .update(params.payload as ProdutoPayload)
          .eq("id", params.idProduto)
          .eq("id_salao", params.idSalao)
          .select("id")
          .maybeSingle();

        if (error) throw error;
        if (!data?.id) {
          throw new Error("Produto nao encontrado para atualizacao.");
        }

        return { idProduto: data.id };
      }

      const { data, error } = await supabaseAdmin
        .from("produtos")
        .insert(params.payload as ProdutoPayload)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      return {
        idProduto: data?.id || null,
      };
    },

    async alterarStatus(params: {
      idSalao: string;
      idProduto: string;
      ativo: boolean;
    }) {
      const { data, error } = await supabaseAdmin
        .from("produtos")
        .update({
          ativo: params.ativo,
          status: params.ativo ? "ativo" : "inativo",
        })
        .eq("id", params.idProduto)
        .eq("id_salao", params.idSalao)
        .select("id, ativo, status")
        .maybeSingle();

      if (error) throw error;
      if (!data?.id) {
        throw new Error("Produto nao encontrado para alterar status.");
      }

      return {
        idProduto: data.id,
        ativo: data.ativo,
        status: data.status,
      };
    },

    async contarDependenciasExclusao(params: {
      idSalao: string;
      idProduto: string;
    }) {
      const [
        { count: movimentacoesCount, error: movimentacoesError },
        { count: consumoServicoCount, error: consumoServicoError },
        { count: comandaItensCount, error: comandaItensError },
      ] = await Promise.all([
        supabaseAdmin
          .from("produtos_movimentacoes")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", params.idSalao)
          .eq("id_produto", params.idProduto),
        supabaseAdmin
          .from("produto_servico_consumo")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", params.idSalao)
          .eq("id_produto", params.idProduto),
        supabaseAdmin
          .from("comanda_itens")
          .select("id", { count: "exact", head: true })
          .eq("id_salao", params.idSalao)
          .eq("id_produto", params.idProduto),
      ]);

      if (movimentacoesError) throw movimentacoesError;
      if (consumoServicoError) throw consumoServicoError;
      if (comandaItensError) throw comandaItensError;

      return {
        movimentacoesCount: movimentacoesCount || 0,
        consumoServicoCount: consumoServicoCount || 0,
        comandaItensCount: comandaItensCount || 0,
      };
    },

    async excluir(params: { idSalao: string; idProduto: string }) {
      const { error } = await supabaseAdmin.rpc("fn_excluir_produto_catalogo", {
        p_id_salao: params.idSalao,
        p_id_produto: params.idProduto,
      });

      if (error) throw error;

      return {
        idProduto: params.idProduto,
      };
    },
  };
}

export type ProdutoService = ReturnType<typeof createProdutoService>;
