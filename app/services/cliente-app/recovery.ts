import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { hashClientePassword } from "@/lib/cliente-auth.server";

type RecoverClienteAppAccessParams = {
  email: string;
  telefone: string;
  senha: string;
  confirmacao: string;
};

type RecoverClienteAppAccessResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value: string) {
  return String(value || "").replace(/\D/g, "").trim();
}

export async function recoverClienteAppAccess(
  params: RecoverClienteAppAccessParams
): Promise<RecoverClienteAppAccessResult> {
  const email = normalizeEmail(params.email);
  const telefone = normalizePhone(params.telefone);
  const senha = String(params.senha || "").trim();
  const confirmacao = String(params.confirmacao || "").trim();

  if (!email) {
    return { ok: false, error: "Informe o e-mail da conta." };
  }

  if (!telefone) {
    return { ok: false, error: "Informe o telefone cadastrado da conta." };
  }

  if (senha.length < 6) {
    return { ok: false, error: "A nova senha precisa ter pelo menos 6 caracteres." };
  }

  if (senha !== confirmacao) {
    return { ok: false, error: "A confirmacao da senha nao confere." };
  }

  return runAdminOperation({
    action: "cliente_app_recover_access",
    actorId: email,
    run: async (supabaseAdmin) => {
      const { data: conta, error } = await (supabaseAdmin as any)
        .from("clientes_app_auth")
        .select("id, telefone, ativo")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (error || !conta?.id || conta.ativo === false) {
        return {
          ok: false as const,
          error: "Nao encontramos uma conta global ativa com esse e-mail.",
        };
      }

      const telefoneConta = normalizePhone(String(conta.telefone || ""));
      if (!telefoneConta || telefoneConta !== telefone) {
        return {
          ok: false as const,
          error: "O telefone informado nao confere com a conta global.",
        };
      }

      const senhaHash = await hashClientePassword(senha);

      const [updateContaResult, vinculosResult] = await Promise.all([
        (supabaseAdmin as any)
          .from("clientes_app_auth")
          .update({
            senha_hash: senhaHash,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conta.id),
        supabaseAdmin
          .from("clientes_auth")
          .select("id")
          .eq("app_conta_id", conta.id),
      ]);

      if (updateContaResult.error || vinculosResult.error) {
        return {
          ok: false as const,
          error: "Nao foi possivel atualizar sua senha agora.",
        };
      }

      if (vinculosResult.data?.length) {
        await supabaseAdmin
          .from("clientes_auth")
          .update({
            senha_hash: senhaHash,
            updated_at: new Date().toISOString(),
          })
          .eq("app_conta_id", conta.id);
      }

      return {
        ok: true as const,
        message:
          "Senha atualizada com sucesso. Agora voce ja pode voltar ao login.",
      };
    },
  });
}
