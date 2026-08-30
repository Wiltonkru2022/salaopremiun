import crypto from "node:crypto";
import { runAdminOperation } from "@/lib/db/admin-ops";
import {
  hashClientePassword,
  verifyClientePassword,
  type ClienteAppSession,
} from "@/lib/cliente-auth.server";
import {
  canSalonAppearInClientApp,
  listEligibleSalonIdsByEmail,
} from "@/lib/client-app/eligibility";
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
import {
  getSecurityAccessDecision,
  getSecurityStatusMessage,
} from "@/lib/security/user-security";
import { recordSecurityLoginFailure } from "@/lib/security/login-attempts";
import { emitSecurityEvent } from "@/lib/security/security-events";

type ClienteLoginResult =
  | {
      ok: true;
      session: ClienteAppSession;
      migrationRequired?: boolean;
    }
  | {
      ok: false;
      error: string;
      redirectTo?: string;
    };

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

const GENERIC_LOGIN_ERROR =
  "Não foi possível validar os dados informados.";

function debugClienteLogin(
  label: string,
  payload: Record<string, unknown>
) {
  if (process.env.NODE_ENV !== "development") return;

  console.log(`[CLIENTE_APP_LOGIN_DEBUG:${label}]`, payload);
}

function formatCpfForLegacyStorage(value: string) {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11) return cpf;

  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(
    6,
    9
  )}-${cpf.slice(9)}`;
}

function normalizeStoredBirthDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  /*
   * O driver PostgreSQL/Neon pode devolver colunas date/timestamp como
   * objeto Date do JavaScript. Quando fazemos String(date), o resultado
   * vira algo como:
   *
   *   Fri Jan 24 1997 02:00:00 GMT+0000 ...
   *
   * e o parser DD/MM/AAAA | YYYY-MM-DD não reconhece isso.
   *
   * JSON.stringify/NextResponse mascara o problema porque Date.toJSON()
   * vira "1997-01-24T02:00:00.000Z".
   */
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  if (!raw) return "";

  const isoPrefix = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefix) return isoPrefix[1];

  /*
   * Compatibilidade adicional para valores serializados como datas JS.
   */
  const parsedNativeDate = new Date(raw);
  if (!Number.isNaN(parsedNativeDate.getTime())) {
    return parsedNativeDate.toISOString().slice(0, 10);
  }

  return parseClienteBirthDate(raw) || "";
}

function fingerprintIdentity(value: string) {
  const secret =
    process.env.CLIENT_APP_IDENTITY_HASH_SECRET ||
    process.env.CLIENTE_SESSION_SECRET ||
    process.env.PROFISSIONAL_SESSION_SECRET ||
    "salaopremium-identity";

  return crypto
    .createHmac("sha256", secret)
    .update(value)
    .digest("hex");
}

function buildSessionFromAccount(
  account: ClienteAppAccountRow
): ClienteAppSession {
  const whatsapp = normalizeWhatsapp(
    account.whatsapp || account.telefone
  );

  return {
    idConta: String(account.id),
    nome:
      String(account.nome || "").trim() ||
      "Cliente SalãoPremium",
    email: getClienteAppPublicEmail(account.email),
    whatsapp: whatsapp || null,
    telefone: whatsapp || null,
    authVersion: Number(account.auth_version || 1),
    tipo: "cliente",
  };
}

async function findGlobalAccountByCpf(
  databaseAdmin: any,
  cpfInput: string
) {
  const cpf = normalizeCpf(cpfInput);
  if (!cpf) return null;

  const selectFields =
    "id, nome, email, telefone, whatsapp, cpf, data_nascimento, senha_hash, auth_version, migracao_identidade_concluida, ativo";

  /*
   * Evita maybeSingle() nesta busca.
   *
   * A camada Neon compatível com Supabase pode tratar single/maybeSingle
   * de forma diferente em algumas rotas. Como precisamos apenas localizar
   * uma conta por CPF, buscamos até 2 linhas e validamos o array.
   */
  const exact = await databaseAdmin
    .from("clientes_app_auth")
    .select(selectFields)
    .eq("cpf", cpf)
    .limit(2);

  if (!exact.error && Array.isArray(exact.data) && exact.data.length === 1) {
    return exact.data[0] as ClienteAppAccountRow;
  }

  if (!exact.error && Array.isArray(exact.data) && exact.data.length > 1) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[CLIENTE_APP_LOGIN] CPF duplicado em clientes_app_auth", {
        cpfFinal: cpf.slice(-4),
        count: exact.data.length,
      });
    }
    return null;
  }

  // Compatibilidade com dados antigos importados com máscara de CPF.
  const legacyCpf = formatCpfForLegacyStorage(cpf);
  if (!legacyCpf || legacyCpf === cpf) return null;

  const legacy = await databaseAdmin
    .from("clientes_app_auth")
    .select(selectFields)
    .eq("cpf", legacyCpf)
    .limit(2);

  if (
    legacy.error ||
    !Array.isArray(legacy.data) ||
    legacy.data.length !== 1
  ) {
    return null;
  }

  return legacy.data[0] as ClienteAppAccountRow;
}
async function findGlobalAccountByEmail(
  databaseAdmin: any,
  emailInput: string
) {
  const email =
    normalizeClienteAppEmail(emailInput);

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

async function findGlobalAccountByPhone(
  databaseAdmin: any,
  phoneInput: string
) {
  const phone =
    normalizeClienteAppPhone(phoneInput);

  if (!phone) return null;

  const { data, error } = await databaseAdmin
    .from("clientes_app_auth")
    .select(
      "id, nome, email, telefone, whatsapp, cpf, data_nascimento, senha_hash, auth_version, migracao_identidade_concluida, ativo"
    )
    .or(
      `whatsapp.eq.${phone},telefone.eq.${phone}`
    )
    .limit(2);

  if (
    error ||
    !data?.length ||
    data.length !== 1
  ) {
    return null;
  }

  return data[0] as ClienteAppAccountRow;
}

async function assertClienteSecurityAccess(
  params: {
    userId: string;
    idSalao?: string | null;
  }
) {
  const decision =
    await getSecurityAccessDecision({
      tipoUsuario: "cliente",
      userId: params.userId,
      idSalao:
        String(
          params.idSalao || ""
        ).trim() || undefined,
    });

  debugClienteLogin("SECURITY_DECISION", {
    userId: params.userId,
    allowed: decision.allowed,
    status: decision.status,
    motivo: decision.motivo || null,
    bloqueadoAte:
      decision.bloqueadoAte || null,
  });

  if (decision.allowed) return null;

  return {
    error: getSecurityStatusMessage({
      status: decision.status,
      motivo: decision.motivo,
      bloqueadoAte:
        decision.bloqueadoAte,
    }),
    redirectTo:
      decision.redirectPath || undefined,
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
    identidade: `cpf:${fingerprintIdentity(
      params.cpf
    )}`,
    ip: params.ip || null,
    userAgent:
      params.userAgent || null,
    origem: "cliente-app",
    detalhes: {
      identidade_tipo: "cpf",
    },
  });
}

export async function createClienteAppAccount(
  params: {
    nome: string;
    cpf: string;
    dataNascimento: string;
    whatsapp: string;
    email?: string | null;
  }
): Promise<ClienteLoginResult> {
  const nome = String(
    params.nome || ""
  )
    .trim()
    .replace(/\s+/g, " ");

  const cpf = normalizeCpf(params.cpf);
  const dataNascimento =
    parseClienteBirthDate(
      params.dataNascimento
    );
  const whatsapp = normalizeWhatsapp(
    params.whatsapp
  );
  const rawEmail = String(
    params.email || ""
  ).trim();
  const email =
    normalizeClienteEmail(rawEmail);

  if (
    nome.split(" ").filter(Boolean)
      .length < 2
  ) {
    return {
      ok: false,
      error:
        "Informe seu nome completo.",
    };
  }

  if (!isValidCpf(cpf)) {
    return {
      ok: false,
      error: "Informe um CPF válido.",
    };
  }

  if (!dataNascimento) {
    return {
      ok: false,
      error:
        "Informe uma data de nascimento válida.",
    };
  }

  if (
    whatsapp.length < 10 ||
    whatsapp.length > 13
  ) {
    return {
      ok: false,
      error:
        "Informe um WhatsApp válido.",
    };
  }

  if (rawEmail && !email) {
    return {
      ok: false,
      error:
        "Informe um e-mail válido ou deixe o campo vazio.",
    };
  }

  return runAdminOperation({
    action: "cliente_app_signup_cpf",
    actorId: `cpf:${fingerprintIdentity(
      cpf
    )}`,
    run: async (
      databaseAdmin
    ): Promise<ClienteLoginResult> => {
      const existingCpf =
        await findGlobalAccountByCpf(
          databaseAdmin,
          cpf
        );

      if (existingCpf?.id) {
        return {
          ok: false,
          error:
            "Já existe uma conta com estes dados. Use Recuperar acesso.",
        };
      }

      if (email) {
        const existingEmail =
          await findGlobalAccountByEmail(
            databaseAdmin,
            email
          );

        if (existingEmail?.id) {
          return {
            ok: false,
            error:
              "Este e-mail já está vinculado a uma conta. Use Recuperar acesso.",
          };
        }
      }

      const { data, error } =
        await databaseAdmin
          .from(
            "clientes_app_auth"
          )
          .insert({
            nome,
            cpf,
            data_nascimento:
              dataNascimento,
            whatsapp,
            telefone: whatsapp,
            email: email || null,
            senha_hash: null,
            auth_version: 1,
            migracao_identidade_concluida:
              true,
            ativo: true,
          })
          .select(
            "id, nome, email, telefone, whatsapp, cpf, data_nascimento, senha_hash, auth_version, migracao_identidade_concluida, ativo"
          )
          .maybeSingle();

      if (error || !data?.id) {
        return {
          ok: false,
          error:
            "Não foi possível criar sua conta do app agora.",
        };
      }

      await syncClienteAppLinksByIdentity({
        idConta: String(data.id),
      });

      void emitSecurityEvent({
        evento:
          "cliente_app_cadastro_sucesso",
        tipoUsuario: "cliente",
        userId: String(data.id),
        origem: "cliente-app",
        detalhes: {
          cpf_final: cpf.slice(-4),
          possui_email:
            Boolean(email),
        },
      });

      return {
        ok: true,
        session:
          buildSessionFromAccount(
            data as ClienteAppAccountRow
          ),
      };
    },
  });
}

export async function loginClienteAppByCpfNascimento(
  params: {
    cpf: string;
    dataNascimento: string;
    idSalao?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  }
): Promise<ClienteLoginResult> {
  const cpf = normalizeCpf(params.cpf);
  const dataNascimento =
    parseClienteBirthDate(
      params.dataNascimento
    );
  const idSalao =
    String(
      params.idSalao || ""
    ).trim() || null;

  debugClienteLogin("INPUT", {
    cpfFinal: cpf.slice(-4),
    cpfLength: cpf.length,
    cpfValid: isValidCpf(cpf),
    rawBirthDate:
      params.dataNascimento,
    parsedBirthDate:
      dataNascimento,
    idSalao,
  });

  if (
    !isValidCpf(cpf) ||
    !dataNascimento
  ) {
    debugClienteLogin(
      "INPUT_REJECTED",
      {
        cpfFinal:
          cpf.slice(-4),
        cpfValid:
          isValidCpf(cpf),
        parsedBirthDate:
          dataNascimento,
      }
    );

    return {
      ok: false,
      error: GENERIC_LOGIN_ERROR,
    };
  }

  return runAdminOperation({
    action: "cliente_app_login_cpf",
    actorId: `cpf:${fingerprintIdentity(
      cpf
    )}`,
    idSalao,
    run: async (
      databaseAdmin
    ): Promise<ClienteLoginResult> => {
      const account =
        await findGlobalAccountByCpf(
          databaseAdmin,
          cpf
        );

      let storedBirthDate =
        account?.data_nascimento || null;

      let storedAuthVersion =
        Number(account?.auth_version || 0);

      /*
       * Fallback para compatibilidade com a camada Neon.
       *
       * Já confirmamos que a consulta principal consegue localizar a conta,
       * mas alguns campos selecionados podem chegar vazios. Isso afetava
       * data_nascimento e também pode afetar auth_version.
       *
       * Se auth_version cair para 1 por engano, o login cria a sessão,
       * mas qualquer rota protegida compara com a versão real do banco
       * (por exemplo 4) e considera a sessão expirada imediatamente.
       */
      if (
        account?.id &&
        (!storedBirthDate || storedAuthVersion <= 0)
      ) {
        const accountSecurityLookup =
          await databaseAdmin
            .from("clientes_app_auth")
            .select(
              "id, data_nascimento, auth_version, ativo"
            )
            .eq("id", account.id)
            .limit(1);

        if (
          !accountSecurityLookup.error &&
          Array.isArray(
            accountSecurityLookup.data
          ) &&
          accountSecurityLookup.data.length ===
            1
        ) {
          const securityRow =
            accountSecurityLookup.data[0];

          if (!storedBirthDate) {
            storedBirthDate =
              securityRow?.data_nascimento ||
              null;
          }

          const lookedUpAuthVersion =
            Number(
              securityRow?.auth_version ||
                0
            );

          if (
            lookedUpAuthVersion > 0
          ) {
            storedAuthVersion =
              lookedUpAuthVersion;
          }

          if (
            securityRow?.ativo === false
          ) {
            account.ativo = false;
          }
        }
      }

      const normalizedStoredBirthDate =
        normalizeStoredBirthDate(
          storedBirthDate
        );

      /*
       * A camada de compatibilidade Neon está localizando a conta, mas
       * em alguns retornos omite data_nascimento. Por isso não dependemos
       * mais somente do valor retornado no SELECT.
       *
       * Se a data vier vazia, confirmamos a igualdade diretamente no banco:
       * WHERE id = conta AND data_nascimento = YYYY-MM-DD.
       * Assim o banco faz a comparação sem precisar devolver a coluna.
       */
      let birthMatches =
        normalizedStoredBirthDate ===
        dataNascimento;

      /*
       * Não fazemos comparação SQL direta de timestamp com "YYYY-MM-DD".
       * A coluna pode ser timestamp/timestamptz e o timezone faria
       * "1997-01-24T02:00:00Z" ser diferente de "1997-01-24T00:00:00Z".
       * A comparação correta para nascimento é feita pela data normalizada.
       */

      if (account?.id) {
        if (birthMatches) {
          /*
           * Mesmo que a camada não devolva a coluna, já confirmamos no
           * banco que a data solicitada é a data da conta.
           */
          account.data_nascimento =
            dataNascimento;
        } else if (storedBirthDate) {
          account.data_nascimento =
            String(storedBirthDate);
        }

        if (storedAuthVersion > 0) {
          account.auth_version =
            storedAuthVersion;
        }
      }

      debugClienteLogin(
        "ACCOUNT_VALIDATION",
        {
          found:
            Boolean(account?.id),
          accountId:
            account?.id || null,
          active:
            account?.ativo ?? null,
          requestedBirthDate:
            dataNascimento,
          storedBirthDate:
            storedBirthDate || null,
          normalizedStoredBirthDate,
          birthMatches,
          authVersion:
            account?.auth_version ??
            null,
          resolvedAuthVersion:
            storedAuthVersion || null,
          migrationCompleted:
            account?.migracao_identidade_concluida ??
            null,
        }
      );

      if (
        !account?.id ||
        account.ativo === false ||
        !birthMatches
      ) {
        if (process.env.NODE_ENV === "development") {
          const reason = !account?.id
            ? "conta_nao_encontrada"
            : account.ativo === false
              ? "conta_inativa"
              : "nascimento_diferente";

          console.warn("[CLIENTE_APP_LOGIN] validação recusada", {
            reason,
            accountId: account?.id || null,
            requestedBirthDate: dataNascimento,
            storedBirthDate: normalizedStoredBirthDate || null,
          });
        }

        const failure =
          await recordCpfLoginFailure({
            cpf,
            userId:
              account?.id || null,
            idSalao,
            ip: params.ip,
            userAgent:
              params.userAgent,
          });

        debugClienteLogin(
          "LOGIN_FAILURE_RECORDED",
          {
            accountId:
              account?.id || null,
            blocked:
              failure.blocked,
            redirectTo:
              failure.redirectTo ||
              null,
          }
        );

        if (
          failure.blocked &&
          failure.redirectTo
        ) {
          return {
            ok: false,
            error:
              GENERIC_LOGIN_ERROR,
            redirectTo:
              failure.redirectTo,
          };
        }

        const debugReason =
          !account?.id
            ? "conta_nao_encontrada"
            : account.ativo === false
              ? "conta_inativa"
              : !birthMatches
                ? `nascimento_diferente:${normalizedStoredBirthDate || "vazio"}!=${dataNascimento}`
                : "validacao_desconhecida";

        return {
          ok: false,
          error:
            process.env.NODE_ENV === "development"
              ? `DEBUG LOGIN: ${debugReason}`
              : GENERIC_LOGIN_ERROR,
        };
      }

      const securityAccess =
        await assertClienteSecurityAccess({
          userId: account.id,
          idSalao,
        });

      if (securityAccess) {
        debugClienteLogin(
          "SECURITY_REJECTED",
          {
            accountId: account.id,
            error:
              securityAccess.error,
            redirectTo:
              securityAccess.redirectTo ||
              null,
          }
        );

        return {
          ok: false,
          error:
            securityAccess.error,
          redirectTo:
            securityAccess.redirectTo,
        };
      }

      const updateResult =
        await databaseAdmin
          .from(
            "clientes_app_auth"
          )
          .update({
            ultimo_login_em:
              new Date().toISOString(),
            migracao_identidade_concluida:
              true,
          })
          .eq("id", account.id);

      debugClienteLogin(
        "LOGIN_UPDATE",
        {
          accountId: account.id,
          error:
            updateResult?.error
              ?.message ||
            updateResult?.error ||
            null,
        }
      );

      await syncClienteAppLinksByIdentity({
        idConta: account.id,
      });

      void emitSecurityEvent({
        evento:
          "cliente_app_login_sucesso",
        tipoUsuario: "cliente",
        userId: account.id,
        idSalao,
        origem: "cliente-app",
        ip: params.ip || null,
        userAgent:
          params.userAgent || null,
        detalhes: {
          identidade_tipo: "cpf",
          cpf_final:
            cpf.slice(-4),
        },
      });

      const session =
        buildSessionFromAccount(
          account
        );

      debugClienteLogin(
        "LOGIN_SUCCESS",
        {
          accountId:
            session.idConta,
          authVersion:
            session.authVersion,
        }
      );

      return {
        ok: true,
        session,
      };
    },
  });
}

async function createGlobalAccountFromLegacy(
  params: {
    databaseAdmin: any;
    email: string;
    legacyHash: string;
    nome?: string | null;
    telefone?: string | null;
  }
) {
  const whatsapp =
    normalizeWhatsapp(
      params.telefone
    );

  const { data, error } =
    await params.databaseAdmin
      .from("clientes_app_auth")
      .insert({
        nome:
          String(
            params.nome || ""
          ).trim() ||
          "Cliente SalãoPremium",
        email:
          normalizeClienteEmail(
            params.email
          ) || null,
        telefone:
          whatsapp || null,
        whatsapp:
          whatsapp || null,
        senha_hash:
          params.legacyHash,
        auth_version: 1,
        migracao_identidade_concluida:
          false,
        ativo: true,
        ultimo_login_em:
          new Date().toISOString(),
      })
      .select(
        "id, nome, email, telefone, whatsapp, cpf, data_nascimento, senha_hash, auth_version, migracao_identidade_concluida, ativo"
      )
      .maybeSingle();

  if (error || !data?.id) {
    return null;
  }

  return data as ClienteAppAccountRow;
}

export async function loginClienteAppByEmailSenha(
  params: {
    email: string;
    senha: string;
    idSalao?: string | null;
  }
): Promise<ClienteLoginResult> {
  const identity = String(
    params.email || ""
  ).trim();

  const phone =
    normalizeClienteAppPhone(
      identity
    );

  const email = identity.includes("@")
    ? normalizeClienteAppEmail(
        identity
      )
    : "";

  const senha = String(
    params.senha || ""
  ).trim();

  const idSalao =
    String(
      params.idSalao || ""
    ).trim() || null;

  if (
    (!email && !phone) ||
    !senha
  ) {
    return {
      ok: false,
      error:
        "Informe telefone/e-mail e senha.",
    };
  }

  return runAdminOperation({
    action:
      "cliente_app_login_legado",
    actorId:
      email ||
      `telefone:${fingerprintIdentity(
        phone
      )}`,
    idSalao,
    run: async (
      databaseAdmin
    ): Promise<ClienteLoginResult> => {
      const globalAccount = email
        ? await findGlobalAccountByEmail(
            databaseAdmin,
            email
          )
        : await findGlobalAccountByPhone(
            databaseAdmin,
            phone
          );

      if (
        globalAccount?.id &&
        globalAccount.senha_hash
      ) {
        const passwordOk =
          await verifyClientePassword(
            senha,
            globalAccount.senha_hash
          );

        if (
          passwordOk &&
          globalAccount.ativo !== false
        ) {
          const securityAccess =
            await assertClienteSecurityAccess(
              {
                userId:
                  globalAccount.id,
                idSalao,
              }
            );

          if (securityAccess) {
            return {
              ok: false,
              error:
                securityAccess.error,
              redirectTo:
                securityAccess.redirectTo,
            };
          }

          await databaseAdmin
            .from(
              "clientes_app_auth"
            )
            .update({
              ultimo_login_em:
                new Date().toISOString(),
            })
            .eq(
              "id",
              globalAccount.id
            );

          await syncClienteAppLinksByIdentity({
            idConta:
              globalAccount.id,
          });

          return {
            ok: true,
            session:
              buildSessionFromAccount(
                globalAccount
              ),
            migrationRequired:
              !globalAccount.cpf ||
              !globalAccount.data_nascimento,
          };
        }
      }

      if (!email) {
        return {
          ok: false,
          error:
            "Acesso antigo não reconhecido.",
        };
      }

      let query = databaseAdmin
        .from("clientes_auth")
        .select(
          "id, id_cliente, id_salao, email, senha_hash, app_ativo"
        )
        .eq("email", email)
        .eq("app_ativo", true)
        .limit(idSalao ? 1 : 5);

      if (idSalao) {
        query = query.eq(
          "id_salao",
          idSalao
        );
      }

      const {
        data: authRows,
        error,
      } = await query;

      if (
        error ||
        !authRows?.length
      ) {
        return {
          ok: false,
          error:
            "Acesso antigo não reconhecido.",
        };
      }

      if (
        !idSalao &&
        authRows.length > 1
      ) {
        const eligibleSalonIds =
          await listEligibleSalonIdsByEmail(
            email
          );

        if (
          eligibleSalonIds.length > 1
        ) {
          return {
            ok: false,
            error:
              "Entre pelo salão em que sua conta antiga foi criada para atualizar o acesso.",
          };
        }
      }

      const acesso = authRows[0];

      if (
        !acesso?.senha_hash ||
        !(await verifyClientePassword(
          senha,
          acesso.senha_hash
        ))
      ) {
        return {
          ok: false,
          error:
            "Acesso antigo não reconhecido.",
        };
      }

      const { data: cliente } =
        await databaseAdmin
          .from("clientes")
          .select(
            "nome, email, telefone, whatsapp"
          )
          .eq(
            "id",
            acesso.id_cliente
          )
          .eq(
            "id_salao",
            acesso.id_salao
          )
          .limit(1)
          .maybeSingle();

      const conta =
        globalAccount?.id
          ? globalAccount
          : await createGlobalAccountFromLegacy(
              {
                databaseAdmin,
                email,
                legacyHash:
                  acesso.senha_hash,
                nome:
                  cliente?.nome,
                telefone:
                  cliente?.whatsapp ||
                  cliente?.telefone,
              }
            );

      if (!conta?.id) {
        return {
          ok: false,
          error:
            "Não foi possível atualizar seu acesso antigo agora.",
        };
      }

      await databaseAdmin
        .from("clientes_auth")
        .update({
          app_conta_id:
            conta.id,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", acesso.id);

      return {
        ok: true,
        session:
          buildSessionFromAccount(
            conta
          ),
        migrationRequired: true,
      };
    },
  });
}

export async function ensureClienteContaVinculadaAoSalao(
  params: {
    idConta: string;
    idSalao: string;
  }
) {
  const idConta = String(
    params.idConta || ""
  ).trim();

  const idSalao = String(
    params.idSalao || ""
  ).trim();

  if (!idConta || !idSalao) {
    return {
      ok: false as const,
      error:
        "Não foi possível identificar a conta para este salão.",
    };
  }

  const eligibility =
    await canSalonAppearInClientApp(
      idSalao
    );

  if (!eligibility.allowed) {
    return {
      ok: false as const,
      error:
        "Este salão não está publicado no app cliente agora.",
    };
  }

  return runAdminOperation({
    action:
      "cliente_app_ensure_salon_link",
    actorId: idConta,
    idSalao,
    run: async (databaseAdmin) => {
      const {
        data: accountRow,
        error: accountError,
      } = await databaseAdmin
        .from("clientes_app_auth")
        .select(
          "id, nome, email, telefone, whatsapp, cpf, data_nascimento, senha_hash, auth_version, migracao_identidade_concluida, ativo"
        )
        .eq("id", idConta)
        .limit(1)
        .maybeSingle();

      if (
        accountError ||
        !accountRow?.id ||
        accountRow.ativo === false
      ) {
        return {
          ok: false as const,
          error:
            "Sua conta global de cliente não está disponível agora.",
        };
      }

      const account =
        accountRow as ClienteAppAccountRow;

      const {
        data: linkedRows,
        error: linkedError,
      } = await databaseAdmin
        .from("clientes_auth")
        .select(
          "id, id_cliente"
        )
        .eq(
          "id_salao",
          idSalao
        )
        .eq(
          "app_conta_id",
          idConta
        )
        .eq("app_ativo", true)
        .limit(1);

      if (linkedError) {
        return {
          ok: false as const,
          error:
            "Não foi possível validar seu acesso ao salão agora.",
        };
      }

      if (
        linkedRows?.[0]?.id_cliente
      ) {
        return {
          ok: true as const,
          idCliente: String(
            linkedRows[0].id_cliente
          ),
        };
      }

      let idCliente = "";
      const cpf = normalizeCpf(
        account.cpf
      );

      if (cpf) {
        const byCpf =
          await findClienteRowsByCpf(
            {
              databaseAdmin,
              cpf,
              idSalao,
              limit: 2,
            }
          );

        if (byCpf.error) {
          return {
            ok: false as const,
            error:
              "Não foi possível validar sua identidade neste salão.",
          };
        }

        if (
          byCpf.data.length > 1
        ) {
          return {
            ok: false as const,
            error:
              "Encontramos cadastros duplicados com este CPF. O salão precisa revisar a ficha.",
          };
        }

        idCliente = String(
          byCpf.data[0]?.id || ""
        );
      }

      if (!idCliente && !cpf) {
        const phone =
          normalizeClienteAppPhone(
            account.whatsapp ||
              account.telefone
          );

        if (phone) {
          const byPhone =
            await findClienteRowsByNormalizedPhone(
              {
                databaseAdmin,
                telefone: phone,
                idSalao,
                limit: 3,
              }
            );

          if (
            !byPhone.error &&
            byPhone.data.length ===
              1
          ) {
            idCliente = String(
              byPhone.data[0].id ||
                ""
            );
          }
        }
      }

      const email =
        getClienteAppPublicEmail(
          account.email
        );

      if (
        !idCliente &&
        !cpf &&
        email
      ) {
        const { data: byEmail } =
          await databaseAdmin
            .from("clientes")
            .select("id")
            .eq(
              "id_salao",
              idSalao
            )
            .eq("email", email)
            .limit(2);

        if (
          byEmail?.length === 1
        ) {
          idCliente = String(
            byEmail[0].id || ""
          );
        }
      }

      const whatsapp =
        normalizeWhatsapp(
          account.whatsapp ||
            account.telefone
        );

      let createdNew = false;

      if (!idCliente) {
        const {
          data: created,
          error: createError,
        } = await databaseAdmin
          .from("clientes")
          .insert({
            id_salao: idSalao,
            nome: account.nome,
            email: email || null,
            telefone:
              whatsapp || null,
            whatsapp:
              whatsapp || null,
            cpf: cpf || null,
            data_nascimento:
              account.data_nascimento ||
              null,
            status: "ativo",
            ativo: "ativo",
          })
          .select("id")
          .maybeSingle();

        if (
          createError ||
          !created?.id
        ) {
          return {
            ok: false as const,
            error:
              "Não foi possível criar sua ficha de cliente neste salão.",
          };
        }

        idCliente = String(
          created.id
        );
        createdNew = true;
      } else {
        const updateResult =
          await databaseAdmin
            .from("clientes")
            .update({
              nome: account.nome,
              email: email || null,
              telefone:
                whatsapp || null,
              whatsapp:
                whatsapp || null,
              cpf: cpf || null,
              data_nascimento:
                account.data_nascimento ||
                null,
              status: "ativo",
              ativo: "ativo",
              atualizado_em:
                new Date().toISOString(),
            })
            .eq("id", idCliente)
            .eq(
              "id_salao",
              idSalao
            );

        if (
          updateResult.error
        ) {
          return {
            ok: false as const,
            error:
              "Não foi possível atualizar seu cadastro neste salão.",
          };
        }
      }

      const {
        data: authByClient,
      } = await databaseAdmin
        .from("clientes_auth")
        .select("id")
        .eq(
          "id_salao",
          idSalao
        )
        .eq(
          "id_cliente",
          idCliente
        )
        .limit(1);

      const authPayload = {
        id_cliente: idCliente,
        app_conta_id: idConta,
        email: email || null,
        senha_hash:
          account.senha_hash ||
          null,
        app_ativo: true,
        updated_at:
          new Date().toISOString(),
      };

      const authResult =
        authByClient?.[0]?.id
          ? await databaseAdmin
              .from(
                "clientes_auth"
              )
              .update(authPayload)
              .eq(
                "id",
                authByClient[0].id
              )
          : await databaseAdmin
              .from(
                "clientes_auth"
              )
              .insert({
                id_salao: idSalao,
                ...authPayload,
              });

      if (authResult.error) {
        if (createdNew) {
          await databaseAdmin
            .from("clientes")
            .delete()
            .eq("id", idCliente)
            .eq(
              "id_salao",
              idSalao
            );
        }

        return {
          ok: false as const,
          error:
            "Não foi possível ativar seu acesso neste salão.",
        };
      }

      return {
        ok: true as const,
        idCliente,
      };
    },
  });
}

// Export temporário utilizado por rotinas legadas que ainda precisam criar hash.
export { hashClientePassword };
