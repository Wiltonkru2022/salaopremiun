import { Pool, type PoolClient } from "@neondatabase/serverless";

export type NeonAppIdentity = {
  email: string;
  mfaVerified?: boolean;
};

export type NeonResolvedIdentity = {
  id: string;
  idSalao: string | null;
  nivel: string | null;
  status: string | null;
  email: string;
  aal: "aal1" | "aal2";
};

type ResolvedUsuarioRow = {
  id: string;
  id_salao: string | null;
  nivel: string | null;
  status: string | null;
};

let pool: Pool | null = null;
let configuredUrl = "";

function databaseUrl() {
  const url = String(process.env.NEON_DATABASE_URL || "").trim();
  if (!url) throw new Error("NEON_DATABASE_URL nao configurada.");
  return url;
}

function getPool() {
  const url = databaseUrl();
  if (!pool || configuredUrl !== url) {
    pool = new Pool({ connectionString: url });
    configuredUrl = url;
  }
  return pool;
}

async function setTransactionContext(
  client: PoolClient,
  identity: NeonAppIdentity
): Promise<NeonResolvedIdentity> {
  const email = String(identity.email || "").trim().toLowerCase();
  if (!email) throw new Error("Identidade sem email para contexto Neon.");

  const resolved = await client.query<ResolvedUsuarioRow>(
    `select id, id_salao, nivel, status
       from private.resolve_usuario_context($1)`,
    [email]
  );

  const usuario = resolved.rows[0];
  if (!usuario?.id || usuario.status !== "ativo") {
    throw new Error("Usuario administrativo nao encontrado ou inativo no Neon.");
  }

  const aal = identity.mfaVerified ? "aal2" : "aal1";

  await client.query(
    `select
       set_config('app.user_id', $1, true),
       set_config('app.user_email', $2, true),
       set_config('app.aal', $3, true)`,
    [usuario.id, email, aal]
  );

  return {
    id: usuario.id,
    idSalao: usuario.id_salao,
    nivel: usuario.nivel,
    status: usuario.status,
    email,
    aal,
  };
}

export function isNeonDatabaseConfigured() {
  return Boolean(String(process.env.NEON_DATABASE_URL || "").trim());
}

export async function withNeonRls<T>(
  identity: NeonAppIdentity,
  operation: (client: PoolClient, context: NeonResolvedIdentity) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query("begin");
    const context = await setTransactionContext(client, identity);
    const result = await operation(client, context);
    await client.query("commit");
    return result;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Preserve the original error.
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function withNeonPublic<T>(
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    return await operation(client);
  } finally {
    client.release();
  }
}
