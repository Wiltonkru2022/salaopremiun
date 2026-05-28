import { runAdminOperation } from "@/lib/supabase/admin-ops";

type ClienteAppLinkAccount = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  senha_hash?: string | null;
};

export type ClienteManualLinkRow = {
  id?: string | null;
  id_salao?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
};

export type ClienteAppLinkSummary = {
  matched: number;
  linked: number;
};

export function normalizeClienteAppEmail(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeClienteAppPhone(value: string | null | undefined) {
  return String(value || "").replace(/\D/g, "").trim();
}

const PHONE_ONLY_EMAIL_DOMAIN = "telefone.salaopremium.local";

export function buildClienteAppPhoneOnlyEmail(telefone: string) {
  const normalized = normalizeClienteAppPhone(telefone);
  return normalized ? `cliente-${normalized}@${PHONE_ONLY_EMAIL_DOMAIN}` : "";
}

export function isClienteAppPhoneOnlyEmail(email: string | null | undefined) {
  const normalized = normalizeClienteAppEmail(email);
  return normalized.endsWith(`@${PHONE_ONLY_EMAIL_DOMAIN}`);
}

export function getClienteAppPublicEmail(email: string | null | undefined) {
  const normalized = normalizeClienteAppEmail(email);
  return isClienteAppPhoneOnlyEmail(normalized) ? "" : normalized;
}

function clienteRowMatchesPhone(row: ClienteManualLinkRow, telefone: string) {
  return (
    normalizeClienteAppPhone(row.telefone) === telefone ||
    normalizeClienteAppPhone(row.whatsapp) === telefone
  );
}

function uniqueClienteRows(rows: ClienteManualLinkRow[]) {
  const seen = new Set<string>();
  const unique: ClienteManualLinkRow[] = [];

  for (const row of rows) {
    const idCliente = String(row.id || "").trim();
    const idSalao = String(row.id_salao || "").trim();
    const key = `${idSalao}:${idCliente}`;

    if (!idCliente || !idSalao || seen.has(key)) continue;

    seen.add(key);
    unique.push(row);
  }

  return unique;
}

export async function findClienteRowsByNormalizedPhone(params: {
  supabaseAdmin: any;
  telefone: string;
  idSalao?: string | null;
  limit?: number;
}) {
  const telefone = normalizeClienteAppPhone(params.telefone);
  const outputLimit = params.limit || 500;
  if (!telefone) {
    return { data: [] as ClienteManualLinkRow[], error: null as unknown };
  }

  const selectColumns = "id, id_salao, telefone, whatsapp";
  let exactQuery = params.supabaseAdmin.from("clientes").select(selectColumns);

  if (params.idSalao) {
    exactQuery = exactQuery.eq("id_salao", params.idSalao);
  }

  const exactResult = await exactQuery
    .or(`telefone.eq.${telefone},whatsapp.eq.${telefone}`)
    .limit(outputLimit);

  if (exactResult.error) {
    return { data: [] as ClienteManualLinkRow[], error: exactResult.error };
  }

  const exactRows = uniqueClienteRows(
    ((exactResult.data || []) as ClienteManualLinkRow[]).filter((row) =>
      clienteRowMatchesPhone(row, telefone)
    )
  );

  if (exactRows.length) {
    return { data: exactRows.slice(0, outputLimit), error: null as unknown };
  }

  let fallbackQuery = params.supabaseAdmin
    .from("clientes")
    .select(selectColumns)
    .or("telefone.not.is.null,whatsapp.not.is.null");

  if (params.idSalao) {
    fallbackQuery = fallbackQuery.eq("id_salao", params.idSalao);
  }

  const fallbackResult = await fallbackQuery.limit(params.idSalao ? 500 : 2000);

  if (fallbackResult.error) {
    return { data: [] as ClienteManualLinkRow[], error: fallbackResult.error };
  }

  return {
    data: uniqueClienteRows(
      ((fallbackResult.data || []) as ClienteManualLinkRow[]).filter((row) =>
        clienteRowMatchesPhone(row, telefone)
      )
    ).slice(0, outputLimit),
    error: null as unknown,
  };
}

async function upsertClienteAuthLink(params: {
  supabaseAdmin: any;
  account: ClienteAppLinkAccount;
  idSalao: string;
  idCliente: string;
}) {
  const email = normalizeClienteAppEmail(params.account.email);
  const telefone = normalizeClienteAppPhone(params.account.telefone);
  const now = new Date().toISOString();

  await params.supabaseAdmin
    .from("clientes")
    .update({
      nome: String(params.account.nome || "").trim() || "Cliente SalãoPremium",
      email: email || null,
      telefone: telefone || null,
      whatsapp: telefone || null,
      status: "ativo",
      ativo: "ativo",
      atualizado_em: now,
    })
    .eq("id", params.idCliente)
    .eq("id_salao", params.idSalao);

  const { data: authByClientRows } = await params.supabaseAdmin
    .from("clientes_auth")
    .select("id")
    .eq("id_salao", params.idSalao)
    .eq("id_cliente", params.idCliente)
    .limit(1);

  const authByClient = authByClientRows?.[0];
  if (authByClient?.id) {
    const { error } = await params.supabaseAdmin
      .from("clientes_auth")
      .update({
        app_conta_id: params.account.id,
        email: email || null,
        senha_hash: params.account.senha_hash || null,
        app_ativo: true,
        updated_at: now,
      })
      .eq("id", authByClient.id);

    return !error;
  }

  const { data: authByEmailRows } = email
    ? await params.supabaseAdmin
        .from("clientes_auth")
        .select("id")
        .eq("id_salao", params.idSalao)
        .eq("email", email)
        .limit(1)
    : { data: [] };

  const authByEmail = authByEmailRows?.[0];
  if (authByEmail?.id) {
    const { error } = await params.supabaseAdmin
      .from("clientes_auth")
      .update({
        id_cliente: params.idCliente,
        app_conta_id: params.account.id,
        email: email || null,
        senha_hash: params.account.senha_hash || null,
        app_ativo: true,
        updated_at: now,
      })
      .eq("id", authByEmail.id);

    return !error;
  }

  const { error } = await params.supabaseAdmin.from("clientes_auth").insert({
    id_salao: params.idSalao,
    id_cliente: params.idCliente,
    app_conta_id: params.account.id,
    email: email || null,
    senha_hash: params.account.senha_hash || null,
    app_ativo: true,
  });

  return !error;
}

export async function syncClienteAppLinksByPhone(params: {
  idConta: string;
}): Promise<ClienteAppLinkSummary> {
  const idConta = String(params.idConta || "").trim();

  if (!idConta) {
    return { matched: 0, linked: 0 };
  }

  return runAdminOperation({
    action: "cliente_app_sync_links_by_phone",
    actorId: idConta,
    run: async (supabaseAdmin): Promise<ClienteAppLinkSummary> => {
      const { data: accountRow, error: accountError } = await (supabaseAdmin as any)
        .from("clientes_app_auth")
        .select("id, nome, email, telefone, senha_hash, ativo")
        .eq("id", idConta)
        .limit(1)
        .maybeSingle();

      if (accountError || !accountRow?.id || accountRow.ativo === false) {
        return { matched: 0, linked: 0 };
      }

      const account = accountRow as ClienteAppLinkAccount;
      const telefone = normalizeClienteAppPhone(account.telefone);
      if (!telefone) {
        return { matched: 0, linked: 0 };
      }

      const { data: clienteRows, error: clientesError } =
        await findClienteRowsByNormalizedPhone({
          supabaseAdmin,
          telefone,
        });

      if (clientesError || !clienteRows?.length) {
        return { matched: 0, linked: 0 };
      }

      let linked = 0;
      const seen = new Set<string>();

      for (const row of clienteRows) {
        const idCliente = String(row.id || "").trim();
        const idSalao = String(row.id_salao || "").trim();
        const key = `${idSalao}:${idCliente}`;
        if (!idCliente || !idSalao || seen.has(key)) continue;
        seen.add(key);

        const ok = await upsertClienteAuthLink({
          supabaseAdmin,
          account,
          idSalao,
          idCliente,
        });

        if (ok) linked += 1;
      }

      return {
        matched: seen.size,
        linked,
      };
    },
  });
}
