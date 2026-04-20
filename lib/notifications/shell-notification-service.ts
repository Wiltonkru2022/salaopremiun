import { getUser } from "@/lib/auth/get-user";
import { getResumoAssinatura } from "@/lib/assinatura-utils";
import type {
  AgendamentoNotificacao,
  CaixaMovimentoNotificacao,
  ClienteNascimento,
  EstoqueAlertaNotificacao,
  OnboardingScoreNotificacao,
  ShellNotificationsResponse,
  SistemaAlertaNotificacao,
  TicketNotificacao,
} from "@/lib/notifications/contracts";
import {
  buildShellNotifications,
  formatDateKey,
} from "@/lib/notifications/shell-notifications";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type UsuarioSalaoRow = {
  id_salao?: string | null;
  status?: string | null;
};

type AssinaturaRow = {
  status?: string | null;
  vencimento_em?: string | null;
  trial_fim_em?: string | null;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function loadShellNotifications(): Promise<ShellNotificationsResponse> {
  const supabase = await createClient();
  const supabaseAdmin = getSupabaseAdmin();
  const user = await getUser();

  if (!user) {
    return { notifications: [] };
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id_salao, status")
    .eq("auth_user_id", user.id)
    .maybeSingle<UsuarioSalaoRow>();

  if (!usuario?.id_salao || usuario.status !== "ativo") {
    return { notifications: [] };
  }

  const agora = new Date();
  const hoje = formatDateKey(agora);
  const inicioHoje = new Date(agora);
  inicioHoje.setHours(0, 0, 0, 0);

  const [
    { data: assinatura },
    { data: clientesNotificacao },
    { data: agendamentosNotificacao },
    { data: movimentosCaixaNotificacao },
    { data: ticketsNotificacao },
    { data: estoqueAlertasNotificacao },
    { data: alertasSistemaNotificacao },
    { data: onboardingNotificacao },
  ] = await Promise.all([
    supabase
      .from("assinaturas")
      .select("status, vencimento_em, trial_fim_em")
      .eq("id_salao", usuario.id_salao)
      .maybeSingle<AssinaturaRow>(),
    supabase
      .from("clientes")
      .select("id, nome, data_nascimento")
      .eq("id_salao", usuario.id_salao)
      .not("data_nascimento", "is", null)
      .limit(500),
    supabase
      .from("agendamentos")
      .select("id, status, data, hora_inicio")
      .eq("id_salao", usuario.id_salao)
      .eq("data", hoje)
      .order("hora_inicio", { ascending: true })
      .limit(40),
    supabase
      .from("caixa_movimentacoes")
      .select("id, tipo, valor, created_at")
      .eq("id_salao", usuario.id_salao)
      .in("tipo", ["sangria", "vale_profissional"])
      .gte("created_at", inicioHoje.toISOString())
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("tickets")
      .select("id, numero, assunto, prioridade, status, ultima_interacao_em")
      .eq("id_salao", usuario.id_salao)
      .in("status", ["aberto", "em_atendimento", "aguardando_cliente", "aguardando_tecnico"])
      .order("ultima_interacao_em", { ascending: false })
      .limit(10),
    supabase
      .from("produtos_alertas")
      .select("id, tipo, mensagem")
      .eq("id_salao", usuario.id_salao)
      .eq("resolvido", false)
      .order("created_at", { ascending: false })
      .limit(8),
    supabaseAdmin
      .from("alertas_sistema")
      .select("id, tipo, gravidade, origem_modulo, titulo, descricao, updated_at, criado_em")
      .eq("id_salao", usuario.id_salao)
      .eq("resolvido", false)
      .order("criado_em", { ascending: false })
      .limit(8),
    supabaseAdmin
      .from("score_onboarding_salao")
      .select("score_total, dias_com_acesso, modulos_usados, detalhes_json")
      .eq("id_salao", usuario.id_salao)
      .maybeSingle(),
  ]);

  const resumoAssinatura = assinatura
    ? getResumoAssinatura({
        status: assinatura.status,
        vencimentoEm: assinatura.vencimento_em,
        trialFimEm: assinatura.trial_fim_em,
      })
    : null;

  return {
    notifications: buildShellNotifications({
      resumoAssinatura,
      clientes: asArray<ClienteNascimento>(clientesNotificacao),
      agendamentos: asArray<AgendamentoNotificacao>(agendamentosNotificacao),
      movimentosCaixa: asArray<CaixaMovimentoNotificacao>(movimentosCaixaNotificacao),
      estoqueAlertas: asArray<EstoqueAlertaNotificacao>(estoqueAlertasNotificacao),
      alertasSistema: asArray<SistemaAlertaNotificacao>(alertasSistemaNotificacao),
      onboarding: (onboardingNotificacao as OnboardingScoreNotificacao | null) || null,
      tickets: asArray<TicketNotificacao>(ticketsNotificacao),
    }),
  };
}
