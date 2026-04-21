import { getSupabaseAdmin } from "@/lib/supabase/admin";

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

    async buscarCpfEmUso(params: {
      idSalao: string;
      cpf: string;
      idProfissional: string;
    }) {
      const { data, error } = await supabaseAdmin
        .from("profissionais_acessos")
        .select("id, id_profissional")
        .eq("id_salao", params.idSalao)
        .eq("cpf", params.cpf)
        .neq("id_profissional", params.idProfissional)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.id ? data : null;
    },

    async buscarAcessoExistente(params: {
      idSalao: string;
      idProfissional: string;
    }) {
      const { data, error } = await supabaseAdmin
        .from("profissionais_acessos")
        .select("id, senha_hash")
        .eq("id_salao", params.idSalao)
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
        id_salao: params.idSalao,
        id_profissional: params.idProfissional,
        cpf: params.cpf,
        senha_hash: params.senhaHash,
        ativo: params.ativo,
      };

      if (params.idAcesso) {
        const { error } = await supabaseAdmin
          .from("profissionais_acessos")
          .update(payload)
          .eq("id", params.idAcesso)
          .eq("id_salao", params.idSalao);

        if (error) throw error;
        return;
      }

      const { error } = await supabaseAdmin
        .from("profissionais_acessos")
        .insert(payload);

      if (error) throw error;
    },
  };
}

export type ProfissionalAcessoService = ReturnType<
  typeof createProfissionalAcessoService
>;
