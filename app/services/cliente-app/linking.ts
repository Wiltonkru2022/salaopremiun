import { runAdminOperation } from "@/lib/db/admin-ops";
import {
  normalizeClienteEmail,
  normalizeCpf,
  normalizeWhatsapp,
} from "@/lib/client-app/identity";

type ClienteAppLinkAccount = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp?: string | null;
  cpf?: string | null;
  data_nascimento?: string | null;
  senha_hash?: string | null;
};

export type ClienteManualLinkRow = {
  id?: string | null;
  id_salao?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  cpf?: string | null;
  data_nascimento?: string | null;
};

export type ClienteAppLinkSummary = {
  matched: number;
  linked: number;
};

export function normalizeClienteAppEmail(value: string | null | undefined) {
  return normalizeClienteEmail(value);
}

export function normalizeClienteAppPhone(value: string | null | undefined) {
  return normalizeWhatsapp(value);
}

const PHONE_ONLY_EMAIL_DOMAIN = "telefone.salaopremium.local";

// Somente compatibilidade com registros legados. Código novo não deve criar placeholder.
export function buildClienteAppPhoneOnlyEmail(telefone: string) {
  const normalized = normalizeClienteAppPhone(telefone);
  return normalized ? `cliente-${normalized}@${PHONE_ONLY_EMAIL_DOMAIN}` : "";
}

export function isClienteAppPhoneOnlyEmail(email: string | null | undefined) {
  const normalized = String(email || "").trim().toLowerCase();
  return (
    normalized.endsWith(`@${PHONE_ONLY_EMAIL_DOMAIN}`) ||
    normalized.endsWith("@salaopremiun.local") ||
    normalized.endsWith("@salaopremium.local")
  );
}

export function getClienteAppPublicEmail(email: string | null | undefined) {
  const normalized = String(email || "").trim().toLowerCase();
  return isClienteAppPhoneOnlyEmail(normalized) ? "" : normalized;
}

function uniqueClienteRows(rows: ClienteManualLinkRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const id = String(row.id || "").trim();
    const salao = String(row.id_salao || "").trim();
    const key = `${salao}:${id}`;
    if (!id || !salao || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function findClienteRowsByCpf(params: {
  databaseAdmin: any;
  cpf: string;
  idSalao?: string | null;
  limit?: number;
}) {
  const cpf = normalizeCpf(params.cpf);
  if (!cpf) return { data: [] as ClienteManualLinkRow[], error: null as unknown };

  let query = params.databaseAdmin
    .from("clientes")
    .select("id, id_salao, telefone, whatsapp, cpf, data_nascimento")
    .eq("cpf", cpf);
  if (params.idSalao) query = query.eq("id_salao", params.idSalao);
  const result = await query.limit(params.limit || 500);
  return {
    data: uniqueClienteRows((result.data || []) as ClienteManualLinkRow[]),
    error: result.error,
  };
}

export async function findClienteRowsByNormalizedPhone(params: {
  databaseAdmin: any;
  telefone: string;
  idSalao?: string | null;
  limit?: number;
}) {
  const telefone = normalizeClienteAppPhone(params.telefone);
  if (!telefone) return { data: [] as ClienteManualLinkRow[], error: null as unknown };

  let query = params.databaseAdmin
    .from("clientes")
    .select("id, id_salao, telefone, whatsapp, cpf, data_nascimento")
    .or(`telefone.eq.${telefone},whatsapp.eq.${telefone}`);
  if (params.idSalao) query = query.eq("id_salao", params.idSalao);
  const exact = await query.limit(params.limit || 500);
  if (exact.error) return { data: [], error: exact.error };

  const exactRows = uniqueClienteRows(
    ((exact.data || []) as ClienteManualLinkRow[]).filter(
      (row) =>
        normalizeClienteAppPhone(row.telefone) === telefone ||
        normalizeClienteAppPhone(row.whatsapp) === telefone
    )
  );
  if (exactRows.length) return { data: exactRows, error: null as unknown };

  let fallback = params.databaseAdmin
    .from("clientes")
    .select("id, id_salao, telefone, whatsapp, cpf, data_nascimento")
    .or("telefone.not.is.null,whatsapp.not.is.null");
  if (params.idSalao) fallback = fallback.eq("id_salao", params.idSalao);
  const fallbackResult = await fallback.limit(params.idSalao ? 500 : 2000);
  if (fallbackResult.error) return { data: [], error: fallbackResult.error };

  return {
    data: uniqueClienteRows(
      ((fallbackResult.data || []) as ClienteManualLinkRow[]).filter(
        (row) =>
          normalizeClienteAppPhone(row.telefone) === telefone ||
          normalizeClienteAppPhone(row.whatsapp) === telefone
      )
    ),
    error: null as unknown,
  };
}

async function upsertClienteAuthLink(params: {
  databaseAdmin: any;
  account: ClienteAppLinkAccount;
  idSalao: string;
  idCliente: string;
}) {
  const email = getClienteAppPublicEmail(params.account.email);
  const whatsapp = normalizeClienteAppPhone(
    params.account.whatsapp || params.account.telefone
  );
  const cpf = normalizeCpf(params.account.cpf);
  const now = new Date().toISOString();

  const clienteUpdate = await params.databaseAdmin
    .from("clientes")
    .update({
      nome: String(params.account.nome || "").trim() || "Cliente SalãoPremium",
      email: email || null,
      telefone: whatsapp || null,
      whatsapp: whatsapp || null,
      cpf: cpf || null,
      data_nascimento: params.account.data_nascimento || null,
      status: "ativo",
      ativo: "ativo",
      atualizado_em: now,
    })
    .eq("id", params.idCliente)
    .eq("id_salao", params.idSalao);
  if (clienteUpdate.error) return false;

  const { data: existing } = await params.databaseAdmin
    .from("clientes_auth")
    .select("id")
    .eq("id_salao", params.idSalao)
    .eq("id_cliente", params.idCliente)
    .limit(1);

  if (existing?.[0]?.id) {
    const { error } = await params.databaseAdmin
      .from("clientes_auth")
      .update({
        app_conta_id: params.account.id,
        email: email || null,
        senha_hash: params.account.senha_hash || null,
        app_ativo: true,
        updated_at: now,
      })
      .eq("id", existing[0].id);
    return !error;
  }

  const { error } = await params.databaseAdmin.from("clientes_auth").insert({
    id_salao: params.idSalao,
    id_cliente: params.idCliente,
    app_conta_id: params.account.id,
    email: email || null,
    senha_hash: params.account.senha_hash || null,
    app_ativo: true,
  });
  return !error;
}

export async function syncClienteAppLinksByIdentity(params: {
  idConta: string;
}): Promise<ClienteAppLinkSummary> {
  const idConta = String(params.idConta || "").trim();
  if (!idConta) return { matched: 0, linked: 0 };

  return runAdminOperation({
    action: "cliente_app_sync_links_by_identity",
    actorId: idConta,
    run: async (databaseAdmin): Promise<ClienteAppLinkSummary> => {
      const { data: accountRow, error } = await (databaseAdmin as any)
        .from("clientes_app_auth")
        .select("id, nome, email, telefone, whatsapp, cpf, data_nascimento, senha_hash, ativo")
        .eq("id", idConta)
        .limit(1)
        .maybeSingle();
      if (error || !accountRow?.id || accountRow.ativo === false) return { matched: 0, linked: 0 };

      const account = accountRow as ClienteAppLinkAccount;
      const cpf = normalizeCpf(account.cpf);
      const whatsapp = normalizeClienteAppPhone(account.whatsapp || account.telefone);

      if (cpf) {
        const byCpf = await findClienteRowsByCpf({ databaseAdmin, cpf });
        if (byCpf.error) return { matched: 0, linked: 0 };

        if (byCpf.data.length) {
          let linked = 0;
          for (const row of byCpf.data) {
            if (
              await upsertClienteAuthLink({
                databaseAdmin,
                account,
                idSalao: String(row.id_salao),
                idCliente: String(row.id),
              })
            ) linked += 1;
          }
          return { matched: byCpf.data.length, linked };
        }

        // Ficha antiga do salão pode ter somente WhatsApp. Só vinculamos registros
        // cujo CPF esteja vazio ou seja o mesmo CPF da conta para evitar mistura de pessoas.
        if (whatsapp) {
          const byPhone = await findClienteRowsByNormalizedPhone({
            databaseAdmin,
            telefone: whatsapp,
          });
          if (byPhone.error) return { matched: 0, linked: 0 };

          const safeRows = byPhone.data.filter((row) => {
            const rowCpf = normalizeCpf(row.cpf);
            return !rowCpf || rowCpf === cpf;
          });

          let linked = 0;
          for (const row of safeRows) {
            if (
              await upsertClienteAuthLink({
                databaseAdmin,
                account,
                idSalao: String(row.id_salao),
                idCliente: String(row.id),
              })
            ) linked += 1;
          }

          return { matched: safeRows.length, linked };
        }

        return { matched: 0, linked: 0 };
      }

      // Compatibilidade de migração: sem CPF, telefone só é usado se apontar
      // para UMA única ficha, pois não há um identificador forte para desempatar.
      if (!whatsapp) return { matched: 0, linked: 0 };
      const found = await findClienteRowsByNormalizedPhone({
        databaseAdmin,
        telefone: whatsapp,
      });
      if (found.error || found.data.length !== 1) {
        return { matched: found.data.length, linked: 0 };
      }

      const row = found.data[0];
      const linked = await upsertClienteAuthLink({
        databaseAdmin,
        account,
        idSalao: String(row.id_salao),
        idCliente: String(row.id),
      });
      return { matched: 1, linked: linked ? 1 : 0 };
    },
  });
}

export async function syncClienteAppLinksByPhone(params: { idConta: string }) {
  return syncClienteAppLinksByIdentity(params);
}
