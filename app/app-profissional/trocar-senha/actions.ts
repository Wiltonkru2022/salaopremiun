"use server";

import { revalidatePath } from "next/cache";
import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import {
  clearProfissionalSession,
  hashPassword,
  verifyPassword,
} from "@/lib/profissional-auth.server";

export type TrocarSenhaProfissionalState = {
  ok: boolean;
  message: string | null;
};

function normalizePassword(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

export async function trocarSenhaProfissionalAction(
  _prevState: TrocarSenhaProfissionalState,
  formData: FormData
): Promise<TrocarSenhaProfissionalState> {
  const session = await requireProfissionalAppContext();
  const senhaAtual = normalizePassword(formData.get("senha_atual"));
  const novaSenha = normalizePassword(formData.get("nova_senha"));
  const confirmarSenha = normalizePassword(formData.get("confirmar_senha"));

  if (!senhaAtual || !novaSenha || !confirmarSenha) {
    return { ok: false, message: "Preencha todos os campos." };
  }

  if (novaSenha.length < 6) {
    return { ok: false, message: "A nova senha precisa ter pelo menos 6 caracteres." };
  }

  if (novaSenha !== confirmarSenha) {
    return { ok: false, message: "A confirmação da senha não confere." };
  }

  if (senhaAtual === novaSenha) {
    return { ok: false, message: "Escolha uma senha diferente da atual." };
  }

  const result = await runAdminOperation({
    action: "app_profissional_trocar_senha",
    actorId: session.idProfissional,
    idSalao: session.idSalao,
    run: async (supabase) => {
      const { data: acesso, error } = await (supabase as any)
        .from("profissionais_acessos")
        .select("id, senha_hash, ativo, auth_version")
        .eq("id_profissional", session.idProfissional)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();

      if (error || !acesso?.senha_hash) {
        return {
          ok: false,
          message: "Não foi possível localizar seu acesso ativo.",
        };
      }

      const senhaAtualOk = await verifyPassword(senhaAtual, acesso.senha_hash);

      if (!senhaAtualOk) {
        return { ok: false, message: "Senha atual incorreta." };
      }

      const senhaHash = await hashPassword(novaSenha);
      const authVersionAtual = Math.max(1, Number(acesso.auth_version || 1));
      const { error: updateError } = await (supabase as any)
        .from("profissionais_acessos")
        .update({
          senha_hash: senhaHash,
          auth_version: authVersionAtual + 1,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", acesso.id)
        .eq("id_profissional", session.idProfissional);

      if (updateError) {
        return {
          ok: false,
          message: "Não foi possível salvar a nova senha agora.",
        };
      }

      revalidatePath("/app-profissional/perfil");
      return {
        ok: true,
        message: "Senha alterada. Entre novamente com a nova senha.",
      };
    },
  });

  if (result.ok) {
    await clearProfissionalSession();
  }

  return result;
}
