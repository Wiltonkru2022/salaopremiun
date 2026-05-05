import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type UserPermissionsRow = Record<string, unknown> | null;

const getCachedUserPermissions = unstable_cache(
  async (idSalao: string, idUsuario: string): Promise<UserPermissionsRow> => {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("usuarios_permissoes")
      .select(
        "agenda_criar, agenda_editar, agenda_excluir, agenda_ver, caixa_fechar, caixa_operar, caixa_ver, clientes_criar, clientes_editar, clientes_excluir, clientes_ver, comandas_criar, comandas_editar, comandas_excluir, comandas_ver, comissoes_pagar, comissoes_ver, configuracoes_editar, configuracoes_ver, estoque_movimentar, estoque_ver, id, id_salao, id_usuario, produtos_criar, produtos_editar, produtos_excluir, produtos_ver, profissionais_criar, profissionais_editar, profissionais_excluir, profissionais_ver, relatorios_ver, servicos_criar, servicos_editar, servicos_excluir, servicos_ver, vendas_excluir, vendas_reabrir, vendas_ver"
      )
      .eq("id_usuario", idUsuario)
      .eq("id_salao", idSalao)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "Erro ao carregar permissoes do usuario.");
    }

    return (data as Record<string, unknown> | null) || null;
  },
  ["user-permissions"],
  {
    revalidate: 60,
  }
);

export async function getUserPermissionsRow(idSalao: string, idUsuario: string) {
  return getCachedUserPermissions(idSalao, idUsuario);
}
