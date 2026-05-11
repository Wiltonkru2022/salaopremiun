import { runAdminOperation } from "@/lib/supabase/admin-ops";
import {
  clearClienteSession,
  createClienteSession,
} from "@/lib/cliente-auth.server";
import { syncClienteAppLinksByPhone } from "@/app/services/cliente-app/linking";

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
    return { ok: false, error: "Não foi possível identificar a conta do cliente." };
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
        .select("id, email, telefone")
        .eq("id", idConta)
        .limit(1)
        .maybeSingle();

      if (contaError || !contaAtual?.id) {
        return { ok: false, error: "Não foi possível localizar sua conta do app." };
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
            error: "Não foi possível validar seu novo e-mail agora.",
          };
        }

        if (duplicateRows?.length) {
          return {
            ok: false,
            error: "Já existe outra conta do app com esse e-mail.",
          };
        }
      }

      if (telefone && telefone !== String(contaAtual.telefone || "").trim()) {
        const { data: duplicatePhoneRows, error: duplicatePhoneError } =
          await (supabaseAdmin as any)
            .from("clientes_app_auth")
            .select("id")
            .eq("telefone", telefone)
            .neq("id", idConta)
            .limit(1);

        if (duplicatePhoneError) {
          return {
            ok: false,
            error: "Não foi possível validar seu novo telefone agora.",
          };
        }

        if (duplicatePhoneRows?.length) {
          return {
            ok: false,
            error:
              "Já existe outra conta do app com esse telefone. Use Recuperar acesso se esse numero for seu.",
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
          error: "Não foi possível salvar seu perfil agora.",
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

      await syncClienteAppLinksByPhone({ idConta });

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

export async function deleteClienteAppAccount(params: {
  idConta: string;
}): Promise<ClienteProfileActionResult> {
  const idConta = String(params.idConta || "").trim();

  if (!idConta) {
    return { ok: false, error: "Não foi possível identificar a conta do cliente." };
  }

  return runAdminOperation({
    action: "cliente_app_delete_account",
    actorId: idConta,
    run: async (supabaseAdmin) => {
      const { data: vinculos, error: vinculosError } = await supabaseAdmin
        .from("clientes_auth")
        .select("id, id_cliente, id_salao")
        .eq("app_conta_id", idConta);

      if (vinculosError) {
        return {
          ok: false as const,
          error: "Não foi possível carregar seus vínculos agora.",
        };
      }

      const hoje = new Date().toISOString().slice(0, 10);

      for (const vinculo of vinculos || []) {
        const idCliente = String(vinculo.id_cliente || "").trim();
        const idSalao = String(vinculo.id_salao || "").trim();
        if (!idCliente || !idSalao) continue;

        await supabaseAdmin
          .from("agendamentos")
          .update({
            status: "cancelado",
            updated_at: new Date().toISOString(),
            observacoes: "Cancelado por encerramento da conta do app cliente.",
          })
          .eq("id_salao", idSalao)
          .eq("cliente_id", idCliente)
          .gte("data", hoje)
          .in("status", ["pendente", "confirmado"]);
      }

      const [authUpdateResult, deleteContaResult] = await Promise.all([
        supabaseAdmin
          .from("clientes_auth")
          .update({
            app_ativo: false,
            app_conta_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("app_conta_id", idConta),
        (supabaseAdmin as any)
          .from("clientes_app_auth")
          .delete()
          .eq("id", idConta),
      ]);

      if (authUpdateResult.error || deleteContaResult.error) {
        return {
          ok: false as const,
          error: "Não foi possível encerrar sua conta agora.",
        };
      }

      await clearClienteSession();

      return {
        ok: true as const,
        message: "Conta encerrada com sucesso.",
      };
    },
  });
}
