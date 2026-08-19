import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ensureClienteContaVinculadaAoSalao } from "@/app/services/cliente-app/auth";

function normalizeToken(value: string) { return String(value || "").trim(); }
function todayIso() { return new Date().toISOString().slice(0, 10); }

async function resolveCouponToken(token: string) {
  const supabase = getSupabaseAdmin() as any;
  const { data: invite } = await supabase
    .from("cupom_salao_resgates")
    .select("id,id_cupom,id_salao,id_cliente,cliente_app_conta_id,token,status")
    .eq("token", token)
    .limit(1)
    .maybeSingle();

  if (invite?.id_cupom) {
    const { data: cupom } = await supabase
      .from("cupons_salao")
      .select("id,id_salao,codigo,nome,descricao,tipo_desconto,valor_desconto,titulo_push,mensagem_push,valido_de,valido_ate,ativo,resgate_token,push_delay_minutos,limite_uso_total,limite_uso_cliente,requer_resgate,publico_tipo,saloes(id,nome,nome_fantasia,app_cliente_slug)")
      .eq("id", invite.id_cupom)
      .eq("id_salao", invite.id_salao)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();
    return cupom?.id ? { cupom, invite, privateInvite: true as const } : null;
  }

  const { data: cupom } = await supabase
    .from("cupons_salao")
    .select("id,id_salao,codigo,nome,descricao,tipo_desconto,valor_desconto,titulo_push,mensagem_push,valido_de,valido_ate,ativo,resgate_token,push_delay_minutos,limite_uso_total,limite_uso_cliente,requer_resgate,publico_tipo,saloes(id,nome,nome_fantasia,app_cliente_slug)")
    .eq("resgate_token", token)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();
  return cupom?.id ? { cupom, invite: null, privateInvite: false as const } : null;
}

export async function redeemClienteCoupon(params: { token: string; idConta: string }) {
  const token = normalizeToken(params.token);
  const idConta = String(params.idConta || "").trim();
  if (!token || !idConta) return { ok: false as const, error: "Não foi possível identificar o cupom." };

  const supabase = getSupabaseAdmin() as any;
  const resolved = await resolveCouponToken(token);
  if (!resolved?.cupom?.id) return { ok: false as const, error: "Cupom não encontrado ou inativo." };
  const { cupom, invite, privateInvite } = resolved;
  const hoje = todayIso();
  if (cupom.valido_de && String(cupom.valido_de) > hoje) return { ok: false as const, error: "Este cupom ainda não está válido." };
  if (cupom.valido_ate && String(cupom.valido_ate) < hoje) return { ok: false as const, error: "Este cupom expirou." };

  const idSalao = String(cupom.id_salao || "").trim();
  const vinculo = await ensureClienteContaVinculadaAoSalao({ idConta, idSalao });
  if (!vinculo.ok) return vinculo;

  if (privateInvite) {
    if (!invite?.id_cliente || String(invite.id_cliente) !== String(vinculo.idCliente)) {
      return { ok: false as const, error: "Este link de cupom pertence a outra cliente." };
    }
    if (invite.cliente_app_conta_id && String(invite.cliente_app_conta_id) !== idConta) {
      return { ok: false as const, error: "Este cupom já foi vinculado a outra conta." };
    }
  }

  const [{ count: usosCliente }, { count: usosTotal }, { data: resgateConta }] = await Promise.all([
    supabase.from("cupom_salao_usos").select("id", { count: "exact", head: true }).eq("id_cupom", cupom.id).eq("cliente_app_conta_id", idConta),
    supabase.from("cupom_salao_usos").select("id", { count: "exact", head: true }).eq("id_cupom", cupom.id),
    supabase.from("cupom_salao_resgates").select("id,status").eq("id_cupom", cupom.id).eq("cliente_app_conta_id", idConta).limit(1).maybeSingle(),
  ]);

  const limiteCliente = Number(cupom.limite_uso_cliente || 1);
  const limiteTotal = Number(cupom.limite_uso_total || 0);
  if (Number(usosCliente || 0) >= limiteCliente) return { ok: false as const, error: "Você já usou este cupom." };
  if (limiteTotal > 0 && Number(usosTotal || 0) >= limiteTotal) return { ok: false as const, error: "O limite de usos deste cupom foi atingido." };

  const now = new Date().toISOString();
  const resgatePayload = {
    id_salao: idSalao,
    id_cupom: cupom.id,
    cliente_app_conta_id: idConta,
    id_cliente: vinculo.idCliente,
    token,
    status: "resgatado",
    resgatado_em: now,
    metadata: { origem: privateInvite ? "link_whatsapp_privado" : "link_whatsapp_manual", privado: privateInvite },
    updated_at: now,
  };

  let resgateError = null;
  if (privateInvite && invite?.id) {
    const result = await supabase.from("cupom_salao_resgates").update(resgatePayload).eq("id", invite.id).eq("id_cliente", vinculo.idCliente);
    resgateError = result.error;
  } else if (resgateConta?.id) {
    const result = await supabase.from("cupom_salao_resgates").update(resgatePayload).eq("id", resgateConta.id);
    resgateError = result.error;
  } else {
    const result = await supabase.from("cupom_salao_resgates").insert(resgatePayload);
    resgateError = result.error;
  }
  if (resgateError) return { ok: false as const, error: "Não foi possível resgatar o cupom agora." };

  const salaoRel = Array.isArray(cupom.saloes) ? cupom.saloes[0] : cupom.saloes;
  const salaoSlug = String(salaoRel?.app_cliente_slug || idSalao).trim();
  const codigoCupom = String(cupom.codigo || "").trim();
  try {
    await supabase.from("campanha_eventos").insert({ id_salao: idSalao, id_cupom: cupom.id, cliente_app_conta_id: idConta, id_cliente: vinculo.idCliente, tipo: "resgate", metadata: { origem: privateInvite ? "link_whatsapp_privado" : "link_whatsapp_manual", codigo: codigoCupom } });
  } catch {}

  return { ok: true as const, cupom: { codigo: codigoCupom, nome: String(cupom.nome || "").trim(), idSalao, salaoSlug } };
}

export async function loadCouponByToken(tokenValue: string) {
  const token = normalizeToken(tokenValue);
  if (!token) return null;
  const resolved = await resolveCouponToken(token);
  return resolved?.cupom || null;
}

export async function loadCouponRedemptionForAccount(params: { idCupom?: string | null; idConta?: string | null }) {
  const idCupom = String(params.idCupom || "").trim();
  const idConta = String(params.idConta || "").trim();
  if (!idCupom || !idConta) return null;
  const supabase = getSupabaseAdmin() as any;
  const [{ data: resgate }, { count: usosCliente }] = await Promise.all([
    supabase.from("cupom_salao_resgates").select("id,status").eq("id_cupom", idCupom).eq("cliente_app_conta_id", idConta).in("status", ["resgatado", "usado"]).limit(1).maybeSingle(),
    supabase.from("cupom_salao_usos").select("id", { count: "exact", head: true }).eq("id_cupom", idCupom).eq("cliente_app_conta_id", idConta),
  ]);
  if (!resgate?.id && Number(usosCliente || 0) <= 0) return null;
  return { status: String(resgate?.status || "").trim() || "resgatado", jaUsou: Number(usosCliente || 0) > 0 };
}
