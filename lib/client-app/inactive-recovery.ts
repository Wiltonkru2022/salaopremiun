import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { queueNotificationJob } from "@/lib/notification-jobs";

const DEFAULT_DAYS = [30, 45, 60];

function buildCouponCode(days: number) {
  return `SAUDADES${days}`;
}

export async function ensureRecoveryCoupons(idSalao: string) {
  const supabase = getSupabaseAdmin();
  const { count } = await (supabase as any)
    .from("cupons_salao")
    .select("id", { count: "exact", head: true })
    .eq("id_salao", idSalao)
    .eq("automatico_recuperacao", true)
    .in("dias_cliente_inativo", DEFAULT_DAYS);

  if (Number(count || 0) >= DEFAULT_DAYS.length) {
    return;
  }

  const rows = DEFAULT_DAYS.map((days) => ({
    id_salao: idSalao,
    codigo: buildCouponCode(days),
    nome: `Cupom Saudades ${days} dias`,
    descricao: `Cliente sem voltar ha ${days} dias recebe um incentivo pelo app cliente.`,
    tipo_desconto: "percentual",
    valor_desconto: days >= 60 ? 15 : 10,
    limite_uso_cliente: 1,
    dias_cliente_inativo: days,
    ativo: true,
    requer_resgate: false,
    automatico_recuperacao: true,
    metadata: { origem: "recuperacao_automatica" },
  }));

  await (supabase as any).from("cupons_salao").upsert(rows, {
    onConflict: "id_salao,codigo",
    ignoreDuplicates: true,
  });
}

async function getLastAppointmentDate(params: {
  idSalao: string;
  idCliente: string;
}) {
  const { data } = await (getSupabaseAdmin() as any)
    .from("agendamentos")
    .select("data")
    .eq("id_salao", params.idSalao)
    .eq("cliente_id", params.idCliente)
    .in("status", ["atendido", "aguardando_pagamento"])
    .order("data", { ascending: false })
    .limit(1)
    .maybeSingle();

  return String(data?.data || "").slice(0, 10) || null;
}

async function getClientReferenceDate(params: {
  clienteAppContaId: string;
  clienteCreatedAt?: string | null;
}) {
  const clienteCreatedAt = String(params.clienteCreatedAt || "").slice(0, 10);
  if (clienteCreatedAt) return clienteCreatedAt;

  const { data } = await (getSupabaseAdmin() as any)
    .from("clientes_app_auth")
    .select("created_at")
    .eq("id", params.clienteAppContaId)
    .limit(1)
    .maybeSingle();

  return String(data?.created_at || "").slice(0, 10) || null;
}

function diffDays(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

export async function processInactiveClientRecovery(limitSaloes = 20) {
  const supabase = getSupabaseAdmin();
  const { data: saloes } = await (supabase as any)
    .from("saloes")
    .select("id, nome, nome_fantasia, status")
    .neq("status", "excluido")
    .limit(limitSaloes);

  let checked = 0;
  let queued = 0;

  for (const salao of ((saloes || []) as Array<Record<string, unknown>>)) {
    const idSalao = String(salao.id || "").trim();
    if (!idSalao) continue;
    await ensureRecoveryCoupons(idSalao);

    const { data: cupons } = await (supabase as any)
      .from("cupons_salao")
      .select("id, codigo, nome, dias_cliente_inativo, valor_desconto, tipo_desconto")
      .eq("id_salao", idSalao)
      .eq("ativo", true)
      .eq("automatico_recuperacao", true)
      .order("dias_cliente_inativo", { ascending: false })
      .limit(5);

    const couponRows = ((cupons || []) as Array<Record<string, unknown>>).filter(
      (cupom) => Number(cupom.dias_cliente_inativo || 0) > 0
    );
    if (!couponRows.length) continue;

    const { data: vinculos } = await (supabase as any)
      .from("clientes_auth")
      .select("id_cliente, app_conta_id, clientes(nome, status, created_at)")
      .eq("id_salao", idSalao)
      .eq("app_ativo", true)
      .not("app_conta_id", "is", null)
      .limit(100);

    for (const vinculo of ((vinculos || []) as Array<Record<string, unknown>>)) {
      const idCliente = String(vinculo.id_cliente || "").trim();
      const clienteAppContaId = String(vinculo.app_conta_id || "").trim();
      if (!idCliente || !clienteAppContaId) continue;
      checked += 1;

      const lastDate = await getLastAppointmentDate({ idSalao, idCliente });
      const referenceDate =
        lastDate ||
        (await getClientReferenceDate({
          clienteAppContaId,
          clienteCreatedAt: String(
            (vinculo.clientes as { created_at?: string | null } | null)
              ?.created_at || ""
          ),
        }));
      if (!referenceDate) continue;
      const inactiveDays = diffDays(referenceDate);
      const cupom = couponRows.find(
        (item) => inactiveDays >= Number(item.dias_cliente_inativo || 0)
      );
      if (!cupom?.id) continue;

      const { data: existing } = await (supabase as any)
        .from("cliente_campanhas_recuperacao")
        .select("id")
        .eq("id_salao", idSalao)
        .eq("id_cliente", idCliente)
        .eq("dias_inativo", Number(cupom.dias_cliente_inativo || 0))
        .in("status", ["pendente", "enviada"])
        .limit(1)
        .maybeSingle();

      if (existing?.id) continue;

      const { data: campaign } = await (supabase as any)
        .from("cliente_campanhas_recuperacao")
        .insert({
          id_salao: idSalao,
          id_cliente: idCliente,
          cliente_app_conta_id: clienteAppContaId,
          id_cupom: cupom.id,
          dias_inativo: Number(cupom.dias_cliente_inativo || 0),
          status: "enviada",
          enviada_em: new Date().toISOString(),
          metadata: { lastDate, referenceDate, inactiveDays },
        })
        .select("id")
        .maybeSingle();

      await queueNotificationJob({
        idSalao,
        idCliente,
        clienteAppContaId,
        canal: "cliente_app",
        tipo: "cliente_inativo_cupom_saudades",
        titulo: "Saudades de você",
        mensagem: `Use o cupom ${cupom.codigo} para voltar ao salão com um benefício especial.`,
        url: `/app-cliente/salao/${idSalao}`,
        tag: `saudades-${idSalao}-${idCliente}`,
        idempotencyKey: `cliente-inativo:${idSalao}:${idCliente}:${cupom.id}`,
        metadata: {
          idCampanha: campaign?.id || null,
          codigoCupom: cupom.codigo,
          inactiveDays,
        },
      });
      queued += 1;
    }
  }

  return { checked, queued };
}
