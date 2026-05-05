import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { createClienteSession } from "@/lib/cliente-auth.server";

type UpdateClienteProfileParams = {
  idSalao: string;
  idCliente: string;
  nome: string;
  email: string;
  telefone?: string | null;
  preferencias?: string | null;
};

export type ClienteProfileActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value: string) {
  return String(value || "").replace(/\D/g, "").trim();
}

export async function updateClienteAppProfile(
  params: UpdateClienteProfileParams
): Promise<ClienteProfileActionResult> {
  const idSalao = String(params.idSalao || "").trim();
  const idCliente = String(params.idCliente || "").trim();
  const nome = String(params.nome || "").trim();
  const email = normalizeEmail(params.email);
  const telefone = normalizePhone(params.telefone || "");
  const preferencias = String(params.preferencias || "").trim() || null;

  if (!idSalao || !idCliente) {
    return { ok: false, error: "Nao foi possivel identificar a conta do cliente." };
  }

  if (!nome) {
    return { ok: false, error: "Informe seu nome." };
  }

  if (!email) {
    return { ok: false, error: "Informe um e-mail valido." };
  }

  return runAdminOperation({
    action: "cliente_app_update_profile",
    actorId: idCliente,
    idSalao,
    run: async (supabaseAdmin) => {
      const { data: authRow, error: authError } = await supabaseAdmin
        .from("clientes_auth")
        .select("id, email")
        .eq("id_cliente", idCliente)
        .eq("id_salao", idSalao)
        .eq("app_ativo", true)
        .limit(1)
        .maybeSingle();

      if (authError || !authRow?.id) {
        return { ok: false, error: "Nao foi possivel localizar seu acesso ao app." };
      }

      if (email !== String(authRow.email || "").trim().toLowerCase()) {
        const { data: duplicateAuthRows, error: duplicateAuthError } =
          await supabaseAdmin
            .from("clientes_auth")
            .select("id")
            .eq("id_salao", idSalao)
            .eq("email", email)
            .neq("id_cliente", idCliente)
            .limit(1);

        if (duplicateAuthError) {
          return {
            ok: false,
            error: "Nao foi possivel validar seu novo e-mail agora.",
          };
        }

        if (duplicateAuthRows?.length) {
          return {
            ok: false,
            error: "Ja existe outra conta de cliente com esse e-mail neste salao.",
          };
        }
      }

      const [clienteResult, authUpdateResult, preferenciasResult] =
        await Promise.all([
          supabaseAdmin
            .from("clientes")
            .update({
              nome,
              email,
              telefone: telefone || null,
              whatsapp: telefone || null,
              atualizado_em: new Date().toISOString(),
            })
            .eq("id", idCliente)
            .eq("id_salao", idSalao),
          supabaseAdmin
            .from("clientes_auth")
            .update({
              email,
              updated_at: new Date().toISOString(),
            })
            .eq("id_cliente", idCliente)
            .eq("id_salao", idSalao),
          (supabaseAdmin as any)
            .from("clientes_preferencias")
            .upsert(
              {
                id_cliente: idCliente,
                id_salao: idSalao,
                preferencias_gerais: preferencias,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: "id_cliente",
              }
            ),
        ]);

      if (
        clienteResult.error ||
        authUpdateResult.error ||
        preferenciasResult.error
      ) {
        return {
          ok: false,
          error: "Nao foi possivel salvar seu perfil agora.",
        };
      }

      await createClienteSession({
        idCliente,
        idSalao,
        nome,
        email,
        tipo: "cliente",
      });

      return {
        ok: true,
        message: "Perfil atualizado com sucesso.",
      };
    },
  });
}
