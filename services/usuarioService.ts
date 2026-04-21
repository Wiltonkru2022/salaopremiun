import { getSupabaseAdmin } from "@/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof getSupabaseAdmin>;

export type UsuarioNivel = "admin" | "gerente" | "recepcao" | "profissional";
export type UsuarioStatus = "ativo" | "inativo";

type UsuarioRow = {
  id: string;
  auth_user_id?: string | null;
  email?: string | null;
  nivel?: string | null;
  status?: string | null;
  nome?: string | null;
};

export function createUsuarioService(
  supabaseAdmin: SupabaseAdminClient = getSupabaseAdmin()
) {
  return {
    async buscarPorEmail(params: { idSalao: string; email: string }) {
      const { data, error } = await supabaseAdmin
        .from("usuarios")
        .select("id")
        .eq("id_salao", params.idSalao)
        .eq("email", params.email)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.id ? { id: String(data.id) } : null;
    },

    async buscarPorEmailExceto(params: {
      idSalao: string;
      email: string;
      idUsuario: string;
    }) {
      const { data, error } = await supabaseAdmin
        .from("usuarios")
        .select("id")
        .eq("id_salao", params.idSalao)
        .eq("email", params.email)
        .neq("id", params.idUsuario)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.id ? { id: String(data.id) } : null;
    },

    async buscarSenhaReuso(params: {
      idSalao: string;
      senhaHashReuso: string;
      idUsuarioExcluido?: string;
    }) {
      let query = supabaseAdmin
        .from("usuarios_senhas_reuso")
        .select("id")
        .eq("id_salao", params.idSalao)
        .eq("senha_hash_reuso", params.senhaHashReuso);

      if (params.idUsuarioExcluido) {
        query = query.neq("id_usuario", params.idUsuarioExcluido);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error) throw error;
      return data?.id ? { id: String(data.id) } : null;
    },

    async criarAuthUser(params: {
      email: string;
      senha: string;
      nome: string;
      idSalao: string;
      nivel: UsuarioNivel;
    }) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: params.email,
        password: params.senha,
        email_confirm: true,
        user_metadata: {
          nome: params.nome,
          id_salao: params.idSalao,
          nivel: params.nivel,
        },
      });

      if (error || !data.user) {
        throw new Error(error?.message || "Erro ao criar usuario no Auth.");
      }

      return {
        authUserId: data.user.id,
      };
    },

    async atualizarAuthUser(params: {
      authUserId: string;
      email: string;
      nome: string;
      idSalao: string;
      nivel: UsuarioNivel;
      status: UsuarioStatus;
      senha?: string;
    }) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        params.authUserId,
        {
          email: params.email,
          password: params.senha,
          user_metadata: {
            nome: params.nome,
            id_salao: params.idSalao,
            nivel: params.nivel,
            status: params.status,
          },
        }
      );

      if (error) throw error;
    },

    deleteAuthUser(authUserId: string) {
      return supabaseAdmin.auth.admin.deleteUser(authUserId);
    },

    async inserirUsuario(params: {
      idSalao: string;
      nome: string;
      email: string;
      nivel: UsuarioNivel;
      status: UsuarioStatus;
      authUserId: string;
    }) {
      const { data, error } = await supabaseAdmin
        .from("usuarios")
        .insert({
          id_salao: params.idSalao,
          nome: params.nome,
          email: params.email,
          nivel: params.nivel,
          status: params.status,
          auth_user_id: params.authUserId,
        })
        .select("id, id_salao, nome, email, nivel, status, auth_user_id")
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Erro ao gravar usuario.");
      }

      return data;
    },

    async atualizarUsuario(params: {
      idUsuario: string;
      idSalao: string;
      nome: string;
      email: string;
      nivel: UsuarioNivel;
      status: UsuarioStatus;
    }) {
      const { error } = await supabaseAdmin
        .from("usuarios")
        .update({
          nome: params.nome,
          email: params.email,
          nivel: params.nivel,
          status: params.status,
        })
        .eq("id", params.idUsuario)
        .eq("id_salao", params.idSalao);

      if (error) throw error;
    },

    async buscarUsuario(params: { idUsuario: string; idSalao: string }) {
      const { data, error } = await supabaseAdmin
        .from("usuarios")
        .select("id, auth_user_id, email, nivel, status, nome")
        .eq("id", params.idUsuario)
        .eq("id_salao", params.idSalao)
        .maybeSingle();

      if (error) throw error;
      return (data as UsuarioRow | null) || null;
    },

    async registrarSenhaReuso(params: {
      idSalao: string;
      idUsuario: string;
      authUserId?: string;
      email: string;
      senhaHashReuso: string;
    }) {
      const payload: Record<string, unknown> = {
        id_salao: params.idSalao,
        id_usuario: params.idUsuario,
        email: params.email,
        senha_hash_reuso: params.senhaHashReuso,
      };

      if (params.authUserId) {
        payload.auth_user_id = params.authUserId;
      }

      const { error } = await supabaseAdmin
        .from("usuarios_senhas_reuso")
        .upsert(payload, { onConflict: "id_usuario" });

      if (error) throw error;
    },

    async contarAdminsAtivos(idSalao: string) {
      const { count, error } = await supabaseAdmin
        .from("usuarios")
        .select("id", { count: "exact", head: true })
        .eq("id_salao", idSalao)
        .eq("status", "ativo")
        .eq("nivel", "admin");

      if (error) throw error;
      return Number(count || 0);
    },

    async excluirPermissoes(params: { idUsuario: string; idSalao: string }) {
      const { error } = await supabaseAdmin
        .from("usuarios_permissoes")
        .delete()
        .eq("id_usuario", params.idUsuario)
        .eq("id_salao", params.idSalao);

      if (error) throw error;
    },

    async excluirUsuario(params: { idUsuario: string; idSalao: string }) {
      const { error } = await supabaseAdmin
        .from("usuarios")
        .delete()
        .eq("id", params.idUsuario)
        .eq("id_salao", params.idSalao);

      if (error) throw error;
    },
  };
}

export type UsuarioService = ReturnType<typeof createUsuarioService>;
