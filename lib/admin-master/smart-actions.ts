import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AdminMasterSmartAction = {
  priority: "Crítico" | "Importante" | "Oportunidade";
  title: string;
  detail: string;
  href: string;
  cta: string;
  tone: string;
};

function money(value: unknown) {
  const parsed = Number(value || 0);
  return parsed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function getAdminMasterSmartActions(): Promise<AdminMasterSmartAction[]> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const nowIso = now.toISOString();
  const today = nowIso.slice(0, 10);
  const trialSoon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const [ticketResult, failedCheckoutResult, overdueChargeResult, riskAlertResult, trialResult] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, id_salao, numero, assunto, sla_limite_em")
      .neq("origem", "app_profissional_login")
      .in("status", ["aberto", "em_atendimento", "aguardando_cliente", "aguardando_tecnico"])
      .lt("sla_limite_em", nowIso)
      .order("sla_limite_em", { ascending: true })
      .limit(1),
    supabase
      .from("assinatura_checkout_locks")
      .select("id, id_salao, plano_codigo, valor, erro_texto, created_at")
      .eq("status", "erro")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("assinaturas_cobrancas")
      .select("id, id_salao, referencia, valor, status, data_expiracao")
      .in("status", ["pending", "pendente", "aguardando_pagamento"])
      .lt("data_expiracao", today)
      .order("data_expiracao", { ascending: true })
      .limit(1),
    supabase
      .from("alertas_sistema")
      .select("id, id_salao, titulo, descricao, gravidade, tipo, atualizado_em")
      .eq("resolvido", false)
      .in("gravidade", ["critica", "alta"])
      .not("id_salao", "is", null)
      .order("atualizado_em", { ascending: false })
      .limit(1),
    supabase
      .from("assinaturas")
      .select("id, id_salao, plano, status, trial_fim_em")
      .in("status", ["teste_gratis", "trial"])
      .not("trial_fim_em", "is", null)
      .gte("trial_fim_em", nowIso)
      .lte("trial_fim_em", trialSoon)
      .order("trial_fim_em", { ascending: true })
      .limit(1),
  ]);

  const ticket = ticketResult.data?.[0];
  const failedCheckout = failedCheckoutResult.data?.[0];
  const overdueCharge = overdueChargeResult.data?.[0];
  const riskAlert = riskAlertResult.data?.[0];
  const trial = trialResult.data?.[0];
  const salonIds = Array.from(new Set([
    ticket?.id_salao,
    failedCheckout?.id_salao,
    overdueCharge?.id_salao,
    riskAlert?.id_salao,
    trial?.id_salao,
  ].filter(Boolean))) as string[];

  const { data: saloes } = salonIds.length
    ? await supabase.from("saloes").select("id, nome").in("id", salonIds).limit(salonIds.length)
    : { data: [] as Array<{ id: string; nome?: string | null }> };
  const salonById = new Map(((saloes || []) as Array<{ id: string; nome?: string | null }>).map((item) => [item.id, item.nome || "Salão"]));
  const salonName = (id?: string | null) => (id ? salonById.get(id) || "Salão" : "Salão");

  const actions: AdminMasterSmartAction[] = [];

  if (ticket?.id) {
    actions.push({
      priority: "Crítico",
      title: `Responder ticket #${ticket.numero || "-"} com SLA vencido`,
      detail: `${salonName(ticket.id_salao)} · ${ticket.assunto || "Atendimento aguardando resposta"}`,
      href: `/admin-master/tickets/${ticket.id}`,
      cta: "Responder ticket",
      tone: "border-rose-200 bg-rose-50 text-rose-800",
    });
  }

  if (failedCheckout?.id_salao) {
    actions.push({
      priority: "Crítico",
      title: `Revisar cobrança falhada de ${salonName(failedCheckout.id_salao)}`,
      detail: `${failedCheckout.plano_codigo || "Plano"} · ${money(failedCheckout.valor)}${failedCheckout.erro_texto ? ` · ${String(failedCheckout.erro_texto).slice(0, 90)}` : ""}`,
      href: `/admin-master/saloes/${failedCheckout.id_salao}?tab=assinatura`,
      cta: "Ver cobrança",
      tone: "border-rose-200 bg-rose-50 text-rose-800",
    });
  }

  if (overdueCharge?.id_salao) {
    actions.push({
      priority: "Importante",
      title: `Cobrar ${salonName(overdueCharge.id_salao)}`,
      detail: `${overdueCharge.referencia || "Cobrança"} vencida · ${money(overdueCharge.valor)}`,
      href: `/admin-master/saloes/${overdueCharge.id_salao}?tab=assinatura`,
      cta: "Cobrar inadimplente",
      tone: "border-amber-200 bg-amber-50 text-amber-800",
    });
  }

  if (riskAlert?.id_salao) {
    actions.push({
      priority: riskAlert.gravidade === "critica" ? "Crítico" : "Importante",
      title: `Abrir salão com risco: ${salonName(riskAlert.id_salao)}`,
      detail: riskAlert.titulo || riskAlert.descricao || "Alerta operacional exige revisão.",
      href: `/admin-master/saloes/${riskAlert.id_salao}`,
      cta: "Abrir salão",
      tone: riskAlert.gravidade === "critica" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800",
    });
  }

  if (trial?.id_salao) {
    const end = trial.trial_fim_em ? new Date(trial.trial_fim_em).toLocaleDateString("pt-BR") : "em breve";
    actions.push({
      priority: "Oportunidade",
      title: `Trial de ${salonName(trial.id_salao)} vence em breve`,
      detail: `Período de teste termina em ${end}. Antecipe o contato para aumentar a conversão.`,
      href: `/admin-master/saloes/${trial.id_salao}?tab=assinatura`,
      cta: "Ver trial",
      tone: "border-blue-200 bg-blue-50 text-blue-800",
    });
  }

  return actions.slice(0, 5);
}
