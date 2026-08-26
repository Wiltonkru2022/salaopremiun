import crypto from "node:crypto";
import { runAdminOperation } from "@/lib/db/admin-ops";
import {
  hashClientePassword,
  verifyClientePassword,
  type ClienteAppSession,
} from "@/lib/cliente-auth.server";
import { canSalonAppearInClientApp, listEligibleSalonIdsByEmail } from "@/lib/client-app/eligibility";
import {
  findClienteRowsByCpf,
  findClienteRowsByNormalizedPhone,
  getClienteAppPublicEmail,
  normalizeClienteAppEmail,
  normalizeClienteAppPhone,
  syncClienteAppLinksByIdentity,
} from "@/app/services/cliente-app/linking";
import {
  isValidCpf,
  normalizeClienteEmail,
  normalizeCpf,
  normalizeWhatsapp,
  parseClienteBirthDate,
} from "@/lib/client-app/identity";
import { getSecurityAccessDecision, getSecurityStatusMessage } from "@/lib/security/user-security";
import { recordSecurityLoginFailure } from "@/lib/security/login-attempts";
import { emitSecurityEvent } from "@/lib/security/security-events";

type ClienteLoginResult =
  | { ok: true; session: ClienteAppSession; migrationRequired?: boolean }
  | { ok: false; error: string; redirectTo?: string };

type ClienteAppAccountRow = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  senha_hash: string | null;
  auth_version: number | null;
  migracao_identidade_concluida: boolean | null;
  ativo: boolean | null;
};

const GENERIC_LOGIN_ERROR = "Não foi possível validar os dados informados.";

function fingerprintIdentity(value: string) {
  const secret =
    process.env.CLIENT_APP_IDENTITY_HASH_SECRET ||
    process.env.CLIENTE_SESSION_SECRET ||
    process.env.PROFISSIONAL_SESSION_SECRET ||
    "salaopremium-identity";
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function buildSessionFromAccount(account: ClienteAppAccountRow): ClienteAppSession {
  const whatsapp = normalizeWhatsapp(account.whatsapp || account.telefone);
  return {
    idConta: String(account.id),
    nome: String(account.nome || "").trim() || "Cliente SalãoPremium",
    email: getClienteAppPublicEmail(account.email),
    whatsapp: whatsapp || null,
    telefone: whatsapp || null,
    authVersion: Number(account.auth_version || 1),
    tipo: "cliente",
  };
}

async function findGlobalAccountByCpf(databaseAdmin: any, cpfInput: string) {
  const cpf = normalizeCpf(cpfInput);
  if (!cpf) return null;
  const { data, error } = await databaseAdmin
    .from("clientes_app_auth")
    .select(
      "id, nome, email, telefone, whatsapp, cpf, data_nascimento, senha_hash, auth_version, migracao_identidade_concluida, ativo"
    )
    .eq("cpf", cpf)
    .limit(1)
    .maybeSingle();
  if (error || !data?.id) return null;
  return data as ClienteAppAccountRow;
}

async function findGlobalAccountByEmail(databaseAdmin: any, emailInput: string) {
  const email = normalizeClienteAppEmail(emailInput);
  if (!email) return null;
  const { data, error } = await databaseAdmin
    .from("clientes_app_auth")
    .select(
      "id, nome, email, telefone, whatsapp, cpf, data_nascimento, senha_hash, auth_version, migracao_identidade_concluida, ativo"
    )
    .eq("email", email)
    .limit(1)
    .maybeSingle();
  if (error || !data?.id) return null;
  return data as ClienteAppAccountRow;
}

async function findGlobalAccountByPhone(databaseAdmin: any, phoneInput: string) {
  const phone = normalizeClienteAppPhone(phoneInput);
  if (!phone) return null;
  const { data, error } = await databaseAdmin
    .from("clientes_app_auth")
    .select(
      "id, nome, email, telefone, whatsapp, cpf, data_nascimento, senha_hash, auth_version, migracao_identidade_concluida, ativo"
    )
    .or(`whatsapp.eq.${phone},telefone.eq.${phone}`)
    .limit(2);
  if (error || !data?.length || data.length !== 1) return null;
  return data[0] as ClienteAppAccountRow;
}

async function assertClienteSecurityAccess(params: { userId: string; idSalao?: string | null }) {
  const decision = await getSecurityAccessDecision({
    tipoUsuario: "cliente",
    userId: params.userId,
    idSalao: String(params.idSalao || "").trim() || undefined,
  });
  if (decision.allowed) return null;
  return {
    error: getSecurityStatusMessage({
      status: decision.status,
      motivo: decision.motivo,
      bloqueadoAte: decision.bloqueadoAte,
    }),
    redirectTo: decision.redirectPath || undefined,
  };
}

async function recordCpfLoginFailure(params: {
  cpf: string;
  userId?: string | null;
  idSalao?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  return recordSecurityLoginFailure({
    evento: "cliente_app_login_falha",
    tipoUsuario: "cliente",
    userId: params.userId || null,
    idSalao: params.idSalao || null,
    identidade: `cpf:${fingerprintIdentity(params.cpf)}`,
    ip: params.ip || null,
    userAgent: params.userAgent || null,
    origem: "cliente-app",
    detalhes: { identidade_tipo: "cpf" },
  });
}

export async function createClienteAppAccount(params: {
  nome: string;
  cpf: string;
  dataNascimento: string;
  whatsapp: string;
  email?: string | null;
}): Promise<ClienteLoginResult> {
  const nome = String(params.nome || "").trim().replace(/\s+/g, " ");
  const cpf = normalizeCpf(params.cpf);
  const dataNascimento = parseClienteBirthDate(params.dataNascimento);
  const whatsapp = normalizeWhatsapp(params.whatsapp);
  const rawEmail = String(params.email || "").trim();
  const email = normalizeClienteEmail(rawEmail);

  if (nome.split(" ").filter(Boolean).length < 2) return { ok: false, error: "Informe seu nome completo." };
  if (!isValidCpf(cpf)) return { ok: false, error: "Informe um CPF válido." };
  if (!dataNascimento) return { ok: false, error: "Informe uma data de nascimento válida." };
  if (whatsapp.length < 10 || whatsapp.length > 13) return { ok: false, error: "Informe um WhatsApp válido." };
  if (rawEmail && !email) return { ok: false, error: "Informe um e-mail válido ou deixe o campo vazio." };

  return runAdminOperation({
    action: "cliente_app_signup_cpf",
    actorId: `cpf:${fingerprintIdentity(cpf)}`,
    run: async (databaseAdmin): Promise<ClienteLoginResult> => {
      const existingCpf = await findGlobalAccountByCpf(databaseAdmin, cpf);
      if (existingCpf?.id) {
        return { ok: false, error: "Já existe uma conta com estes dados. Use Recuperar acesso." };
      }

      if (email) {
        const existingEmail = await findGlobalAccountByEmail(databaseAdmin, email);
        if (existingEmail?.id) {
          return { ok: false, error: "Este e-mail já está vinculado a uma conta. Use Recuperar acesso." };
        }
      }

      const { data, error } = await databaseAdmin
        .from("clientes_app_auth")
        .insert({
          nome,
          cpf,
          data_nascimento: dataNascimento,
          whatsapp,
          telefone: whatsapp,
          email: email || null,
          senha_hash: null,
          auth_version: 1,
          migracao_identidade_concluida: true,
          ativo: true,
        })
        .select(
          "id, nome, email, telefone, whatsapp, cpf, data_nascimento, senha_hash, auth_version, migracao_identidade_concluida, ativo"
        )
        .maybeSingle();

      if (error || !data?.id) return { ok: false, error: "Não foi possível criar sua conta do app agora." };

      await syncClienteAppLinksByIdentity({ idConta: String(data.id) });
      void emitSecurityEvent({
        evento: "cliente_app_cadastro_sucesso",
        tipoUsuario: "cliente",
        userId: String(data.id),
        origem: "cliente-app",
        detalhes: { cpf_final: cpf.slice(-4), possui_email: Boolean(email) },
      });

      return { ok: true, session: buildSessionFromAccount(data as ClienteAppAccountRow) };
    },
  });
}

export async function loginClienteAppByCpfNascimento(params: {
  cpf: string;
  dataNascimento: string;
  idSalao?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<ClienteLoginResult> {
  const cpf = normalizeCpf(params.cpf);
  const dataNascimento = parseClienteBirthDate(params.dataNascimento);
  const idSalao = String(params.idSalao || "").trim() || null;

  if (!isValidCpf(cpf) || !dataNascimento) return { ok: false, error: GENERIC_LOGIN_ERROR };

  return runAdminOperation({
    action: "cliente_app_login_cpf",
    actorId: `cpf:${fingerprintIdentity(cpf)}`,
    idSalao,
    run: async (databaseAdmin): Promise<ClienteLoginResult> => {
      const account = await findGlobalAccountByCpf(databaseAdmin, cpf);
      if (!account?.id || account.ativo === false || String(account.data_nascimento || "") !== dataNascimento) {
        const failure = await recordCpfLoginFailure({
          cpf,
          userId: account?.id || null,
          idSalao,
          ip: params.ip,
          userAgent: params.userAgent,
        });
        if (failure.blocked && failure.redirectTo) {
          return { ok: false, error: GENERIC_LOGIN_ERROR, redirectTo: failure.redirectTo };
        }
        return { ok: false, error: GENERIC_LOGIN_ERROR };
      }

      const securityAccess = await assertClienteSecurityAccess({ userId: account.id, idSalao });
      if (securityAccess) return { ok: false, error: securityAccess.error, redirectTo: securityAccess.redirectTo };

      await databaseAdmin
        .from("clientes_app_auth")
        .update({
          ultimo_login_em: new Date().toISOString(),
          migracao_identidade_concluida: true,
        })
        .eq("id", account.id);

      await syncClienteAppLinksByIdentity({ idConta: account.id });
      void emitSecurityEvent({
        evento: "cliente_app_login_sucesso",
        tipoUsuario: "cliente",
        userId: account.id,
        idSalao,
        origem: "cliente-app",
        ip: params.ip || null,
        userAgent: params.userAgent || null,
        detalhes: { identidade_tipo: "cpf", cpf_final: cpf.slice(-4) },
      });

      return { ok: true, session: buildSessionFromAccount(account) };
    },
  });
}

async function createGlobalAccountFromLegacy(params: {
  databaseAdmin: any;
  email: string;
  legacyHash: string;
  nome?: string | null;
  telefone?: string | null;
}) {
  const whatsapp = normalizeWhatsapp(params.telefone);
  const { data, error } = await params.databaseAdmin
    .from("clientes_app_auth")
    .insert({
      nome: String(params.nome || "").trim() || "Cliente SalãoPremium",
      email: normalizeClienteEmail(params.email) || null,
      telefone: whatsapp || null,
      whatsapp: whatsapp || null,
      senha_hash: params.legacyHash,
      auth_version: 1,
      migracao_identidade_concluida: false,
      ativo: true,
      ultimo_login_em: new Date().toISOString(),
    })
    .select(
      "id, nome, email, telefone, whatsapp, cpf, data_nascimento, senha_hash, auth_version, migracao_identidade_concluida, ativo"
    )
    .maybeSingle();
  if (error || !data?.id) return null;
  return data as ClienteAppAccountRow;
}

export async function loginClienteAppByEmailSenha(params: {
  email: string;
  senha: string;
  idSalao?: string | null;
}): Promise<ClienteLoginResult> {
  const identity = String(params.email || "").trim();
  const phone = normalizeClienteAppPhone(identity);
  const email = identity.includes("@") ? normalizeClienteAppEmail(identity) : "";
  const senha = String(params.senha || "").trim();
  const idSalao = String(params.idSalao || "").trim() || null;

  if ((!email && !phone) || !senha) return { ok: false, error: "Informe telefone/e-mail e senha." };

  return runAdminOperation({
    action: "cliente_app_login_legado",
    actorId: email || `telefone:${fingerprintIdentity(phone)}`,
    idSalao,
    run: async (databaseAdmin): Promise<ClienteLoginResult> => {
      const globalAccount = email
        ? await findGlobalAccountByEmail(databaseAdmin, email)
        : await findGlobalAccountByPhone(databaseAdmin, phone);

      if (globalAccount?.id && globalAccount.senha_hash) {
        const passwordOk = await verifyClientePassword(senha, globalAccount.senha_hash);
        if (passwordOk && globalAccount.ativo !== false) {
          const securityAccess = await assertClienteSecurityAccess({ userId: globalAccount.id, idSalao });
          if (securityAccess) return { ok: false, error: securityAccess.error, redirectTo: securityAccess.redirectTo };

          await databaseAdmin
            .from("clientes_app_auth")
            .update({ ultimo_login_em: new Date().toISOString() })
            .eq("id", globalAccount.id);
          await syncClienteAppLinksByIdentity({ idConta: globalAccount.id });
          return {
            ok: true,
            session: buildSessionFromAccount(globalAccount),
            migrationRequired: !globalAccount.cpf || !globalAccount.data_nascimento,
          };
        }
      }

      if (!email) return { ok: false, error: "Acesso antigo não reconhecido." };

      let query = databaseAdmin
        .from("clientes_auth")
        .select("id, id_cliente, id_salao, email, senha_hash, app_ativo")
        .eq("email", email)
        .eq("app_ativo", true)
        .limit(idSalao ? 1 : 5);
      if (idSalao) query = query.eq("id_salao", idSalao);
      const { data: authRows, error } = await query;
      if (error || !authRows?.length) return { ok: false, error: "Acesso antigo não reconhecido." };

      if (!idSalao && authRows.length > 1) {
        const eligibleSalonIds = await listEligibleSalonIdsByEmail(email);
        if (eligibleSalonIds.length > 1) {
          return { ok: false, error: "Entre pelo salão em que sua conta antiga foi criada para atualizar o acesso." };
        }
      }

      const acesso = authRows[0];
      if (!acesso?.senha_hash || !(await verifyClientePassword(senha, acesso.senha_hash))) {
        return { ok: false, error: "Acesso antigo não reconhecido." };
      }

      const { data: cliente } = await databaseAdmin
        .from("clientes")
        .select("nome, email, telefone, whatsapp")
        .eq("id", acesso.id_cliente)
        .eq("id_salao", acesso.id_salao)
        .limit(1)
        .maybeSingle();

      const conta = globalAccount?.id
        ? globalAccount
        : await createGlobalAccountFromLegacy({
            databaseAdmin,
            email,
            legacyHash: acesso.senha_hash,
            nome: cliente?.nome,
            telefone: cliente?.whatsapp || cliente?.telefone,
          });
      if (!conta?.id) return { ok: false, error: "Não foi possível atualizar seu acesso antigo agora." };

      await databaseAdmin
        .from("clientes_auth")
        .update({ app_conta_id: conta.id, updated_at: new Date().toISOString() })
        .eq("id", acesso.id);
      return { ok: true, session: buildSessionFromAccount(conta), migrationRequired: true };
    },
  });
}

export async function ensureClienteContaVinculadaAoSalao(params: {
  idConta: string;
  idSalao: string;
}) {
  const idConta = String(params.idConta || "").trim();
  const idSalao = String(params.idSalao || "").trim();
  if (!idConta || !idSalao) return { ok: false as const, error: "Não foi possível identificar a conta para este salão." };

  const eligibility = await canSalonAppearInClientApp(idSalao);
  if (!eligibility.allowed) return { ok: false as const, error: "Este salão não está publicado no app cliente agora." };

  return runAdminOperation({
    action: "cliente_app_ensure_salon_link",
    actorId: idConta,
    idSalao,
    run: async (databaseAdmin) => {
      const { data: accountRow, error: accountError } = await databaseAdmin
        .from("clientes_app_auth")
        .select(
          "id, nome, email, telefone, whatsapp, cpf, data_nascimento, senha_hash, auth_version, migracao_identidade_concluida, ativo"
        )
        .eq("id", idConta)
        .limit(1)
        .maybeSingle();
      if (accountError || !accountRow?.id || accountRow.ativo === false) {
        return { ok: false as const, error: "Sua conta global de cliente não está disponível agora." };
      }
      const account = accountRow as ClienteAppAccountRow;

      const { data: linkedRows, error: linkedError } = await databaseAdmin
        .from("clientes_auth")
        .select("id, id_cliente")
        .eq("id_salao", idSalao)
        .eq("app_conta_id", idConta)
        .eq("app_ativo", true)
        .limit(1);
      if (linkedError) return { ok: false as const, error: "Não foi possível validar seu acesso ao salão agora." };
      if (linkedRows?.[0]?.id_cliente) return { ok: true as const, idCliente: String(linkedRows[0].id_cliente) };

      let idCliente = "";
      const cpf = normalizeCpf(account.cpf);
      if (cpf) {
        const byCpf = await findClienteRowsByCpf({ databaseAdmin, cpf, idSalao, limit: 2 });
        if (byCpf.error) return { ok: false as const, error: "Não foi possível validar sua identidade neste salão." };
        if (byCpf.data.length > 1) return { ok: false as const, error: "Encontramos cadastros duplicados com este CPF. O salão precisa revisar a ficha." };
        idCliente = String(byCpf.data[0]?.id || "");
      }

      if (!idCliente && !cpf) {
        const phone = normalizeClienteAppPhone(account.whatsapp || account.telefone);
        if (phone) {
          const byPhone = await findClienteRowsByNormalizedPhone({ databaseAdmin, telefone: phone, idSalao, limit: 3 });
          if (!byPhone.error && byPhone.data.length === 1) idCliente = String(byPhone.data[0].id || "");
        }
      }

      const email = getClienteAppPublicEmail(account.email);
      if (!idCliente && !cpf && email) {
        const { data: byEmail } = await databaseAdmin
          .from("clientes")
          .select("id")
          .eq("id_salao", idSalao)
          .eq("email", email)
          .limit(2);
        if (byEmail?.length === 1) idCliente = String(byEmail[0].id || "");
      }

      const whatsapp = normalizeWhatsapp(account.whatsapp || account.telefone);
      let createdNew = false;
      if (!idCliente) {
        const { data: created, error: createError } = await databaseAdmin
          .from("clientes")
          .insert({
            id_salao: idSalao,
            nome: account.nome,
            email: email || null,
            telefone: whatsapp || null,
            whatsapp: whatsapp || null,
            cpf: cpf || null,
            data_nascimento: account.data_nascimento || null,
            status: "ativo",
            ativo: "ativo",
          })
          .select("id")
          .maybeSingle();
        if (createError || !created?.id) return { ok: false as const, error: "Não foi possível criar sua ficha de cliente neste salão." };
        idCliente = String(created.id);
        createdNew = true;
      } else {
        const updateResult = await databaseAdmin
          .from("clientes")
          .update({
            nome: account.nome,
            email: email || null,
            telefone: whatsapp || null,
            whatsapp: whatsapp || null,
            cpf: cpf || null,
            data_nascimento: account.data_nascimento || null,
            status: "ativo",
            ativo: "ativo",
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", idCliente)
          .eq("id_salao", idSalao);
        if (updateResult.error) return { ok: false as const, error: "Não foi possível atualizar seu cadastro neste salão." };
      }

      const { data: authByClient } = await databaseAdmin
        .from("clientes_auth")
        .select("id")
        .eq("id_salao", idSalao)
        .eq("id_cliente", idCliente)
        .limit(1);

      const authPayload = {
        id_cliente: idCliente,
        app_conta_id: idConta,
        email: email || null,
        senha_hash: account.senha_hash || null,
        app_ativo: true,
        updated_at: new Date().toISOString(),
      };

      const authResult = authByClient?.[0]?.id
        ? await databaseAdmin.from("clientes_auth").update(authPayload).eq("id", authByClient[0].id)
        : await databaseAdmin.from("clientes_auth").insert({ id_salao: idSalao, ...authPayload });

      if (authResult.error) {
        if (createdNew) await databaseAdmin.from("clientes").delete().eq("id", idCliente).eq("id_salao", idSalao);
        return { ok: false as const, error: "Não foi possível ativar seu acesso neste salão." };
      }

      return { ok: true as const, idCliente };
    },
  });
}

// Export temporário utilizado por rotinas legadas que ainda precisam criar hash.
export { hashClientePassword };
