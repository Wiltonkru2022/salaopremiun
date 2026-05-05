import { runAdminOperation } from "@/lib/supabase/admin-ops";
import { hashClientePassword, verifyClientePassword } from "@/lib/cliente-auth.server";
import { canSalonAppearInClientApp, listEligibleSalonIdsByEmail } from "@/lib/client-app/eligibility";

type ClienteLoginResult =
  | {
      ok: true;
      session: {
        idCliente: string;
        idSalao: string;
        nome: string;
        email: string;
        tipo: "cliente";
      };
    }
  | {
      ok: false;
      error: string;
    };

function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value: string) {
  return String(value || "").replace(/\D/g, "").trim();
}

async function buildClienteSession(params: {
  idCliente: string;
  idSalao: string;
  email: string;
}): Promise<ClienteLoginResult> {
  const elegibilidade = await canSalonAppearInClientApp(params.idSalao);
  if (!elegibilidade.allowed) {
    return {
      ok: false,
      error: "Este salao nao esta com o app cliente disponivel agora.",
    };
  }

  return runAdminOperation({
    action: "cliente_app_build_session",
    actorId: params.idCliente,
    idSalao: params.idSalao,
    run: async (supabaseAdmin): Promise<ClienteLoginResult> => {
      const { data: cliente, error } = await supabaseAdmin
        .from("clientes")
        .select("id, id_salao, nome, email, status")
        .eq("id", params.idCliente)
        .eq("id_salao", params.idSalao)
        .limit(1)
        .maybeSingle();

      if (error || !cliente?.id) {
        return { ok: false, error: "Nao foi possivel localizar sua conta." };
      }

      if (String(cliente.status || "").toLowerCase() !== "ativo") {
        return { ok: false, error: "Sua conta de cliente esta inativa." };
      }

      return {
        ok: true,
        session: {
          idCliente: cliente.id,
          idSalao: String(cliente.id_salao || params.idSalao),
          nome:
            String(cliente.nome || "").trim() || "Cliente SalaoPremium",
          email: normalizeEmail(params.email || cliente.email || ""),
          tipo: "cliente",
        },
      };
    },
  });
}

export async function createClienteAppAccount(params: {
  idSalao: string;
  nome: string;
  email: string;
  telefone?: string;
  senha: string;
}): Promise<ClienteLoginResult> {
  const email = normalizeEmail(params.email);
  const telefone = normalizePhone(params.telefone || "");
  const nome = String(params.nome || "").trim();
  const senha = String(params.senha || "").trim();

  if (!nome) {
    return { ok: false, error: "Informe seu nome." };
  }

  if (!email) {
    return { ok: false, error: "Informe um e-mail valido." };
  }

  if (senha.length < 6) {
    return { ok: false, error: "A senha precisa ter pelo menos 6 caracteres." };
  }

  const elegibilidade = await canSalonAppearInClientApp(params.idSalao);
  if (!elegibilidade.allowed) {
    return {
      ok: false,
      error: "Este salao ainda nao esta publicado no app cliente.",
    };
  }

  return runAdminOperation({
    action: "cliente_app_signup",
    actorId: email,
    idSalao: params.idSalao,
    run: async (supabaseAdmin): Promise<ClienteLoginResult> => {
      const [{ data: existingAuthRows, error: authError }, { data: existingClienteRows, error: clienteError }] =
        await Promise.all([
          supabaseAdmin
            .from("clientes_auth")
            .select("id, id_cliente, email, app_ativo")
            .eq("id_salao", params.idSalao)
            .eq("email", email)
            .limit(1),
          supabaseAdmin
            .from("clientes")
            .select("id, nome, email, telefone, whatsapp, status")
            .eq("id_salao", params.idSalao)
            .eq("email", email)
            .limit(1),
        ]);

      if (authError || clienteError) {
        return {
          ok: false,
          error: "Nao foi possivel validar seu cadastro agora.",
        };
      }

      const existingAuth = existingAuthRows?.[0];
      if (existingAuth?.id) {
        return {
          ok: false,
          error: "Ja existe uma conta ativa com este e-mail para este salao.",
        };
      }

      const senhaHash = await hashClientePassword(senha);
      const existingCliente = existingClienteRows?.[0];

      let idCliente = String(existingCliente?.id || "").trim();

      if (idCliente) {
        const { error: updateClienteError } = await supabaseAdmin
          .from("clientes")
          .update({
            nome,
            email,
            telefone: telefone || existingCliente?.telefone || null,
            whatsapp: telefone || existingCliente?.whatsapp || null,
            status: "ativo",
            ativo: "ativo",
          })
          .eq("id", idCliente)
          .eq("id_salao", params.idSalao);

        if (updateClienteError) {
          return {
            ok: false,
            error: "Nao foi possivel atualizar seu cadastro de cliente.",
          };
        }
      } else {
        const { data: createdCliente, error: insertClienteError } = await supabaseAdmin
          .from("clientes")
          .insert({
            id_salao: params.idSalao,
            nome,
            email,
            telefone: telefone || null,
            whatsapp: telefone || null,
            status: "ativo",
            ativo: "ativo",
          })
          .select("id")
          .maybeSingle();

        if (insertClienteError || !createdCliente?.id) {
          return {
            ok: false,
            error: "Nao foi possivel criar sua ficha de cliente.",
          };
        }

        idCliente = String(createdCliente.id);
      }

      const { error: insertAuthError } = await supabaseAdmin
        .from("clientes_auth")
        .insert({
          id_salao: params.idSalao,
          id_cliente: idCliente,
          email,
          senha_hash: senhaHash,
          app_ativo: true,
        });

      if (insertAuthError) {
        return {
          ok: false,
          error: "Nao foi possivel ativar seu acesso ao app cliente.",
        };
      }

      return buildClienteSession({
        idCliente,
        idSalao: params.idSalao,
        email,
      });
    },
  });
}

export async function loginClienteAppByEmailSenha(params: {
  email: string;
  senha: string;
  idSalao?: string | null;
}): Promise<ClienteLoginResult> {
  const email = normalizeEmail(params.email);
  const senha = String(params.senha || "").trim();
  const idSalao = String(params.idSalao || "").trim() || null;

  if (!email || !senha) {
    return { ok: false, error: "Informe e-mail e senha." };
  }

  return runAdminOperation({
    action: "cliente_app_login",
    actorId: email,
    idSalao,
    run: async (supabaseAdmin): Promise<ClienteLoginResult> => {
      let query = supabaseAdmin
        .from("clientes_auth")
        .select("id, id_cliente, id_salao, email, senha_hash, app_ativo")
        .eq("email", email)
        .eq("app_ativo", true)
        .limit(idSalao ? 1 : 3);

      if (idSalao) {
        query = query.eq("id_salao", idSalao);
      }

      const { data: authRows, error } = await query;

      if (error || !authRows?.length) {
        return { ok: false, error: "E-mail ou senha invalidos." };
      }

      if (!idSalao && authRows.length > 1) {
        const eligibleSalonIds = await listEligibleSalonIdsByEmail(email);
        if (eligibleSalonIds.length > 1) {
          return {
            ok: false,
            error:
              "Seu e-mail aparece em mais de um salao. Entre pelo link do salao desejado.",
          };
        }
      }

      const acesso = authRows[0];
      if (!acesso?.senha_hash) {
        return { ok: false, error: "E-mail ou senha invalidos." };
      }
      const senhaOk = await verifyClientePassword(senha, acesso.senha_hash);

      if (!senhaOk) {
        return { ok: false, error: "E-mail ou senha invalidos." };
      }

      await supabaseAdmin
        .from("clientes_auth")
        .update({ ultimo_login_em: new Date().toISOString() })
        .eq("id", acesso.id);

      return buildClienteSession({
        idCliente: acesso.id_cliente,
        idSalao: acesso.id_salao,
        email,
      });
    },
  });
}
