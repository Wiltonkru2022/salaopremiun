import { getUser } from "@/lib/auth/get-user";
import { getResumoAssinatura } from "@/lib/assinatura-utils";
import {
  buildShellNotifications,
  formatDateKey,
  type AgendamentoNotificacao,
  type CaixaMovimentoNotificacao,
  type ClienteNascimento,
  type TicketNotificacao,
} from "@/lib/notifications/shell-notifications";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const supabaseAdmin = getSupabaseAdmin();
  const user = await getUser();

  if (!user) {
    return Response.json({ notifications: [] }, { status: 401 });
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id_salao, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!usuario?.id_salao || usuario.status !== "ativo") {
    return Response.json({ notifications: [] });
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
  ] = await Promise.all([
    supabase
      .from("assinaturas")
      .select("status, vencimento_em, trial_fim_em")
      .eq("id_salao", usuario.id_salao)
      .maybeSingle(),

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
  ]);

  const resumoAssinatura = assinatura
    ? getResumoAssinatura({
        status: assinatura.status,
        vencimentoEm: assinatura.vencimento_em,
        trialFimEm: assinatura.trial_fim_em,
      })
    : null;

  const notifications = buildShellNotifications({
    resumoAssinatura,
    clientes: (clientesNotificacao as ClienteNascimento[]) || [],
    agendamentos:
      (agendamentosNotificacao as AgendamentoNotificacao[]) || [],
    movimentosCaixa:
      (movimentosCaixaNotificacao as CaixaMovimentoNotificacao[]) || [],
    tickets: (ticketsNotificacao as TicketNotificacao[]) || [],
  });

  return Response.json({ notifications });
}
