import "server-only";

import { Pool } from "@neondatabase/serverless";
import { resolveNeonRuntimeUrl } from "@/lib/neon/runtime-url.server";

let pool: Pool | null = null;
let poolUrl = "";

function databaseUrl() {
  const url = resolveNeonRuntimeUrl(
    process.env.NEON_ADMIN_DATABASE_URL || process.env.NEON_DATABASE_URL,
  );
  if (!url) {
    throw new Error(
      "Neon não configurado. Defina NEON_ADMIN_DATABASE_URL ou NEON_DATABASE_URL.",
    );
  }
  return url;
}

function getPool() {
  const url = databaseUrl();
  if (!pool || poolUrl !== url) {
    pool = new Pool({ connectionString: url });
    poolUrl = url;
  }
  return pool;
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

type AlertRow = {
  id: string;
  id_salao: string | null;
  tipo: string | null;
  titulo: string | null;
  resolvido: boolean | null;
  id_ticket: string | null;
};

/**
 * Resolve alerta do Admin Master sem passar pelo adapter Supabase-like.
 * Todos os parâmetros PostgreSQL possuem cast explícito para evitar 42P18.
 */
export async function resolverAlertaAdminMasterDireto(params: {
  idAlerta: string;
  idAdmin: string;
  motivo?: string | null;
}) {
  const idAlerta = normalizeText(params.idAlerta);
  const idAdmin = normalizeText(params.idAdmin);
  const motivo =
    normalizeText(params.motivo) || "Resolvido manualmente pelo AdminMaster.";

  if (!idAlerta) throw Object.assign(new Error("Alerta inválido."), { status: 400 });
  if (!idAdmin) throw Object.assign(new Error("Administrador inválido."), { status: 401 });

  const client = await getPool().connect();
  try {
    await client.query("begin");

    const alertResult = await client.query<AlertRow>(
      `select
         id::text as id,
         id_salao::text as id_salao,
         tipo::text as tipo,
         titulo::text as titulo,
         resolvido,
         id_ticket::text as id_ticket
       from public.alertas_sistema
       where id::text = $1::text
       limit 1
       for update`,
      [idAlerta],
    );

    const alerta = alertResult.rows[0] || null;
    if (!alerta) {
      throw Object.assign(new Error("Alerta não encontrado."), { status: 404 });
    }

    await client.query(
      `update public.alertas_sistema
          set resolvido = true,
              resolvido_por = $2::uuid,
              resolvido_em = now(),
              atualizado_em = now(),
              payload_json = coalesce(payload_json, '{}'::jsonb) || jsonb_build_object(
                'resolucao_motivo', $3::text,
                'resolvido_manual_em', now()::text,
                'resolvido_manual_por', $2::text
              )
        where id::text = $1::text`,
      [idAlerta, idAdmin, motivo],
    );

    if (alerta.id_ticket) {
      await client.query(
        `insert into public.ticket_eventos (
           id_ticket,
           evento,
           descricao,
           payload_json
         ) values (
           $1::uuid,
           'alerta_resolvido'::text,
           $2::text,
           jsonb_build_object(
             'id_alerta', $3::text,
             'tipo_alerta', $4::text,
             'resolvido_por', $5::text
           )
         )`,
        [alerta.id_ticket, motivo, alerta.id, alerta.tipo || "", idAdmin],
      );
    }

    await client.query("commit");

    return {
      idAlerta: alerta.id,
      idTicket: alerta.id_ticket || null,
      resolvido: true,
      motivo,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
