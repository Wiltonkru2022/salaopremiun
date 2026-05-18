import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { buildLoginRedirectUrl } from "@/lib/auth/login-redirect";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buildPermissoesByNivel,
  sanitizePermissoesDb,
} from "@/lib/auth/permissions";
import { getResumoAssinatura } from "@/lib/assinatura-utils";
import { buildShellNotifications } from "@/lib/notifications/shell-notifications";
import { getPlanoAccessSnapshot } from "@/lib/plans/access";
import { getPlanoCatalogo } from "@/lib/plans/catalog";
import { PERMISSIONS } from "@/lib/permissions";
import {
  getSecurityAccessDecision,
  getSecurityStatusMessage,
} from "@/lib/security/user-security";

type PermissoesDbRow = Record<string, boolean | string | null>;

const permissionsSelect = ["id_usuario", "id_salao", ...Object.keys(PERMISSIONS)].join(", ");

const loadPainelShellContextCached = unstable_cache(
  async (authUserId: string) => {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: usuario, error: usuarioError } = await supabaseAdmin
      .from("usuarios")
      .select("id, id_salao, nivel, status")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (usuarioError) {
      return {
        ok: false as const,
        error: usuarioError.message || "Erro ao carregar usuario do sistema.",
      };
    }

    if (!usuario?.id || !usuario.id_salao) {
      return {
        ok: false as const,
        error: "Erro ao carregar usuario do sistema.",
      };
    }

    const securityDecision = await getSecurityAccessDecision({
      tipoUsuario: "salao",
      userId: usuario.id,
      idSalao: usuario.id_salao,
    });

    if (!securityDecision.allowed) {
      return {
        ok: false as const,
        error: getSecurityStatusMessage({
          status: securityDecision.status,
          motivo: securityDecision.motivo,
          bloqueadoAte: securityDecision.bloqueadoAte,
        }),
        redirectPath: securityDecision.redirectPath,
      };
    }

    const [
      { data: permissoes },
      { data: salao },
      { data: assinatura },
      { data: agendamentosPendentes },
      planoAccess,
    ] =
      await Promise.all([
        supabaseAdmin
          .from("usuarios_permissoes")
          .select(permissionsSelect)
          .eq("id_usuario", usuario.id)
          .eq("id_salao", usuario.id_salao)
          .maybeSingle(),
        supabaseAdmin
          .from("saloes")
          .select("nome, responsavel, logo_url, plano, status")
          .eq("id", usuario.id_salao)
          .maybeSingle(),
        supabaseAdmin
          .from("assinaturas")
          .select("status, plano, vencimento_em, trial_fim_em")
          .eq("id_salao", usuario.id_salao)
          .limit(1)
          .maybeSingle(),
        (supabaseAdmin as any)
          .from("agendamentos")
          .select("id, status, data, hora_inicio, origem, cliente_id, codigo_cupom, id_cupom_salao, desconto_cupom_valor, clientes(nome), servicos(nome)")
          .eq("id_salao", usuario.id_salao)
          .in("status", ["pendente", "confirmado"])
          .eq("origem", "app_cliente")
          .order("data", { ascending: true })
          .order("hora_inicio", { ascending: true })
          .limit(12),
        getPlanoAccessSnapshot(usuario.id_salao),
      ]);

    const { data: notificacoesOperacionais } = await (supabaseAdmin as any)
      .from("notification_jobs")
      .select("id, tipo, titulo, mensagem, url, status, enviar_em, created_at")
      .eq("id_salao", usuario.id_salao)
      .eq("canal", "salao_painel")
      .in("status", ["pendente", "enviada"])
      .order("created_at", { ascending: false })
      .limit(8);

    const permissoesPadrao = buildPermissoesByNivel(usuario.nivel);
    const permissoesDb = sanitizePermissoesDb(
      (permissoes as PermissoesDbRow | null) ?? null,
      {
        idSalao: usuario.id_salao,
        idUsuario: usuario.id,
        origem: "loadPainelShellData",
      }
    );

    const permissoesFinal = {
      ...permissoesPadrao,
      ...permissoesDb,
      perfil_salao_ver:
        usuario.nivel === "admin" &&
        (permissoesDb.perfil_salao_ver ?? permissoesPadrao.perfil_salao_ver),
      configuracoes_ver:
        usuario.nivel === "admin" &&
        (permissoesDb.configuracoes_ver ?? permissoesPadrao.configuracoes_ver),
      assinatura_ver:
        usuario.nivel === "admin" &&
        (permissoesDb.assinatura_ver ?? permissoesPadrao.assinatura_ver),
    };

    const resumoAssinatura = assinatura?.status
      ? getResumoAssinatura({
          status: assinatura.status,
          vencimentoEm: assinatura.vencimento_em,
          trialFimEm: assinatura.trial_fim_em,
        })
      : null;

    const notifications = buildShellNotifications({
      resumoAssinatura,
      clientes: [],
      agendamentos: ((agendamentosPendentes || []) as Array<Record<string, any>>).map(
        (agendamento) => {
          const cliente = Array.isArray(agendamento.clientes)
            ? agendamento.clientes[0]
            : agendamento.clientes;
          const servico = Array.isArray(agendamento.servicos)
            ? agendamento.servicos[0]
            : agendamento.servicos;

          return {
            id: String(agendamento.id || ""),
            status: String(agendamento.status || ""),
            data: String(agendamento.data || ""),
            hora_inicio: String(agendamento.hora_inicio || ""),
            origem: String(agendamento.origem || ""),
            cliente_id: String(agendamento.cliente_id || ""),
            cliente_nome: String(cliente?.nome || "").trim() || null,
            servico_nome: String(servico?.nome || "").trim() || null,
            codigo_cupom: String(agendamento.codigo_cupom || "").trim() || null,
            id_cupom_salao: String(agendamento.id_cupom_salao || "").trim() || null,
            desconto_cupom_valor: agendamento.desconto_cupom_valor ?? null,
          };
        }
      ),
      movimentosCaixa: [],
      onboarding: null,
      tickets: [],
    });

    for (const item of ((notificacoesOperacionais || []) as Array<Record<string, unknown>>)) {
      const tipo = String(item.tipo || "");
      notifications.push({
        id: `notification-job-${String(item.id || "")}`,
        title: String(item.titulo || "Notificacao do salao"),
        description: String(item.mensagem || "Nova notificacao operacional."),
        tone: tipo === "avaliacao_ruim" ? "warning" : "info",
        category: tipo.includes("avaliacao") ? "agenda" : "sistema",
        severity: tipo === "avaliacao_ruim" ? "high" : "medium",
        eventType: tipo || "notification_job",
        href: String(item.url || "/dashboard"),
        actionLabel: tipo === "avaliacao_ruim" ? "Ver atendimento" : "Abrir",
        destination: "internal",
        icon: tipo.includes("avaliacao") ? "agenda" : "alert",
        sourceModule: "notification_jobs",
        sourceEntity: "notification_jobs",
        sourceEntityId: String(item.id || ""),
        expiresAt: item.enviar_em ? String(item.enviar_em) : null,
      });
    }

    const planoCatalogo = getPlanoCatalogo(planoAccess.planoCodigo);

    return {
      ok: true as const,
      data: {
        idSalao: usuario.id_salao,
        idUsuario: usuario.id,
        nivel: String(usuario.nivel || ""),
        status: String(usuario.status || ""),
        permissoes: permissoesFinal,
        salaoNome: salao?.nome || "SalãoPremium",
        salaoResponsavel: salao?.responsavel || null,
        salaoLogoUrl: salao?.logo_url || null,
        planoCodigo: planoAccess.planoCodigo,
        planoNome: planoCatalogo.nome,
        planoLimites: planoAccess.limites,
        planoUso: planoAccess.uso,
        assinaturaStatus: assinatura?.status || salao?.status || null,
        resumoAssinatura,
        planoRecursos: planoAccess.recursos,
        notifications,
      },
    };
  },
  ["painel-shell-context"],
  {
    revalidate: 60,
    tags: ["painel-shell-context"],
  }
);

export async function loadPainelShellData() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(buildLoginRedirectUrl("sessao_expirada"));
  }

  const userName =
    user.user_metadata?.nome || user.email?.split("@")[0] || "Usuario";

  const result = await loadPainelShellContextCached(user.id);

  if (!result.ok) {
    if ("redirectPath" in result && result.redirectPath) {
      redirect(result.redirectPath);
    }

    return result;
  }

  if (result.data.status !== "ativo") {
    redirect(buildLoginRedirectUrl("usuario_inativo"));
  }

  return {
    ok: true as const,
    data: {
      idSalao: result.data.idSalao,
      idUsuario: result.data.idUsuario,
      userName,
      userEmail: user.email || "",
      nivel: result.data.nivel,
      permissoes: result.data.permissoes,
      salaoNome: result.data.salaoNome,
      salaoResponsavel: result.data.salaoResponsavel || userName,
      salaoLogoUrl: result.data.salaoLogoUrl,
      planoCodigo: result.data.planoCodigo,
      planoNome: result.data.planoNome,
      planoLimites: result.data.planoLimites,
      planoUso: result.data.planoUso,
      assinaturaStatus: result.data.assinaturaStatus,
      resumoAssinatura: result.data.resumoAssinatura,
      planoRecursos: result.data.planoRecursos,
      notifications: result.data.notifications,
    },
  };
}
