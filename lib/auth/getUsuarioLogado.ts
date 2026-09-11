import { createClient } from "@/lib/supabase/client";
import {
  PAINEL_SESSION_STORAGE_KEY,
  type PainelSessionSnapshot,
} from "@/lib/painel/session-snapshot";

export async function getUsuarioLogado() {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(PAINEL_SESSION_STORAGE_KEY);
      if (raw) {
        const snapshot = JSON.parse(raw) as PainelSessionSnapshot;

        if (snapshot?.idSalao && snapshot?.idUsuario) {
          return {
            ok: true,
            user: null,
            perfil: {
              id: snapshot.idUsuario,
              id_salao: snapshot.idSalao,
              nome: snapshot.userName || null,
              email: snapshot.userEmail || null,
              nivel: snapshot.nivel || null,
              status: "ativo",
              auth_user_id: null,
            },
            supabase: createClient(),
            idSalao: snapshot.idSalao,
          };
        }
      }
    } catch {
      // Se o cache falhar, segue para o fluxo normal.
    }
  }

  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return { ok: false, error: "Erro ao validar autenticação." };
  }

  if (!user) {
    return { ok: false, error: "Usuário não autenticado." };
  }

  const { data: perfilRows, error: perfilError } = await supabase
    .from("usuarios")
    .select("id, id_salao, nome, email, nivel, status, auth_user_id")
    .eq("auth_user_id", user.id)
    .limit(1);

  if (perfilError) {
    return { ok: false, error: "Erro ao buscar usuário do sistema." };
  }

  const perfil = perfilRows?.[0];

  // 🔴 usuário não existe na tabela
  if (!perfil) {
    return { ok: false, error: "Usuário não encontrado no sistema." };
  }

  // 🔴 sem salão
  if (!perfil.id_salao) {
    return { ok: false, error: "Usuário sem vínculo com salão." };
  }

  // 🔴 usuário inativo
  if (perfil.status && perfil.status !== "ativo") {
    return { ok: false, error: "Usuário inativo." };
  }

  return {
    ok: true,
    user,
    perfil,
    supabase,
    idSalao: perfil.id_salao,
  };
}
