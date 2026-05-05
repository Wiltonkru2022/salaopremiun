import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { createClienteSession } from "@/lib/cliente-auth.server";

type UpdateClienteProfileParams = {
  idConta: string;
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
  const idConta = String(params.idConta || "").trim();
  const nome = String(params.nome || "").trim();
  const email = normalizeEmail(params.email);
  const telefone = normalizePhone(params.telefone || "");
  const preferencias = String(params.preferencias || "").trim() || null;

  if (!idConta) {
    return { ok: false, error: "Nao foi possivel identificar a conta do cliente." };
  }

  if (!nome) {
    return { ok: false, error: "Informe seu nome." };
  }

  if (!email) {
    return { ok: false, error: "Informe um e-mail valido." };
  }

  return runAdminOperation({
    action: "cliente_app_update_profile_global",
    actorId: idConta,
    run: async (supabaseAdmin) => {
      const { data: contaAtual, error: contaError } = await (supabaseAdmin as any)
        .from("clientes_app_auth")
        .select("id, email")
        .eq("id", idConta)
        .limit(1)
        .maybeSingle();

      if (contaError || !contaAtual?.id) {
        return { ok: false, error: "Nao foi possivel localizar sua conta global." };
      }

      if (email !== String(contaAtual.email || "").trim().toLowerCase()) {
        const { data: duplicateRows, error: duplicateError } =
          await (supabaseAdmin as any)
            .from("clientes_app_auth")
            .select("id")
            .eq("email", email)
            .neq("id", idConta)
            .limit(1);

        if (duplicateError) {
          return {
            ok: false,
            error: "Nao foi possivel validar seu novo e-mail agora.",
          };
        }

        if (duplicateRows?.length) {
          return {
            ok: false,
            error: "Ja existe outra conta global com esse e-mail.",
          };
        }
      }

      const [contaUpdateResult, clientesAuthRowsResult] = await Promise.all([
        (supabaseAdmin as any)
          .from("clientes_app_auth")
          .update({
            nome,
            email,
            telefone: telefone || null,
            preferencias_gerais: preferencias,
            updated_at: new Date().toISOString(),
          })
          .eq("id", idConta),
        supabaseAdmin
          .from("clientes_auth")
          .select("id_cliente, id_salao")
          .eq("app_conta_id", idConta),
      ]);

      if (contaUpdateResult.error || clientesAuthRowsResult.error) {
        return {
          ok: false,
          error: "Nao foi possivel salvar seu perfil agora.",
        };
      }

      const vinculos =
        clientesAuthRowsResult.data?.filter(
          (item) => item.id_cliente && item.id_salao
        ) || [];

      for (const vinculo of vinculos) {
        const idCliente = String(vinculo.id_cliente || "").trim();
        const idSalao = String(vinculo.id_salao || "").trim();
        if (!idCliente || !idSalao) continue;

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
        ]);
      }

      await createClienteSession({
        idConta,
        nome,
        email,
        telefone: telefone || null,
        tipo: "cliente",
      });

      return {
        ok: true,
        message: "Perfil atualizado com sucesso.",
      };
    },
  });
}
