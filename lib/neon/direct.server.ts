import "server-only";

import { Pool, type PoolClient } from "@neondatabase/serverless";
import { resolveNeonRuntimeUrl } from "@/lib/neon/runtime-url.server";

let pool: Pool | null = null;
let poolUrl = "";

function getDatabaseUrl() {
  const url = resolveNeonRuntimeUrl(
    process.env.NEON_ADMIN_DATABASE_URL || process.env.NEON_DATABASE_URL
  );

  if (!url) {
    throw new Error(
      "Neon nao configurado. Defina NEON_ADMIN_DATABASE_URL ou NEON_DATABASE_URL."
    );
  }

  return url;
}

function getPool() {
  const url = getDatabaseUrl();

  if (!pool || poolUrl !== url) {
    pool = new Pool({ connectionString: url });
    poolUrl = url;
  }

  return pool;
}

export async function withNeonDirectClient<T>(
  run: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();

  try {
    return await run(client);
  } finally {
    client.release();
  }
}

export async function queryNeonDirect<T = Record<string, unknown>>(
  text: string,
  values: unknown[] = []
) {
  return withNeonDirectClient(async (client) => {
    const result = await client.query(text, values);
    return result as typeof result & { rows: T[] };
  });
}
