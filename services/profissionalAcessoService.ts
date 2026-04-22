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
  };
}

export type ProfissionalAcessoService = ReturnType<
  typeof createProfissionalAcessoService
>;
