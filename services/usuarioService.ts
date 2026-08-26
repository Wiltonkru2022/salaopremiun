import { getDatabaseAdmin } from "@/lib/db/admin";
import {
  createClerkUser,
  deleteClerkUser,
  updateClerkUser,
} from "@/lib/platform/clerk-admin.server";

export type UsuarioNivel = "admin" | "gerente" | "recepcao" | "profissional";
export type UsuarioStatus = "ativo" | "inativo";

type UsuarioRow = {
  id: string;
  clerk_user_id?: string | null;
  email?: string | null;
  nivel?: string | null;
  status?: string | null;
  nome?: string | null;
};

export function createUsuarioService(
  database = getDatabaseAdmin()
) {
  return {
    async buscarPorEmail(params: { idSalao: string; email: string }) {
      const { data, error } = await database
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
      const { data, error } = await database
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
      let query = database
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
      const user = await createClerkUser({
        email: params.email,
        password: params.senha,
        nome: params.nome,
        publicMetadata: {
          id_salao: params.idSalao,
          nivel: params.nivel,
          status: "ativo",
        },
      });

      return {
        authUserId: user.id,
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
      await updateClerkUser({
        userId: params.authUserId,
        password: params.senha,
        nome: params.nome,
        publicMetadata: {
          id_salao: params.idSalao,
          nivel: params.nivel,
          status: params.status,
          email_cadastrado: params.email,
        },
      });
    },

    async deleteAuthUser(authUserId: string) {
      try {
        await deleteClerkUser(authUserId);
        return { data: null, error: null };
      } catch (error) {
        return {
          data: null,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "Erro ao excluir usuário Clerk.",
          },
        };
      }
    },

    async inserirUsuario(params: {
      idSalao: string;
      nome: string;
      email: string;
      nivel: UsuarioNivel;
      status: UsuarioStatus;
      authUserId: string;
    }) {
      const { data, error } = await database
        .from("usuarios")
        .insert({
          id_salao: params.idSalao,
          nome: params.nome,
          email: params.email,
          nivel: params.nivel,
          status: params.status,
          clerk_user_id: params.authUserId,
          auth_user_id: null,
        })
        .select("id, id_salao, nome, email, nivel, status, clerk_user_id")
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Erro ao gravar usuario no Neon.");
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
      const { error } = await database
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
      const { data, error } = await database
        .from("usuarios")
        .select("id, clerk_user_id, email, nivel, status, nome")
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
        payload.clerk_user_id = params.authUserId;
        payload.auth_user_id = null;
      }

      const { error } = await database
        .from("usuarios_senhas_reuso")
        .upsert(payload, { onConflict: "id_usuario" });

      if (error) throw error;
    },

    async contarAdminsAtivos(idSalao: string) {
      const { count, error } = await database
        .from("usuarios")
        .select("id", { count: "exact", head: true })
        .eq("id_salao", idSalao)
        .eq("status", "ativo")
        .eq("nivel", "admin");

      if (error) throw error;
      return Number(count || 0);
    },

    async excluirPermissoes(params: { idUsuario: string; idSalao: string }) {
      const { error } = await database
        .from("usuarios_permissoes")
        .delete()
        .eq("id_usuario", params.idUsuario)
        .eq("id_salao", params.idSalao);

      if (error) throw error;
    },

    async excluirUsuario(params: { idUsuario: string; idSalao: string }) {
      const { error } = await database
        .from("usuarios")
        .delete()
        .eq("id", params.idUsuario)
        .eq("id_salao", params.idSalao);

      if (error) throw error;
    },
  };
}

export type UsuarioService = ReturnType<typeof createUsuarioService>;
