import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureClienteContaVinculadaAoSalao } from "@/app/services/cliente-app/auth";
import { queueNotificationJob } from "@/lib/notification-jobs";

function normalizeToken(value: string) {
  return String(value || "").trim();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addMinutesIso(minutes: number) {
  return new Date(Date.now() + Math.max(0, minutes) * 60_000).toISOString();
}

function buildCouponPushMessage(cupom: Record<string, unknown>) {
  const nome = String(cupom.nome || "").trim();
  const descricao = String(cupom.descricao || "").trim();
  return (
    String(cupom.mensagem_push || "").trim() ||
    descricao ||
    `Seu cupom ${nome || "especial"} ja esta liberado para o proximo agendamento.`
  );
}

export async function redeemClienteCoupon(params: {
  token: string;
  idConta: string;
}) {
  const token = normalizeToken(params.token);
  const idConta = String(params.idConta || "").trim();

  if (!token || !idConta) {
    return { ok: false as const, error: "Nao foi possivel identificar o cupom." };
  }

  const supabase = getSupabaseAdmin();
  const hoje = todayIso();
  const { data: cupom, error } = await (supabase as any)
    .from("cupons_salao")
    .select(
      "id, id_salao, codigo, nome, descricao, titulo_push, mensagem_push, valido_de, valido_ate, ativo, resgate_token, push_delay_minutos, saloes(id, nome, nome_fantasia, app_cliente_slug)"
    )
    .eq("resgate_token", token)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (error || !cupom?.id) {
    return { ok: false as const, error: "Cupom nao encontrado ou inativo." };
  }

  if (cupom.valido_de && String(cupom.valido_de) > hoje) {
    return { ok: false as const, error: "Este cupom ainda nao esta valido." };
  }

  if (cupom.valido_ate && String(cupom.valido_ate) < hoje) {
    return { ok: false as const, error: "Este cupom expirou." };
  }

  const idSalao = String(cupom.id_salao || "").trim();
  const vinculo = await ensureClienteContaVinculadaAoSalao({ idConta, idSalao });
  if (!vinculo.ok) {
    return vinculo;
  }

  const [{ count: usosCliente }, { data: resgateExistente }] = await Promise.all([
    (supabase as any)
      .from("cupom_salao_usos")
      .select("id", { count: "exact", head: true })
      .eq("id_cupom", cupom.id)
      .eq("cliente_app_conta_id", idConta),
    (supabase as any)
      .from("cupom_salao_resgates")
      .select("id, status")
      .eq("id_cupom", cupom.id)
      .eq("cliente_app_conta_id", idConta)
      .limit(1)
      .maybeSingle(),
  ]);

  if (Number(usosCliente || 0) > 0) {
    return { ok: false as const, error: "Voce ja usou este cupom." };
  }

  const resgatePayload = {
    id_salao: idSalao,
    id_cupom: cupom.id,
    cliente_app_conta_id: idConta,
    id_cliente: vinculo.idCliente,
    token,
    status: "resgatado",
    resgatado_em: new Date().toISOString(),
    metadata: { origem: "link_whatsapp_manual" },
    updated_at: new Date().toISOString(),
  };

  const { error: resgateError } = resgateExistente?.id
    ? await (supabase as any)
        .from("cupom_salao_resgates")
        .update(resgatePayload)
        .eq("id", resgateExistente.id)
    : await (supabase as any)
        .from("cupom_salao_resgates")
        .insert(resgatePayload);

  if (resgateError) {
    return { ok: false as const, error: "Nao foi possivel resgatar o cupom agora." };
  }

  const salaoRel = Array.isArray(cupom.saloes) ? cupom.saloes[0] : cupom.saloes;
  const salaoSlug = String(salaoRel?.app_cliente_slug || idSalao).trim();
  const titulo = String(cupom.titulo_push || cupom.nome || "Voce recebeu um cupom").trim();
  const codigoCupom = String(cupom.codigo || "").trim();

  try {
    await (supabase as any)
      .from("campanha_eventos")
      .insert({
        id_salao: idSalao,
        id_cupom: cupom.id,
        cliente_app_conta_id: idConta,
        id_cliente: vinculo.idCliente,
        tipo: "resgate",
        metadata: { origem: "link_whatsapp_manual", codigo: codigoCupom },
      });
  } catch {
    // O resgate nao deve falhar se a telemetria da campanha oscilar.
  }

  await queueNotificationJob({
    idSalao,
    idCliente: vinculo.idCliente,
    clienteAppContaId: idConta,
    canal: "cliente_app",
    tipo: "cupom_recebido_cliente",
    titulo,
    mensagem: buildCouponPushMessage(cupom as Record<string, unknown>),
    url: `/app-cliente/salao/${salaoSlug}/reserva?cupom=${encodeURIComponent(codigoCupom)}`,
    tag: `cupom-${cupom.id}`,
    enviarEm: addMinutesIso(Number(cupom.push_delay_minutos || 5)),
    idempotencyKey: `cupom-resgatado:${idConta}:${cupom.id}`,
    metadata: { id_cupom: cupom.id, codigo: codigoCupom },
  }).catch(() => null);

  await (supabase as any)
    .from("cupom_salao_resgates")
    .update({ notificado_em: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id_cupom", cupom.id)
    .eq("cliente_app_conta_id", idConta);

  return {
    ok: true as const,
    cupom: {
      codigo: String(cupom.codigo || "").trim(),
      nome: String(cupom.nome || "").trim(),
      idSalao,
      salaoSlug,
    },
  };
}

export async function loadCouponByToken(tokenValue: string) {
  const token = normalizeToken(tokenValue);
  if (!token) return null;

  const { data } = await (getSupabaseAdmin() as any)
    .from("cupons_salao")
    .select("id, id_salao, codigo, nome, descricao, tipo_desconto, valor_desconto, valido_ate, ativo, saloes(id, nome, nome_fantasia, app_cliente_slug)")
    .eq("resgate_token", token)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  return data || null;
}

export async function loadCouponRedemptionForAccount(params: {
  idCupom?: string | null;
  idConta?: string | null;
}) {
  const idCupom = String(params.idCupom || "").trim();
  const idConta = String(params.idConta || "").trim();
  if (!idCupom || !idConta) return null;

  const supabase = getSupabaseAdmin();
  const [{ data: resgate }, { count: usosCliente }] = await Promise.all([
    (supabase as any)
      .from("cupom_salao_resgates")
      .select("id, status")
      .eq("id_cupom", idCupom)
      .eq("cliente_app_conta_id", idConta)
      .limit(1)
      .maybeSingle(),
    (supabase as any)
      .from("cupom_salao_usos")
      .select("id", { count: "exact", head: true })
      .eq("id_cupom", idCupom)
      .eq("cliente_app_conta_id", idConta),
  ]);

  if (!resgate?.id && Number(usosCliente || 0) <= 0) return null;

  return {
    status: String(resgate?.status || "").trim() || "resgatado",
    jaUsou: Number(usosCliente || 0) > 0,
  };
}
