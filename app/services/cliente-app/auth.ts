import { runAdminOperation } from "@/lib/supabase/admin-ops";
import {
  hashClientePassword,
  verifyClientePassword,
  type ClienteAppSession,
} from "@/lib/cliente-auth.server";
import {
  canSalonAppearInClientApp,
  listEligibleSalonIdsByEmail,
} from "@/lib/client-app/eligibility";

type ClienteLoginResult =
  | {
      ok: true;
      session: ClienteAppSession;
    }
  | {
      ok: false;
      error: string;
    };

type ClienteAppAccountRow = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  senha_hash: string | null;
  ativo: boolean | null;
};

function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value: string) {
  return String(value || "").replace(/\D/g, "").trim();
}

function buildSessionFromAccount(
  account: Pick<ClienteAppAccountRow, "id" | "nome" | "email" | "telefone">
): ClienteAppSession {
  return {
    idConta: String(account.id),
    nome: String(account.nome || "").trim() || "Cliente SalaoPremium",
    email:
      normalizeEmail(String(account.email || "").trim()) ||
      "cliente@salaopremium.local",
    telefone: String(account.telefone || "").trim() || null,
    tipo: "cliente",
  };
}

async function findGlobalAccountByEmail(supabaseAdmin: any, email: string) {
  const { data, error } = await supabaseAdmin
    .from("clientes_app_auth")
    .select("id, nome, email, telefone, senha_hash, ativo")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }

  return data as ClienteAppAccountRow;
}

async function createGlobalAccountFromLegacy(params: {
  supabaseAdmin: any;
  email: string;
  legacyHash: string;
  nome?: string | null;
  telefone?: string | null;
}) {
  const { data, error } = await params.supabaseAdmin
    .from("clientes_app_auth")
    .insert({
      nome: String(params.nome || "").trim() || "Cliente SalaoPremium",
      email: params.email,
      telefone: String(params.telefone || "").trim() || null,
      senha_hash: params.legacyHash,
      ativo: true,
      ultimo_login_em: new Date().toISOString(),
    })
    .select("id, nome, email, telefone, senha_hash, ativo")
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }

  return data as ClienteAppAccountRow;
}

export async function ensureClienteContaVinculadaAoSalao(params: {
  idConta: string;
  idSalao: string;
}) {
  const idConta = String(params.idConta || "").trim();
  const idSalao = String(params.idSalao || "").trim();

  if (!idConta || !idSalao) {
    return {
      ok: false as const,
      error: "Nao foi possivel identificar a conta para este salao.",
    };
  }

  const elegibilidade = await canSalonAppearInClientApp(idSalao);
  if (!elegibilidade.allowed) {
    return {
      ok: false as const,
      error: "Este salao nao esta publicado no app cliente agora.",
    };
  }

  return runAdminOperation({
    action: "cliente_app_ensure_salon_link",
    actorId: idConta,
    idSalao,
    run: async (supabaseAdmin) => {
      const { data: accountRow, error: accountError } = await (supabaseAdmin as any)
        .from("clientes_app_auth")
        .select("id, nome, email, telefone, senha_hash, ativo")
        .eq("id", idConta)
        .limit(1)
        .maybeSingle();

      if (accountError || !accountRow?.id || accountRow.ativo === false) {
        return {
          ok: false as const,
          error: "Sua conta global de cliente nao esta disponivel agora.",
        };
      }

      const account = accountRow as ClienteAppAccountRow;

      const { data: linkedAuthRows, error: linkedAuthError } = await supabaseAdmin
        .from("clientes_auth")
        .select("id, id_cliente")
        .eq("id_salao", idSalao)
        .eq("app_conta_id", idConta)
        .eq("app_ativo", true)
        .limit(1);

      if (linkedAuthError) {
        return {
          ok: false as const,
          error: "Nao foi possivel validar seu acesso ao salao agora.",
        };
      }

      const linkedAuth = linkedAuthRows?.[0];
      if (linkedAuth?.id && linkedAuth.id_cliente) {
        return {
          ok: true as const,
          idCliente: String(linkedAuth.id_cliente),
        };
      }

      const email = normalizeEmail(account.email || "");
      const telefone = normalizePhone(account.telefone || "");

      const [{ data: authByEmailRows, error: authByEmailError }, { data: clientesByEmailRows, error: clienteByEmailError }] =
        await Promise.all([
          email
            ? supabaseAdmin
                .from("clientes_auth")
                .select("id, id_cliente")
                .eq("id_salao", idSalao)
                .eq("email", email)
                .limit(1)
            : Promise.resolve({ data: [], error: null }),
          email
            ? supabaseAdmin
                .from("clientes")
                .select("id, nome, email, telefone, whatsapp")
                .eq("id_salao", idSalao)
                .eq("email", email)
                .limit(1)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (authByEmailError || clienteByEmailError) {
        return {
          ok: false as const,
          error: "Nao foi possivel validar sua ficha neste salao agora.",
        };
      }

      let idCliente = String(authByEmailRows?.[0]?.id_cliente || "").trim();

      if (!idCliente && clientesByEmailRows?.[0]?.id) {
        idCliente = String(clientesByEmailRows[0].id);
      }

      if (!idCliente && telefone) {
        const { data: clienteByPhoneRows, error: clienteByPhoneError } =
          await supabaseAdmin
            .from("clientes")
            .select("id")
            .eq("id_salao", idSalao)
            .or(`telefone.eq.${telefone},whatsapp.eq.${telefone}`)
            .limit(1);

        if (clienteByPhoneError) {
          return {
            ok: false as const,
            error: "Nao foi possivel validar seu telefone neste salao agora.",
          };
        }

        if (clienteByPhoneRows?.[0]?.id) {
          idCliente = String(clienteByPhoneRows[0].id);
        }
      }

      if (idCliente) {
        const { error: clienteUpdateError } = await supabaseAdmin
          .from("clientes")
          .update({
            nome: account.nome,
            email,
            telefone: telefone || null,
            whatsapp: telefone || null,
            status: "ativo",
            ativo: "ativo",
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", idCliente)
          .eq("id_salao", idSalao);

        if (clienteUpdateError) {
          return {
            ok: false as const,
            error: "Nao foi possivel atualizar seu cadastro neste salao.",
          };
        }
      } else {
        const { data: createdCliente, error: insertClienteError } =
          await supabaseAdmin
            .from("clientes")
            .insert({
              id_salao: idSalao,
              nome: account.nome,
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
            ok: false as const,
            error: "Nao foi possivel criar sua ficha de cliente neste salao.",
          };
        }

        idCliente = String(createdCliente.id);
      }

      const authByEmail = authByEmailRows?.[0];
      if (authByEmail?.id) {
        const { error: authUpdateError } = await supabaseAdmin
          .from("clientes_auth")
          .update({
            id_cliente: idCliente,
            app_conta_id: idConta,
            email,
            senha_hash: account.senha_hash,
            app_ativo: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", authByEmail.id);

        if (authUpdateError) {
          return {
            ok: false as const,
            error: "Nao foi possivel ativar seu acesso neste salao.",
          };
        }
      } else {
        const { error: authInsertError } = await supabaseAdmin
          .from("clientes_auth")
          .insert({
            id_salao: idSalao,
            id_cliente: idCliente,
            app_conta_id: idConta,
            email,
            senha_hash: account.senha_hash,
            app_ativo: true,
          });

        if (authInsertError) {
          return {
            ok: false as const,
            error: "Nao foi possivel ativar seu acesso neste salao.",
          };
        }
      }

      return {
        ok: true as const,
        idCliente,
      };
    },
  });
}

export async function createClienteAppAccount(params: {
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

  return runAdminOperation({
    action: "cliente_app_signup_global",
    actorId: email,
    run: async (supabaseAdmin): Promise<ClienteLoginResult> => {
      const existing = await findGlobalAccountByEmail(supabaseAdmin, email);
      if (existing?.id) {
        return {
          ok: false,
          error: "Ja existe uma conta global com este e-mail.",
        };
      }

      const senhaHash = await hashClientePassword(senha);
      const { data, error } = await (supabaseAdmin as any)
        .from("clientes_app_auth")
        .insert({
          nome,
          email,
          telefone: telefone || null,
          senha_hash: senhaHash,
          ativo: true,
        })
        .select("id, nome, email, telefone")
        .maybeSingle();

      if (error || !(data as { id?: string } | null)?.id) {
        return {
          ok: false,
          error: "Nao foi possivel criar sua conta global agora.",
        };
      }

      return {
        ok: true,
        session: buildSessionFromAccount(
          data as Pick<ClienteAppAccountRow, "id" | "nome" | "email" | "telefone">
        ),
      };
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
      const globalAccount = await findGlobalAccountByEmail(supabaseAdmin, email);

      if (globalAccount?.id && globalAccount.senha_hash) {
        const senhaOk = await verifyClientePassword(
          senha,
          globalAccount.senha_hash
        );

        if (senhaOk && globalAccount.ativo !== false) {
          await (supabaseAdmin as any)
            .from("clientes_app_auth")
            .update({ ultimo_login_em: new Date().toISOString() })
            .eq("id", globalAccount.id);

          return {
            ok: true,
            session: buildSessionFromAccount(globalAccount),
          };
        }
      }

      let query = supabaseAdmin
        .from("clientes_auth")
        .select("id, id_cliente, id_salao, email, senha_hash, app_ativo")
        .eq("email", email)
        .eq("app_ativo", true)
        .limit(idSalao ? 1 : 5);

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
              "Sua conta antiga ainda aparece em mais de um salao. Entre pela pagina do salao desejado para concluir a migracao.",
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

      const { data: cliente } = await supabaseAdmin
        .from("clientes")
        .select("nome, email, telefone, whatsapp")
        .eq("id", acesso.id_cliente)
        .eq("id_salao", acesso.id_salao)
        .limit(1)
        .maybeSingle();

      const contaGlobal =
        globalAccount?.id
          ? globalAccount
          : await createGlobalAccountFromLegacy({
              supabaseAdmin,
              email,
              legacyHash: acesso.senha_hash,
              nome: cliente?.nome,
              telefone: cliente?.telefone || cliente?.whatsapp,
            });

      if (!contaGlobal?.id) {
        return {
          ok: false,
          error: "Nao foi possivel concluir a migracao da sua conta agora.",
        };
      }

      await Promise.all([
        supabaseAdmin
          .from("clientes_auth")
          .update({
            app_conta_id: contaGlobal.id,
            email,
            senha_hash: contaGlobal.senha_hash,
            ultimo_login_em: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", acesso.id),
        (supabaseAdmin as any)
          .from("clientes_app_auth")
          .update({
            senha_hash: acesso.senha_hash,
            ultimo_login_em: new Date().toISOString(),
            nome:
              String(contaGlobal.nome || cliente?.nome || "").trim() ||
              "Cliente SalaoPremium",
            telefone:
              String(
                contaGlobal.telefone || cliente?.telefone || cliente?.whatsapp || ""
              ).trim() || null,
          })
          .eq("id", contaGlobal.id),
      ]);

      return {
        ok: true,
        session: buildSessionFromAccount({
          ...contaGlobal,
          nome:
            String(contaGlobal.nome || cliente?.nome || "").trim() ||
            "Cliente SalaoPremium",
          telefone:
            String(
              contaGlobal.telefone || cliente?.telefone || cliente?.whatsapp || ""
            ).trim() || null,
        }),
      };
    },
  });
}
