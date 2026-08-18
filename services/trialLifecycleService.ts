import "server-only";

import { htmlEscape, sendResendEmail } from "@/lib/email/resend";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type TrialAlertType = "3d" | "1d" | "today" | "expired" | "manual";

type SendTrialAlertParams = {
  idSalao: string;
  type?: string | null;
  markSent?: boolean;
};

type ExtendTrialParams = {
  idSalao: string;
  days: number;
  reason?: string | null;
  currentTrialEndsAt?: string | null;
  requestedBy?: string | null;
};

type TrialSubscriptionRow = {
  id_salao: string;
  trial_fim_em?: string | null;
  email_trial_3d_sent_at?: string | null;
  email_trial_1d_sent_at?: string | null;
  email_trial_today_sent_at?: string | null;
  email_trial_expired_sent_at?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeAlertType(value?: string | null): TrialAlertType {
  const normalized = String(value || "manual").trim().toLowerCase();
  if (["3d", "3dias", "3_days"].includes(normalized)) return "3d";
  if (["1d", "1dia", "1_day"].includes(normalized)) return "1d";
  if (["today", "hoje", "0d"].includes(normalized)) return "today";
  if (["expired", "vencido", "expirado"].includes(normalized)) return "expired";
  return "manual";
}

function markerForType(type: TrialAlertType) {
  if (type === "3d") return "email_trial_3d_sent_at";
  if (type === "1d") return "email_trial_1d_sent_at";
  if (type === "today") return "email_trial_today_sent_at";
  if (type === "expired") return "email_trial_expired_sent_at";
  return null;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function dayDifference(value?: string | null) {
  const date = parseDate(value);
  if (!date) return null;

  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const endKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const today = new Date(`${todayKey}T12:00:00Z`).getTime();
  const end = new Date(`${endKey}T12:00:00Z`).getTime();
  return Math.round((end - today) / DAY_MS);
}

function alertCopy(type: TrialAlertType, nomeSalao: string, trialFimEm?: string | null) {
  const fim = formatDate(trialFimEm);

  if (type === "expired") {
    return {
      subject: `Seu teste do SalãoPremium terminou — ${nomeSalao}`,
      title: "Seu teste grátis terminou",
      intro: `O período de teste do ${nomeSalao} terminou em ${fim}.`,
      action: "Escolha um plano para continuar usando agenda, clientes, caixa, comandas e notificações sem perder o fluxo do salão.",
    };
  }

  if (type === "today") {
    return {
      subject: `Seu teste do SalãoPremium termina hoje — ${nomeSalao}`,
      title: "Seu teste termina hoje",
      intro: `O período de teste do ${nomeSalao} termina hoje (${fim}).`,
      action: "Você pode ativar um plano agora para manter o acesso contínuo aos recursos do SalãoPremium.",
    };
  }

  if (type === "1d") {
    return {
      subject: `Falta 1 dia para o fim do seu teste — ${nomeSalao}`,
      title: "Falta 1 dia para o fim do teste",
      intro: `O período de teste do ${nomeSalao} termina em ${fim}.`,
      action: "Revise os planos disponíveis e mantenha o salão funcionando normalmente após o período gratuito.",
    };
  }

  if (type === "3d") {
    return {
      subject: `Faltam poucos dias para o fim do seu teste — ${nomeSalao}`,
      title: "Seu teste está chegando ao fim",
      intro: `O período de teste do ${nomeSalao} termina em ${fim}.`,
      action: "Aproveite estes últimos dias para concluir seus testes e escolher o plano ideal para continuar.",
    };
  }

  return {
    subject: `Informações sobre seu teste do SalãoPremium — ${nomeSalao}`,
    title: "Seu período de teste no SalãoPremium",
    intro: `O teste grátis do ${nomeSalao} está disponível até ${fim}.`,
    action: "Se precisar de ajuda para continuar, escolher um plano ou entender algum recurso, fale com nosso suporte.",
  };
}

function buildTrialEmailHtml(params: {
  responsavel: string;
  nomeSalao: string;
  type: TrialAlertType;
  trialFimEm?: string | null;
}) {
  const copy = alertCopy(params.type, params.nomeSalao, params.trialFimEm);
  const responsavel = htmlEscape(params.responsavel || "Olá");
  const nomeSalao = htmlEscape(params.nomeSalao);
  const title = htmlEscape(copy.title);
  const intro = htmlEscape(copy.intro);
  const action = htmlEscape(copy.action);
  const painelUrl = htmlEscape(
    process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://salaopremiun.com.br"
  );

  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:32px;color:#0f172a">
      <div style="max-width:640px;margin:0 auto;overflow:hidden;border:1px solid #e2e8f0;border-radius:22px;background:#fff">
        <div style="background:#0f172a;padding:28px 30px;color:#fff">
          <p style="margin:0 0 10px;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#facc15">SalãoPremium</p>
          <h1 style="margin:0;font-size:30px;line-height:1.18">${title}</h1>
        </div>
        <div style="padding:28px 30px">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155">Olá, ${responsavel}.</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155">${intro}</p>
          <div style="border:1px solid #fde68a;background:#fffbeb;border-radius:18px;padding:16px 18px">
            <strong style="display:block;color:#92400e">${nomeSalao}</strong>
            <p style="margin:8px 0 0;font-size:14px;line-height:1.7;color:#92400e">${action}</p>
          </div>
          <div style="margin-top:24px">
            <a href="${painelUrl}" style="display:inline-block;border-radius:999px;background:#0f172a;padding:13px 20px;color:#fff;text-decoration:none;font-size:14px;font-weight:800">Acessar SalãoPremium</a>
          </div>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#64748b">Se precisar de ajuda, responda este e-mail ou fale com o suporte.</p>
        </div>
      </div>
    </div>
  `;
}

async function loadTrialContext(idSalao: string) {
  const supabase = getSupabaseAdmin();
  const [{ data: salao, error: salaoError }, { data: assinatura, error: assinaturaError }] =
    await Promise.all([
      (supabase as any)
        .from("saloes")
        .select("id, nome, nome_fantasia, responsavel, email, trial_fim_em")
        .eq("id", idSalao)
        .maybeSingle(),
      (supabase as any)
        .from("assinaturas")
        .select(
          "id_salao, trial_fim_em, email_trial_3d_sent_at, email_trial_1d_sent_at, email_trial_today_sent_at, email_trial_expired_sent_at"
        )
        .eq("id_salao", idSalao)
        .maybeSingle(),
    ]);

  if (salaoError) throw new Error(salaoError.message);
  if (assinaturaError) throw new Error(assinaturaError.message);
  if (!salao?.id) throw new Error("Salão não encontrado para envio de trial.");

  return {
    salao,
    assinatura: (assinatura || null) as TrialSubscriptionRow | null,
    trialFimEm: String(assinatura?.trial_fim_em || salao.trial_fim_em || "") || null,
  };
}

export async function sendTrialAlertNow(params: SendTrialAlertParams) {
  const type = normalizeAlertType(params.type);
  const context = await loadTrialContext(params.idSalao);
  const email = String(context.salao.email || "").trim().toLowerCase();
  const nomeSalao = String(
    context.salao.nome_fantasia || context.salao.nome || "Seu salão"
  ).trim();
  const responsavel = String(context.salao.responsavel || nomeSalao).trim();

  if (!email || !email.includes("@")) {
    throw new Error("Salão sem e-mail válido para aviso de trial.");
  }

  const copy = alertCopy(type, nomeSalao, context.trialFimEm);
  const emailId = await sendResendEmail({
    from:
      process.env.TRIAL_EMAIL_FROM ||
      process.env.CADASTRO_SALAO_EMAIL_FROM ||
      "SalãoPremium <contato@salaopremiun.com.br>",
    to: email,
    subject: copy.subject,
    html: buildTrialEmailHtml({
      responsavel,
      nomeSalao,
      type,
      trialFimEm: context.trialFimEm,
    }),
    text: [
      `Olá, ${responsavel}.`,
      copy.intro,
      copy.action,
      "Acesse: https://salaopremiun.com.br",
    ].join("\n\n"),
    replyTo:
      process.env.TRIAL_EMAIL_REPLY_TO ||
      process.env.CADASTRO_SALAO_EMAIL_REPLY_TO ||
      undefined,
    idempotencyKey:
      type === "manual"
        ? `trial-manual-${params.idSalao}-${Date.now()}`
        : `trial-${type}-${params.idSalao}-${String(context.trialFimEm || "sem-data")}`,
  });

  const sentAt = new Date().toISOString();
  const marker = markerForType(type);
  if (params.markSent && marker) {
    const { error } = await (getSupabaseAdmin() as any)
      .from("assinaturas")
      .update({ [marker]: sentAt, updated_at: sentAt })
      .eq("id_salao", params.idSalao);
    if (error) throw new Error(error.message);
  }

  return {
    ok: true,
    provider: "vercel-resend" as const,
    type,
    emailId,
    sentAt,
  };
}

function choosePendingAlert(row: TrialSubscriptionRow): TrialAlertType | null {
  const days = dayDifference(row.trial_fim_em);
  if (days === null) return null;
  if (days < 0 && !row.email_trial_expired_sent_at) return "expired";
  if (days === 0 && !row.email_trial_today_sent_at) return "today";
  if (days === 1 && !row.email_trial_1d_sent_at) return "1d";
  if (days >= 2 && days <= 3 && !row.email_trial_3d_sent_at) return "3d";
  return null;
}

export async function processTrialAlerts(limit = 80) {
  const { data, error } = await (getSupabaseAdmin() as any)
    .from("assinaturas")
    .select(
      "id_salao, trial_fim_em, email_trial_3d_sent_at, email_trial_1d_sent_at, email_trial_today_sent_at, email_trial_expired_sent_at"
    )
    .eq("trial_ativo", "true")
    .not("trial_fim_em", "is", null)
    .limit(Math.min(Math.max(limit, 1), 200));

  if (error) throw new Error(error.message);

  const rows = (data || []) as TrialSubscriptionRow[];
  let sent = 0;
  let skipped = 0;
  const errors: Array<{ idSalao: string; error: string }> = [];

  for (const row of rows) {
    const type = choosePendingAlert(row);
    if (!type) {
      skipped += 1;
      continue;
    }

    try {
      await sendTrialAlertNow({
        idSalao: row.id_salao,
        type,
        markSent: true,
      });
      sent += 1;
    } catch (sendError) {
      errors.push({
        idSalao: row.id_salao,
        error:
          sendError instanceof Error
            ? sendError.message
            : "Falha desconhecida ao enviar aviso de trial.",
      });
    }
  }

  return {
    ok: errors.length === 0,
    provider: "vercel-supabase" as const,
    scanned: rows.length,
    sent,
    skipped,
    errors,
  };
}

export async function extendTrial(params: ExtendTrialParams) {
  const days = Math.min(Math.max(Math.trunc(Number(params.days || 0)), 1), 30);
  const context = await loadTrialContext(params.idSalao);
  const currentEnd =
    parseDate(context.trialFimEm) || parseDate(params.currentTrialEndsAt) || new Date();
  const base = Math.max(Date.now(), currentEnd.getTime());
  const newEnd = new Date(base + days * DAY_MS).toISOString();
  const now = new Date().toISOString();
  const supabase = getSupabaseAdmin();

  const [{ error: assinaturaError }, { error: salaoError }, { error: assinaturaSalaoError }] =
    await Promise.all([
      (supabase as any)
        .from("assinaturas")
        .update({
          trial_ativo: "true",
          trial_fim_em: newEnd,
          email_trial_3d_sent_at: null,
          email_trial_1d_sent_at: null,
          email_trial_today_sent_at: null,
          email_trial_expired_sent_at: null,
          updated_at: now,
        })
        .eq("id_salao", params.idSalao),
      (supabase as any)
        .from("saloes")
        .update({
          trial_ativo: true,
          trial_fim_em: newEnd,
          updated_at: now,
        })
        .eq("id", params.idSalao),
      (supabase as any)
        .from("assinaturas_saloes")
        .update({
          trial_ativo: true,
          trial_fim_em: newEnd,
          updated_at: now,
        })
        .eq("id_salao", params.idSalao),
    ]);

  if (assinaturaError) throw new Error(assinaturaError.message);
  if (salaoError) throw new Error(salaoError.message);
  if (assinaturaSalaoError) throw new Error(assinaturaSalaoError.message);

  const reason =
    String(params.reason || "").trim() ||
    `Trial prorrogado manualmente por ${days} dia(s).`;

  const { error: historyError } = await (supabase as any)
    .from("trial_extensoes_automaticas")
    .insert({
      id_salao: params.idSalao,
      trial_original_fim: context.trialFimEm || currentEnd.toISOString(),
      trial_novo_fim: newEnd,
      score_atingido: null,
      motivo: params.requestedBy
        ? `${reason} Admin: ${params.requestedBy}.`
        : reason,
      aplicado_automaticamente: false,
      criado_em: now,
    });

  if (historyError) throw new Error(historyError.message);

  return {
    ok: true,
    provider: "supabase" as const,
    days,
    previousTrialEndsAt: context.trialFimEm,
    trialEndsAt: newEnd,
  };
}
