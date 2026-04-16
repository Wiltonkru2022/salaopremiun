import { syncAdminMasterAlerts } from "@/lib/admin-master/alerts-sync";
import { getPlanoAccessSnapshot } from "@/lib/plans/access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  formatWebhookDate,
  formatWebhookDiagnosticDetail,
  syncAdminMasterWebhookEvents,
} from "@/lib/admin-master/webhooks-sync";
import { listAdminTickets } from "@/lib/support/tickets";

export type AdminKpi = {
  label: string;
  value: string;
  hint: string;
  tone?: "dark" | "green" | "amber" | "red" | "blue";
};

export type AdminTableRow = Record<string, string | number | boolean | null>;

export type AdminSectionData = {
  title: string;
  description: string;
  kpis: AdminKpi[];
  rows: AdminTableRow[];
  columns: string[];
  actions: string[];
};

export type AdminMasterAuditEntry = {
  id: string;
  acao: string;
  entidade: string;
  descricao: string;
  criadoEm: string;
};

export type AdminMasterShellData = {
  alertasCriticos: number;
  ticketsAbertos: number;
  auditoriaRecente: AdminMasterAuditEntry[];
};

type CountResult = {
  count: number | null;
  error: unknown;
};

function currency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dateValue(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function dateTimeValue(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function safeNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeCount(result: CountResult) {
  if (result.error) return 0;
  return result.count || 0;
}

async function countSaloesByStatus(status: string) {
  const supabase = getSupabaseAdmin();
  const result = await supabase
    .from("saloes")
    .select("id", { count: "exact", head: true })
    .eq("status", status);
  return safeCount(result);
}

export async function getAdminMasterShellData(): Promise<AdminMasterShellData> {
  const supabase = getSupabaseAdmin();

  const [{ count: alertasCriticos, error: alertasError }, { count: ticketsAbertos, error: ticketsError }, { data: auditoria }] =
    await Promise.all([
      supabase
        .from("alertas_sistema")
        .select("id", { count: "exact", head: true })
        .eq("resolvido", false)
        .in("gravidade", ["alta", "critica"]),
      supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .in("status", ["aberto", "em_atendimento", "aguardando_tecnico"]),
      supabase
        .from("admin_master_auditoria")
        .select("id, acao, entidade, descricao, criado_em")
        .order("criado_em", { ascending: false })
        .limit(6),
    ]);

  return {
    alertasCriticos: alertasError ? 0 : alertasCriticos || 0,
    ticketsAbertos: ticketsError ? 0 : ticketsAbertos || 0,
    auditoriaRecente: ((auditoria || []) as {
      id?: string | null;
      acao?: string | null;
      entidade?: string | null;
      descricao?: string | null;
      criado_em?: string | null;
    }[]).map((item) => ({
      id: String(item.id || `${item.acao || "audit"}-${item.criado_em || ""}`),
      acao: item.acao || "-",
      entidade: item.entidade || "-",
      descricao: item.descricao || "Sem descricao",
      criadoEm: dateTimeValue(item.criado_em),
    })),
  };
}

export async function getAdminMasterDashboard() {
  const supabase = getSupabaseAdmin();
  await syncAdminMasterAlerts();
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [
    totalSaloes,
    ativos,
    bloqueados,
    cancelados,
    saloesTrial,
    assinaturasAtivas,
    assinaturasVencidas,
    cobrancasMes,
    cobrancasVencidas,
    checkoutsProcessando,
    checkoutsFalhos,
    ticketsAbertos,
    alertasCriticos,
    planos,
    recentes,
  ] = await Promise.all([
    supabase.from("saloes").select("id", { count: "exact", head: true }),
    countSaloesByStatus("ativo"),
    countSaloesByStatus("bloqueado"),
    countSaloesByStatus("cancelado"),
    supabase
      .from("assinaturas")
      .select("id", { count: "exact", head: true })
      .in("status", ["teste_gratis", "trial"]),
    supabase
      .from("assinaturas")
      .select("id, valor")
      .in("status", ["ativo", "ativa", "pago"]),
    supabase
      .from("assinaturas")
      .select("id", { count: "exact", head: true })
      .in("status", ["vencida", "bloqueada", "cancelada"]),
    supabase
      .from("assinaturas_cobrancas")
      .select("valor, pago_em, payment_date, confirmed_date, status")
      .gte("created_at", inicioMes.toISOString()),
    supabase
      .from("assinaturas_cobrancas")
      .select("id", { count: "exact", head: true })
      .lt("data_expiracao", new Date().toISOString())
      .in("status", ["pending", "pendente", "aguardando_pagamento"]),
    supabase
      .from("assinatura_checkout_locks")
      .select("id", { count: "exact", head: true })
      .eq("status", "processando"),
    supabase
      .from("assinatura_checkout_locks")
      .select("id", { count: "exact", head: true })
      .in("status", ["erro", "expirado"]),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["aberto", "em_atendimento", "aguardando_tecnico"]),
    supabase
      .from("alertas_sistema")
      .select("id", { count: "exact", head: true })
      .eq("resolvido", false)
      .in("gravidade", ["alta", "critica"]),
    supabase
      .from("planos_saas")
      .select("codigo, nome, valor_mensal, destaque")
      .eq("ativo", true)
      .order("ordem", { ascending: true }),
    supabase
      .from("saloes")
      .select("id, nome, responsavel, email, plano, status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const assinaturasAtivasRows =
    (assinaturasAtivas.data as { valor?: number | string | null }[] | null) ||
    [];
  const cobrancasRows =
    (cobrancasMes.data as { valor?: number | string | null; status?: string | null }[] | null) ||
    [];
  const mrr = assinaturasAtivasRows.reduce(
    (acc, row) => acc + safeNumber(row.valor),
    0
  );
  const receitaMes = cobrancasRows
    .filter((row) =>
      ["received", "confirmed", "pago", "paid"].includes(
        String(row.status || "").toLowerCase()
      )
    )
    .reduce((acc, row) => acc + safeNumber(row.valor), 0);

  return {
    kpis: [
      {
        label: "Total de saloes",
        value: String(safeCount(totalSaloes)),
        hint: `${ativos} ativos, ${bloqueados} bloqueados`,
        tone: "dark",
      },
      {
        label: "Trials ativos",
        value: String(safeCount(saloesTrial)),
        hint: "Oportunidade de conversao",
        tone: "blue",
      },
      {
        label: "MRR atual",
        value: currency(mrr),
        hint: `${safeCount(assinaturasVencidas)} assinaturas em risco`,
        tone: "green",
      },
      {
        label: "Receita do mes",
        value: currency(receitaMes),
        hint: `${safeCount(cobrancasVencidas)} cobrancas vencidas`,
        tone: "amber",
      },
      {
        label: "Checkouts assinatura",
        value: String(safeCount(checkoutsProcessando)),
        hint: `${safeCount(checkoutsFalhos)} com erro/expirado`,
        tone: safeCount(checkoutsFalhos) > 0 ? "red" : "blue",
      },
      {
        label: "Tickets abertos",
        value: String(safeCount(ticketsAbertos)),
        hint: "Suporte pendente",
        tone: "red",
      },
      {
        label: "Alertas criticos",
        value: String(safeCount(alertasCriticos)),
        hint: "Operacao e webhooks",
        tone: "red",
      },
    ] satisfies AdminKpi[],
    planos: (planos.data || []) as AdminTableRow[],
    recentes: ((recentes.data || []) as {
      id: string;
      nome?: string | null;
      responsavel?: string | null;
      email?: string | null;
      plano?: string | null;
      status?: string | null;
      created_at?: string | null;
    }[]).map((row) => ({
      id: row.id,
      salao: row.nome || "-",
      responsavel: row.responsavel || "-",
      email: row.email || "-",
      plano: row.plano || "-",
      status: row.status || "-",
      criado: dateValue(row.created_at),
    })),
    cancelados,
  };
}

export async function getAdminMasterSaloes() {
  const supabase = getSupabaseAdmin();
  const [{ data: saloes }, { data: assinaturas }, { data: scores }] =
    await Promise.all([
      supabase
        .from("saloes")
        .select(
          "id, nome, responsavel, email, telefone, whatsapp, cidade, estado, plano, status, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("assinaturas")
        .select("id_salao, plano, status, vencimento_em, trial_fim_em"),
      supabase
        .from("score_onboarding_salao")
        .select("id_salao, score_total, atualizado_em"),
    ]);

  const assinaturaBySalao = new Map(
    ((assinaturas || []) as { id_salao: string }[]).map((item) => [
      item.id_salao,
      item,
    ])
  );
  const scoreBySalao = new Map(
    ((scores || []) as { id_salao: string }[]).map((item) => [
      item.id_salao,
      item,
    ])
  );

  return ((saloes || []) as {
    id: string;
    nome?: string | null;
    responsavel?: string | null;
    email?: string | null;
    telefone?: string | null;
    whatsapp?: string | null;
    cidade?: string | null;
    estado?: string | null;
    plano?: string | null;
    status?: string | null;
    created_at?: string | null;
  }[]).map((salao) => {
    const assinatura = assinaturaBySalao.get(salao.id) as
      | {
          plano?: string | null;
          status?: string | null;
          vencimento_em?: string | null;
          trial_fim_em?: string | null;
        }
      | undefined;
    const score = scoreBySalao.get(salao.id) as
      | { score_total?: number | null }
      | undefined;

    return {
      id: salao.id,
      salao: salao.nome || "-",
      responsavel: salao.responsavel || "-",
      email: salao.email || "-",
      telefone: salao.whatsapp || salao.telefone || "-",
      cidade: [salao.cidade, salao.estado].filter(Boolean).join("/") || "-",
      plano: assinatura?.plano || salao.plano || "-",
      assinatura: assinatura?.status || "-",
      vencimento: dateValue(assinatura?.vencimento_em || assinatura?.trial_fim_em),
      status: salao.status || "-",
      score: score?.score_total ?? 0,
      criado: dateValue(salao.created_at),
    };
  });
}

export async function getAdminMasterSalaoDetail(idSalao: string) {
  const supabase = getSupabaseAdmin();
  const [
    { data: salao },
    { data: assinatura },
    { data: tickets },
    { data: cobrancas },
    { data: anotacoes },
    { data: tags },
    access,
  ] = await Promise.all([
    supabase
      .from("saloes")
      .select("*")
      .eq("id", idSalao)
      .maybeSingle(),
    supabase
      .from("assinaturas")
      .select("*")
      .eq("id_salao", idSalao)
      .maybeSingle(),
    supabase
      .from("tickets")
      .select("id, numero, assunto, status, prioridade, criado_em")
      .eq("id_salao", idSalao)
      .order("criado_em", { ascending: false })
      .limit(10),
    supabase
      .from("assinaturas_cobrancas")
      .select("id, referencia, descricao, valor, status, data_expiracao, pago_em")
      .eq("id_salao", idSalao)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("admin_master_anotacoes_salao")
      .select("id, titulo, nota, criada_em")
      .eq("id_salao", idSalao)
      .order("criada_em", { ascending: false })
      .limit(10),
    supabase
      .from("admin_master_salao_tags")
      .select("admin_master_tags_salao(nome, cor)")
      .eq("id_salao", idSalao),
    getPlanoAccessSnapshot(idSalao),
  ]);

  return {
    salao: salao as Record<string, unknown> | null,
    assinatura: assinatura as Record<string, unknown> | null,
    tickets: (tickets || []) as AdminTableRow[],
    cobrancas: (cobrancas || []) as AdminTableRow[],
    anotacoes: (anotacoes || []) as AdminTableRow[],
    tags: ((tags || []) as { admin_master_tags_salao?: { nome?: string; cor?: string } | { nome?: string; cor?: string }[] | null }[]).map(
      (item) => {
        const tag = Array.isArray(item.admin_master_tags_salao)
          ? item.admin_master_tags_salao[0]
          : item.admin_master_tags_salao;

        return {
          nome: tag?.nome || "-",
          cor: tag?.cor || "-",
        };
      }
    ),
    access,
  };
}

export async function getAdminMasterPlanosSection(): Promise<AdminSectionData> {
  const supabase = getSupabaseAdmin();
  const [{ data: planos }, { data: recursos }] = await Promise.all([
    supabase
      .from("planos_saas")
      .select(
        "id, codigo, nome, subtitulo, valor_mensal, preco_anual, limite_usuarios, limite_profissionais, destaque, ativo"
      )
      .order("ordem", { ascending: true }),
    supabase
      .from("planos_recursos")
      .select("id_plano, recurso_codigo, habilitado"),
  ]);

  const recursosRows = (recursos || []) as {
    id_plano: string;
    recurso_codigo: string;
    habilitado: boolean | null;
  }[];

  const rows = ((planos || []) as {
    id: string;
    codigo?: string | null;
    nome?: string | null;
    subtitulo?: string | null;
    valor_mensal?: number | string | null;
    preco_anual?: number | string | null;
    limite_usuarios?: number | null;
    limite_profissionais?: number | null;
    destaque?: boolean | null;
    ativo?: boolean | null;
  }[]).map((plano) => {
    const habilitados = recursosRows.filter(
      (recurso) => recurso.id_plano === plano.id && recurso.habilitado
    ).length;
    const bloqueados = recursosRows.filter(
      (recurso) => recurso.id_plano === plano.id && !recurso.habilitado
    ).length;

    return {
      codigo: plano.codigo || "-",
      plano: plano.nome || "-",
      mensal: currency(safeNumber(plano.valor_mensal)),
      anual: currency(safeNumber(plano.preco_anual)),
      usuarios: plano.limite_usuarios ?? "-",
      profissionais: plano.limite_profissionais ?? "-",
      recursos: habilitados,
      bloqueados,
      destaque: plano.destaque ? "Sim" : "Nao",
      ativo: plano.ativo ? "Ativo" : "Inativo",
    };
  });

  return {
    title: "Planos e recursos",
    description:
      "Motor comercial do SalaoPremium com limites, recursos liberados e bloqueios por plano.",
    kpis: [
      {
        label: "Planos ativos",
        value: String(rows.filter((row) => row.ativo === "Ativo").length),
        hint: "Trial, Basico, Pro e Premium",
        tone: "blue",
      },
      {
        label: "Recursos mapeados",
        value: String(recursosRows.length),
        hint: "Planos_recursos centralizado",
        tone: "green",
      },
      {
        label: "Plano destaque",
        value: String(rows.find((row) => row.destaque === "Sim")?.plano || "-"),
        hint: "Usado para venda e upgrade",
        tone: "dark",
      },
    ],
    rows,
    columns: [
      "codigo",
      "plano",
      "mensal",
      "usuarios",
      "profissionais",
      "recursos",
      "bloqueados",
      "ativo",
    ],
    actions: [
      "Editar preco e limites",
      "Ajustar matriz de recursos",
      "Duplicar plano",
      "Ver saloes no plano",
    ],
  };
}

export async function getAdminMasterSection(
  section: string
): Promise<AdminSectionData> {
  const supabase = getSupabaseAdmin();

  if (section === "suporte") {
    const { items, metrics } = await listAdminTickets();

    return {
      title: "Suporte",
      description:
        "Tickets, clientes com problema, prioridades, ultima resposta e operacao de atendimento.",
      kpis: [
        {
          label: "Tickets",
          value: String(metrics.total),
          hint: "Historico recente do suporte",
          tone: "dark",
        },
        {
          label: "Em andamento",
          value: String(metrics.abertos),
          hint: "Chamados ainda nao encerrados",
          tone: "amber",
        },
        {
          label: "Aguardando cliente",
          value: String(metrics.aguardandoCliente),
          hint: "Retorno pendente do salao",
          tone: "blue",
        },
      ],
      rows: items.map((item) => ({
        ticket: `#${item.numero}`,
        salao: item.salaoNome || item.salaoId || "-",
        assunto: item.assunto,
        solicitante: item.solicitanteNome,
        prioridade: item.prioridade,
        status: item.status,
        atualizado: item.ultimaInteracaoLabel,
      })),
      columns: [
        "ticket",
        "salao",
        "assunto",
        "solicitante",
        "prioridade",
        "status",
        "atualizado",
      ],
      actions: ["Abrir ticket", "Entrar como salao", "Criar alerta"],
    };
  }

  if (section === "saloes") {
    const rows = await getAdminMasterSaloes();
    return {
      title: "Saloes clientes",
      description:
        "Controle de clientes, status, assinatura, score de onboarding e acoes administrativas.",
      kpis: [
        {
          label: "Saloes listados",
          value: String(rows.length),
          hint: "Ultimos 100 saloes",
          tone: "dark",
        },
        {
          label: "Ativos",
          value: String(rows.filter((row) => row.status === "ativo").length),
          hint: "Status do salao",
          tone: "green",
        },
        {
          label: "Em trial",
          value: String(
            rows.filter((row) =>
              ["teste_gratis", "trial"].includes(
                String(row.assinatura || "").toLowerCase()
              )
            ).length
          ),
          hint: "Converter para pago",
          tone: "blue",
        },
      ],
      rows,
      columns: [
        "salao",
        "responsavel",
        "email",
        "telefone",
        "plano",
        "assinatura",
        "vencimento",
        "score",
      ],
      actions: [
        "Ver detalhes",
        "Entrar como salao",
        "Bloquear/desbloquear",
        "Criar nota interna",
      ],
    };
  }

  if (section === "assinaturas") {
    const { data } = await supabase
      .from("assinaturas")
      .select("id, id_salao, plano, status, valor, vencimento_em, renovacao_automatica")
      .order("updated_at", { ascending: false })
      .limit(100);
    const rows = ((data || []) as {
      id_salao?: string | null;
      plano?: string | null;
      status?: string | null;
      valor?: number | string | null;
      vencimento_em?: string | null;
      renovacao_automatica?: boolean | null;
    }[]).map((item) => ({
      salao: item.id_salao || "-",
      plano: item.plano || "-",
      status: item.status || "-",
      valor: currency(safeNumber(item.valor)),
      vencimento: dateValue(item.vencimento_em),
      renovacao: item.renovacao_automatica ? "Ativa" : "Desativada",
    }));

    return {
      title: "Assinaturas",
      description:
        "Status financeiro, vencimentos, renovacao automatica e ajustes manuais.",
      kpis: [
        {
          label: "Assinaturas",
          value: String(rows.length),
          hint: "Ultimas atualizadas",
          tone: "dark",
        },
        {
          label: "Ativas",
          value: String(
            rows.filter((row) =>
              ["ativo", "ativa", "pago"].includes(
                String(row.status).toLowerCase()
              )
            ).length
          ),
          hint: "Liberadas",
          tone: "green",
        },
        {
          label: "Em risco",
          value: String(
            rows.filter((row) =>
              ["vencida", "cancelada", "bloqueada"].includes(
                String(row.status).toLowerCase()
              )
            ).length
          ),
          hint: "Precisa acao",
          tone: "red",
        },
      ],
      rows,
      columns: ["salao", "plano", "status", "valor", "vencimento", "renovacao"],
      actions: [
        "Trocar plano",
        "Ajustar vencimento",
        "Gerar cobranca",
        "Reenviar cobranca",
      ],
    };
  }

  if (section === "cobrancas") {
    const [{ data: cobrancas }, { data: checkoutLocks }, { data: saloes }] =
      await Promise.all([
        supabase
          .from("assinaturas_cobrancas")
          .select(
            "id, id_salao, referencia, valor, status, forma_pagamento, gateway, data_expiracao, pago_em, created_at, asaas_payment_id, txid, idempotency_key"
          )
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("assinatura_checkout_locks")
          .select(
            "id, id_salao, plano_codigo, billing_type, valor, idempotency_key, status, id_cobranca, asaas_payment_id, erro_texto, expires_at, created_at, updated_at"
          )
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("saloes").select("id, nome").limit(1000),
      ]);

    const salaoById = new Map(
      ((saloes || []) as { id: string; nome?: string | null }[]).map((salao) => [
        salao.id,
        salao.nome || salao.id,
      ])
    );

    type AdminCobrancaRow = AdminTableRow & { _sort: string };

    const cobrancaRows = ((cobrancas || []) as {
      id_salao?: string | null;
      referencia?: string | null;
      valor?: number | string | null;
      status?: string | null;
      forma_pagamento?: string | null;
      gateway?: string | null;
      data_expiracao?: string | null;
      pago_em?: string | null;
      created_at?: string | null;
      asaas_payment_id?: string | null;
      txid?: string | null;
      idempotency_key?: string | null;
    }[]).map((item): AdminCobrancaRow => ({
      _sort: item.created_at || "",
      tipo: "cobranca",
      salao: item.id_salao ? salaoById.get(item.id_salao) || item.id_salao : "-",
      referencia: item.referencia || "-",
      valor: currency(safeNumber(item.valor)),
      status: item.status || "-",
      forma: item.forma_pagamento || "-",
      gateway: item.gateway || "-",
      expira: dateValue(item.data_expiracao),
      criado: dateTimeValue(item.created_at),
      pago: dateValue(item.pago_em),
      detalhe:
        item.asaas_payment_id ||
        item.txid ||
        item.idempotency_key ||
        "-",
      acao: "-",
      acao_tipo: null,
      acao_id: null,
    }));

    const checkoutRows = ((checkoutLocks || []) as {
      id?: string | null;
      id_salao?: string | null;
      plano_codigo?: string | null;
      billing_type?: string | null;
      valor?: number | string | null;
      idempotency_key?: string | null;
      status?: string | null;
      id_cobranca?: string | null;
      asaas_payment_id?: string | null;
      erro_texto?: string | null;
      expires_at?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    }[]).map((item): AdminCobrancaRow => {
      const requiresReconciliation =
        Boolean(item.asaas_payment_id) &&
        !item.id_cobranca &&
        ["erro", "expirado"].includes(String(item.status || "").toLowerCase());
      const detalhe =
        requiresReconciliation
          ? `reconciliar:${item.asaas_payment_id}`
          : item.erro_texto ||
            item.asaas_payment_id ||
            item.id_cobranca ||
            item.idempotency_key ||
            "-";

      const status = requiresReconciliation
        ? "reconciliar"
        : item.status || "-";

      return {
        _sort: item.created_at || item.updated_at || "",
        tipo: "checkout",
        salao: item.id_salao ? salaoById.get(item.id_salao) || item.id_salao : "-",
        referencia: item.idempotency_key || item.id || "-",
        valor: currency(safeNumber(item.valor)),
        status,
        forma: item.billing_type || "-",
        gateway: "asaas",
        expira: dateTimeValue(item.expires_at),
        criado: dateTimeValue(item.created_at),
        pago: "-",
        detalhe: String(detalhe).slice(0, 90),
        acao: requiresReconciliation ? "Criar ticket" : "-",
        acao_tipo: requiresReconciliation ? "checkout_ticket" : null,
        acao_id: requiresReconciliation ? item.id || null : null,
      };
    });

    const rows = [...cobrancaRows, ...checkoutRows]
      .sort((a, b) => String(b._sort).localeCompare(String(a._sort)))
      .slice(0, 120)
      .map(({ _sort: _sort, ...row }) => row);

    const checkoutEmAndamento = checkoutRows.filter(
      (row) => String(row.status).toLowerCase() === "processando"
    ).length;
    const checkoutFalhos = checkoutRows.filter((row) =>
      ["erro", "expirado", "reconciliar"].includes(
        String(row.status).toLowerCase()
      )
    ).length;
    const checkoutsReconciliar = checkoutRows.filter(
      (row) =>
        String(row.status).toLowerCase() !== "concluido" &&
        String(row.detalhe || "").startsWith("reconciliar:")
    ).length;
    const cobrancasPendentes = cobrancaRows.filter((row) =>
      ["pending", "pendente", "aguardando_pagamento"].includes(
        String(row.status).toLowerCase()
      )
    ).length;

    return {
      title: "Cobrancas",
      description:
        "Historico de cobrancas, pagamentos e locks de checkout para detectar duplicidade, falha e operacao presa.",
      kpis: [
        {
          label: "Cobrancas recentes",
          value: String(cobrancaRows.length),
          hint: "Ultimas 100",
          tone: "dark",
        },
        {
          label: "Checkouts ativos",
          value: String(checkoutEmAndamento),
          hint: "Reservas em processamento",
          tone: checkoutEmAndamento > 0 ? "amber" : "green",
        },
        {
          label: "Falhas checkout",
          value: String(checkoutFalhos),
          hint: `${checkoutsReconciliar} exigem reconciliacao`,
          tone: checkoutFalhos > 0 ? "red" : "green",
        },
        {
          label: "Pendentes",
          value: String(cobrancasPendentes),
          hint: "Acompanhar",
          tone: "amber",
        },
      ],
      rows,
      columns: [
        "tipo",
        "salao",
        "referencia",
        "valor",
        "status",
        "forma",
        "gateway",
        "expira",
        "criado",
        "detalhe",
        "acao",
      ],
      actions: [
        "Copiar link",
        "Reenviar",
        "Reprocessar webhook",
        "Ver checkout travado",
        "Marcar ajuste manual",
      ],
    };
  }

  if (section === "webhooks") {
    let sync = {
      total: 0,
      erros: 0,
      processados: 0,
      pendentes: 0,
    };
    let syncError: string | null = null;

    try {
      sync = await syncAdminMasterWebhookEvents();
    } catch (error) {
      syncError =
        error instanceof Error
          ? error.message
          : "Falha ao sincronizar eventos reais do Asaas.";
    }

    const [{ data: eventos }, { data: saloes }] = await Promise.all([
      supabase
        .from("eventos_webhook")
        .select(
          "origem, evento, id_salao, status, tentativas, erro_texto, resposta_json, recebido_em, processado_em"
        )
        .order("recebido_em", { ascending: false })
        .limit(150),
      supabase.from("saloes").select("id, nome").limit(1000),
    ]);

    const salaoById = new Map(
      ((saloes || []) as { id: string; nome?: string | null }[]).map((salao) => [
        salao.id,
        salao.nome || salao.id,
      ])
    );

    const rows = ((eventos || []) as {
      origem?: string | null;
      evento?: string | null;
      id_salao?: string | null;
      status?: string | null;
      tentativas?: number | null;
      erro_texto?: string | null;
      resposta_json?: Record<string, unknown> | null;
      recebido_em?: string | null;
      processado_em?: string | null;
    }[]).map((row) => {
      const resposta =
        row.resposta_json && typeof row.resposta_json === "object"
          ? row.resposta_json
          : {};
      const paymentId =
        typeof resposta.payment_id === "string" ? resposta.payment_id : null;
      const decisao =
        typeof resposta.decisao === "string" ? resposta.decisao : null;

      return {
        origem: row.origem || "-",
        evento: row.evento || "-",
        salao: row.id_salao ? salaoById.get(row.id_salao) || row.id_salao : "-",
        status: row.status || "-",
        tentativas: safeNumber(row.tentativas),
        recebido: formatWebhookDate(row.recebido_em),
        processado: formatWebhookDate(row.processado_em),
        detalhe: formatWebhookDiagnosticDetail({
          paymentId,
          decisao,
          erro: row.erro_texto,
        }),
      };
    });

    const erros = rows.filter(
      (row) => String(row.status).toLowerCase() === "erro"
    ).length;
    const pendentes = rows.filter(
      (row) => String(row.status).toLowerCase() === "pendente"
    ).length;
    const saloesImpactados = new Set(
      rows
        .map((row) => String(row.salao || "-"))
        .filter((salao) => salao && salao !== "-")
    ).size;

    return {
      title: "Webhooks",
      description:
        "Diagnostico operacional dos eventos reais do Asaas, com status consolidado, tentativas, decisao aplicada e impacto por salao.",
      kpis: [
        {
          label: "Eventos recentes",
          value: String(rows.length),
          hint: syncError ? "Sincronizacao falhou, exibindo cache local" : `${sync.total} eventos sincronizados`,
          tone: syncError ? "amber" : "dark",
        },
        {
          label: "Com erro",
          value: String(erros),
          hint: `${pendentes} pendentes para acompanhar`,
          tone: erros > 0 ? "red" : "green",
        },
        {
          label: "Saloes impactados",
          value: String(saloesImpactados),
          hint: `${sync.processados} processados sem falha`,
          tone: saloesImpactados > 0 ? "blue" : "dark",
        },
        {
          label: "Sincronizacao",
          value: syncError ? "Falhou" : "OK",
          hint: syncError || "Eventos espelhados para o AdminMaster",
          tone: syncError ? "red" : "green",
        },
      ],
      rows,
      columns: [
        "origem",
        "evento",
        "salao",
        "status",
        "tentativas",
        "recebido",
        "processado",
        "detalhe",
      ],
      actions: [
        "Sincronizar webhooks",
        "Ver payload Asaas",
        "Reprocessar diagnostico",
        "Auditar falhas",
      ],
    };
  }

  if (section === "operacao") {
    let syncError: string | null = null;

    try {
      await syncAdminMasterWebhookEvents();
    } catch (error) {
      syncError =
        error instanceof Error
          ? error.message
          : "Falha ao sincronizar webhooks para operacao.";
    }

    const [
      { data: crons },
      { data: webhooks },
      { data: checkoutLocks },
      { data: saloes },
    ] = await Promise.all([
      supabase
        .from("eventos_cron")
        .select("nome, status, resumo, erro_texto, iniciado_em, finalizado_em")
        .order("iniciado_em", { ascending: false })
        .limit(40),
      supabase
        .from("eventos_webhook")
        .select(
          "evento, id_salao, status, erro_texto, resposta_json, recebido_em, processado_em"
        )
        .in("status", ["erro", "pendente"])
        .order("recebido_em", { ascending: false })
        .limit(40),
      supabase
        .from("assinatura_checkout_locks")
        .select(
          "id, id_salao, plano_codigo, billing_type, status, id_cobranca, asaas_payment_id, erro_texto, idempotency_key, created_at, updated_at"
        )
        .in("status", ["processando", "erro", "expirado"])
        .order("updated_at", { ascending: false })
        .limit(40),
      supabase.from("saloes").select("id, nome").limit(1000),
    ]);

    const salaoById = new Map(
      ((saloes || []) as { id: string; nome?: string | null }[]).map((salao) => [
        salao.id,
        salao.nome || salao.id,
      ])
    );

    type AdminOperacaoRow = AdminTableRow & { _sort: string };

    const cronRows = ((crons || []) as {
      nome?: string | null;
      status?: string | null;
      resumo?: string | null;
      erro_texto?: string | null;
      iniciado_em?: string | null;
      finalizado_em?: string | null;
    }[]).map((row): AdminOperacaoRow => ({
      _sort: row.finalizado_em || row.iniciado_em || "",
      tipo: "cron",
      salao: "-",
      nome: row.nome || "-",
      status: row.status || "-",
      referencia: "-",
      atualizado: dateTimeValue(row.finalizado_em || row.iniciado_em),
      detalhe: row.erro_texto || row.resumo || "-",
    }));

    const webhookRows = ((webhooks || []) as {
      evento?: string | null;
      id_salao?: string | null;
      status?: string | null;
      erro_texto?: string | null;
      resposta_json?: Record<string, unknown> | null;
      recebido_em?: string | null;
      processado_em?: string | null;
    }[]).map((row): AdminOperacaoRow => {
      const resposta =
        row.resposta_json && typeof row.resposta_json === "object"
          ? row.resposta_json
          : {};
      const paymentId =
        typeof resposta.payment_id === "string" ? resposta.payment_id : null;
      const decisao =
        typeof resposta.decisao === "string" ? resposta.decisao : null;

      return {
        _sort: row.processado_em || row.recebido_em || "",
        tipo: "webhook",
        salao: row.id_salao ? salaoById.get(row.id_salao) || row.id_salao : "-",
        nome: row.evento || "-",
        status: row.status || "-",
        referencia: paymentId || "-",
        atualizado: formatWebhookDate(row.processado_em || row.recebido_em),
        detalhe: formatWebhookDiagnosticDetail({
          paymentId,
          decisao,
          erro: row.erro_texto,
        }),
      };
    });

    const checkoutRows = ((checkoutLocks || []) as {
      id?: string | null;
      id_salao?: string | null;
      plano_codigo?: string | null;
      billing_type?: string | null;
      status?: string | null;
      id_cobranca?: string | null;
      asaas_payment_id?: string | null;
      erro_texto?: string | null;
      idempotency_key?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    }[]).map((row): AdminOperacaoRow => ({
      _sort: row.updated_at || row.created_at || "",
      tipo: "checkout",
      salao: row.id_salao ? salaoById.get(row.id_salao) || row.id_salao : "-",
      nome: row.plano_codigo
        ? `Checkout ${row.plano_codigo}`
        : `Checkout ${row.billing_type || "-"}`,
      status: row.status || "-",
      referencia:
        row.asaas_payment_id ||
        row.id_cobranca ||
        row.idempotency_key ||
        row.id ||
        "-",
      atualizado: dateTimeValue(row.updated_at || row.created_at),
      detalhe: row.erro_texto || row.billing_type || "-",
    }));

    const rows = [...cronRows, ...webhookRows, ...checkoutRows]
      .sort((a, b) => String(b._sort).localeCompare(String(a._sort)))
      .slice(0, 120)
      .map(({ _sort: _sort, ...row }) => row);

    const cronsComErro = cronRows.filter((row) =>
      ["erro", "falha", "failed"].includes(String(row.status).toLowerCase())
    ).length;
    const checkoutsProblematicos = checkoutRows.length;
    const webhooksPendentes = webhookRows.filter(
      (row) => String(row.status).toLowerCase() === "pendente"
    ).length;

    return {
      title: "Operacao",
      description:
        "Visao operacional unificada com crons recentes, checkouts presos e webhooks com erro ou pendentes para suporte e reprocessamento.",
      kpis: [
        {
          label: "Crons com erro",
          value: String(cronsComErro),
          hint: `${cronRows.length} eventos recentes`,
          tone: cronsComErro > 0 ? "red" : "green",
        },
        {
          label: "Webhooks em atencao",
          value: String(webhookRows.length),
          hint: `${webhooksPendentes} pendentes e ${webhookRows.length - webhooksPendentes} com erro`,
          tone: webhookRows.length > 0 ? "amber" : "green",
        },
        {
          label: "Checkouts travados",
          value: String(checkoutsProblematicos),
          hint: "Processando, erro ou expirado",
          tone: checkoutsProblematicos > 0 ? "red" : "green",
        },
        {
          label: "Sync webhooks",
          value: syncError ? "Falhou" : "OK",
          hint: syncError || "Operacao alinhada com Asaas",
          tone: syncError ? "red" : "green",
        },
      ],
      rows,
      columns: [
        "tipo",
        "salao",
        "nome",
        "status",
        "referencia",
        "atualizado",
        "detalhe",
      ],
      actions: [
        "Rodar sincronizacao",
        "Sincronizar webhooks",
        "Reprocessar eventos",
        "Auditar erros",
      ],
    };
  }

  if (section === "planos") {
    return getAdminMasterPlanosSection();
  }

  if (section === "alertas") {
    const sync = await syncAdminMasterAlerts();
    const [{ data: alertas }, { data: saloes }, { data: tickets }] = await Promise.all([
      supabase
        .from("alertas_sistema")
        .select(
          "id, tipo, gravidade, origem_modulo, id_salao, titulo, descricao, resolvido, criado_em, atualizado_em, automatico, id_ticket"
        )
        .order("resolvido", { ascending: true })
        .order("criado_em", { ascending: false })
        .limit(150),
      supabase.from("saloes").select("id, nome").limit(1000),
      supabase.from("tickets").select("id, numero, status").limit(1000),
    ]);

    const salaoById = new Map(
      ((saloes || []) as { id: string; nome?: string | null }[]).map((salao) => [
        salao.id,
        salao.nome || salao.id,
      ])
    );
    const ticketById = new Map(
      ((tickets || []) as { id: string; numero?: number | string | null; status?: string | null }[]).map(
        (ticket) => [
          ticket.id,
          {
            numero: ticket.numero,
            status: ticket.status,
          },
        ]
      )
    );

    const rows = ((alertas || []) as {
      id?: string | null;
      tipo?: string | null;
      gravidade?: string | null;
      origem_modulo?: string | null;
      id_salao?: string | null;
      titulo?: string | null;
      descricao?: string | null;
      resolvido?: boolean | null;
      criado_em?: string | null;
      atualizado_em?: string | null;
      automatico?: boolean | null;
      id_ticket?: string | null;
    }[]).map((row) => ({
      gravidade: row.gravidade || "-",
      titulo: row.titulo || "-",
      salao: row.id_salao ? salaoById.get(row.id_salao) || row.id_salao : "-",
      origem: row.origem_modulo || "-",
      status: row.resolvido ? "Resolvido" : "Ativo",
      ticket: row.id_ticket
        ? (() => {
            const ticket = ticketById.get(row.id_ticket);
            if (!ticket) return "Vinculado";
            return `#${ticket.numero || "-"} • ${ticket.status || "aberto"}`;
          })()
        : "-",
      automatico: row.automatico ? "Sim" : "Nao",
      criado: dateTimeValue(row.criado_em),
      atualizado: dateTimeValue(row.atualizado_em),
      detalhe: row.descricao || "-",
      ticket_acao: !row.resolvido && !row.id_ticket ? "Criar ticket" : "-",
      ticket_acao_tipo: !row.resolvido && !row.id_ticket ? "alert_ticket" : null,
      ticket_acao_id: !row.resolvido && !row.id_ticket ? row.id || null : null,
      resolver_acao: row.resolvido ? "-" : "Resolver",
      resolver_acao_tipo: row.resolvido ? null : "alert_resolve",
      resolver_acao_id: row.resolvido ? null : row.id || null,
    }));

    const ativos = rows.filter((row) => row.status === "Ativo").length;
    const criticos = rows.filter((row) =>
      ["alta", "critica"].includes(String(row.gravidade).toLowerCase())
    ).length;
    const comTicket = rows.filter((row) => row.ticket !== "-").length;

    return {
      title: "Alertas",
      description:
        "Alertas automaticos do AdminMaster para checkout de assinatura, webhook Asaas, cobrancas vencidas e trials terminando.",
      kpis: [
        {
          label: "Alertas ativos",
          value: String(ativos),
          hint: `${rows.length} registros recentes`,
          tone: ativos > 0 ? "amber" : "green",
        },
        {
          label: "Alta ou critica",
          value: String(criticos),
          hint: `${sync.webhooksComErro} webhooks e ${sync.checkoutsFalhos} checkouts com falha`,
          tone: criticos > 0 ? "red" : "green",
        },
        {
          label: "Trials vencendo",
          value: String(sync.trialsVencendo),
          hint: `${sync.cobrancasVencidas} cobrancas vencidas monitoradas`,
          tone: sync.trialsVencendo > 0 ? "blue" : "dark",
        },
        {
          label: "Com ticket",
          value: String(comTicket),
          hint: "Alertas ja vinculados ao suporte",
          tone: comTicket > 0 ? "green" : "dark",
        },
      ],
      rows,
      columns: [
        "gravidade",
        "titulo",
        "salao",
        "origem",
        "status",
        "ticket",
        "automatico",
        "criado",
        "detalhe",
        "ticket_acao",
        "resolver_acao",
      ],
      actions: [
        "Resolver alerta",
        "Criar ticket",
        "Sincronizar alertas",
        "Ver webhooks com erro",
        "Ver checkouts travados",
      ],
    };
  }

  if (section === "logs") {
    const [{ data: logs }, { data: checkoutLocks }, { data: saloes }] =
      await Promise.all([
        supabase
          .from("logs_sistema")
          .select(
            "id, gravidade, modulo, id_salao, mensagem, detalhes_json, criado_em"
          )
          .order("criado_em", { ascending: false })
          .limit(120),
        supabase
          .from("assinatura_checkout_locks")
          .select(
            "id, id_salao, plano_codigo, billing_type, status, id_cobranca, asaas_payment_id, erro_texto, idempotency_key, created_at, updated_at"
          )
          .in("status", ["erro", "expirado"])
          .not("asaas_payment_id", "is", null)
          .is("id_cobranca", null)
          .order("updated_at", { ascending: false })
          .limit(60),
        supabase.from("saloes").select("id, nome").limit(1000),
      ]);

    const salaoById = new Map(
      ((saloes || []) as { id: string; nome?: string | null }[]).map((salao) => [
        salao.id,
        salao.nome || salao.id,
      ])
    );

    type AdminLogRow = AdminTableRow & { _sort: string };

    const logRows = ((logs || []) as {
      id?: string | null;
      gravidade?: string | null;
      modulo?: string | null;
      id_salao?: string | null;
      mensagem?: string | null;
      detalhes_json?: Record<string, unknown> | null;
      criado_em?: string | null;
    }[]).map((row): AdminLogRow => {
      const detalhes =
        row.detalhes_json && typeof row.detalhes_json === "object"
          ? row.detalhes_json
          : {};
      const referencia =
        typeof detalhes.id_salao_solicitado === "string"
          ? detalhes.id_salao_solicitado
          : typeof detalhes.idempotency_key === "string"
            ? detalhes.idempotency_key
            : row.id || "-";

      return {
        _sort: row.criado_em || "",
        tipo: row.modulo === "tenant_guard" ? "seguranca" : "log",
        gravidade: row.gravidade || "-",
        modulo: row.modulo || "-",
        salao: row.id_salao ? salaoById.get(row.id_salao) || row.id_salao : "-",
        mensagem: row.mensagem || "-",
        referencia,
        criado: dateTimeValue(row.criado_em),
        detalhe: JSON.stringify(detalhes).slice(0, 120),
        acao: "-",
        acao_tipo: null,
        acao_id: null,
      };
    });

    const reconciliationRows = ((checkoutLocks || []) as {
      id?: string | null;
      id_salao?: string | null;
      plano_codigo?: string | null;
      billing_type?: string | null;
      status?: string | null;
      asaas_payment_id?: string | null;
      erro_texto?: string | null;
      idempotency_key?: string | null;
      updated_at?: string | null;
      created_at?: string | null;
    }[]).map((row): AdminLogRow => ({
      _sort: row.updated_at || row.created_at || "",
      tipo: "reconciliacao",
      gravidade: "error",
      modulo: "assinatura_checkout",
      salao: row.id_salao ? salaoById.get(row.id_salao) || row.id_salao : "-",
      mensagem:
        "Pagamento existe no provedor, mas nao ha cobranca local vinculada.",
      referencia: row.asaas_payment_id || row.idempotency_key || row.id || "-",
      criado: dateTimeValue(row.updated_at || row.created_at),
      detalhe:
        row.erro_texto ||
        `${row.plano_codigo || "-"} / ${row.billing_type || "-"} / ${row.status || "-"}`,
      acao: "Criar ticket",
      acao_tipo: "checkout_ticket",
      acao_id: row.id || null,
    }));

    const rows = [...reconciliationRows, ...logRows]
      .sort((a, b) => String(b._sort).localeCompare(String(a._sort)))
      .slice(0, 150)
      .map(({ _sort: _sort, ...row }) => row);

    const tenantGuardCount = logRows.filter(
      (row) => row.modulo === "tenant_guard"
    ).length;
    const errorsCount = rows.filter((row) =>
      ["error", "erro"].includes(String(row.gravidade).toLowerCase())
    ).length;
    const modulesCount = new Set(rows.map((row) => String(row.modulo))).size;

    return {
      title: "Logs e seguranca",
      description:
        "Visao operacional dos eventos recentes, tentativas multi-tenant bloqueadas e checkouts que precisam de reconciliacao financeira.",
      kpis: [
        {
          label: "Tenant guard",
          value: String(tenantGuardCount),
          hint: "Tentativas bloqueadas por isolamento de salao",
          tone: tenantGuardCount > 0 ? "red" : "green",
        },
        {
          label: "Reconciliacoes",
          value: String(reconciliationRows.length),
          hint: "Pagamento no provedor sem cobranca local",
          tone: reconciliationRows.length > 0 ? "red" : "green",
        },
        {
          label: "Erros recentes",
          value: String(errorsCount),
          hint: `${modulesCount} modulos com eventos`,
          tone: errorsCount > 0 ? "amber" : "green",
        },
      ],
      rows,
      columns: [
        "tipo",
        "gravidade",
        "modulo",
        "salao",
        "mensagem",
        "referencia",
        "criado",
        "detalhe",
        "acao",
      ],
      actions: [
        "Investigar tenant guard",
        "Abrir ticket interno",
        "Reconciliar checkout",
        "Exportar logs",
      ],
    };
  }

  const map: Record<
    string,
    {
      title: string;
      description: string;
      table: string;
      columns: string[];
      actions: string[];
    }
  > = {
    tickets: {
      title: "Tickets",
      description: "Atendimento, SLA, categorias, prioridades e historico.",
      table: "tickets",
      columns: ["numero", "assunto", "categoria", "prioridade", "status", "criado_em"],
      actions: ["Assumir", "Responder", "Alterar status", "Entrar como salao"],
    },
    notificacoes: {
      title: "Notificacoes globais",
      description: "Comunicados, manutencao, ofertas e avisos institucionais.",
      table: "notificacoes_globais",
      columns: ["titulo", "tipo", "publico_tipo", "status", "criada_em"],
      actions: ["Nova notificacao", "Agendar", "Enviar agora", "Duplicar"],
    },
    campanhas: {
      title: "Campanhas",
      description: "Promocoes, retencao, conversao de trial e recuperacao.",
      table: "campanhas",
      columns: ["nome", "tipo", "publico_tipo", "status", "inicio_em", "fim_em"],
      actions: ["Criar campanha", "Pausar", "Encerrar", "Ver metricas"],
    },
    alertas: {
      title: "Alertas",
      description: "Riscos, falhas, cobrancas, webhooks e operacao.",
      table: "alertas_sistema",
      columns: ["tipo", "gravidade", "origem_modulo", "titulo", "resolvido", "criado_em"],
      actions: ["Resolver", "Criar ticket", "Notificar cliente", "Corrigir manualmente"],
    },
    webhooks: {
      title: "Webhooks",
      description: "Eventos recebidos, falhas, tentativas e reprocessamento.",
      table: "eventos_webhook",
      columns: ["origem", "evento", "status", "tentativas", "erro_texto", "recebido_em"],
      actions: ["Ver payload", "Reprocessar", "Marcar resolvido"],
    },
    logs: {
      title: "Logs",
      description: "Logs de sistema, financeiro, suporte e operacao.",
      table: "logs_sistema",
      columns: ["gravidade", "modulo", "mensagem", "criado_em"],
      actions: ["Ver detalhe", "Vincular ticket", "Exportar"],
    },
    whatsapp: {
      title: "WhatsApp e pacotes",
      description: "Creditos, consumo, templates, filas e cobranca por envio.",
      table: "whatsapp_envios",
      columns: ["tipo", "destino", "template", "status", "custo_creditos", "criado_em"],
      actions: ["Adicionar pacote", "Ajustar creditos", "Suspender envios"],
    },
    "feature-flags": {
      title: "Feature flags",
      description: "Liberacoes por plano, salao especifico e recursos beta.",
      table: "feature_flags",
      columns: ["nome", "status_global", "tipo_liberacao", "data_inicio", "data_fim"],
      actions: ["Ativar", "Liberar por plano", "Liberar para salao"],
    },
    "usuarios-admin": {
      title: "Usuarios AdminMaster",
      description: "Admins internos, perfis, permissoes e auditoria.",
      table: "admin_master_usuarios",
      columns: ["nome", "email", "perfil", "status", "ultimo_acesso_em"],
      actions: ["Criar admin", "Editar permissoes", "Suspender", "Forcar logout"],
    },
    checklists: {
      title: "Checklists e trial +7",
      description: "Onboarding, score de saude e extensao automatica de trial.",
      table: "score_onboarding_salao",
      columns: ["id_salao", "score_total", "dias_com_acesso", "modulos_usados", "atualizado_em"],
      actions: ["Recalcular score", "Avaliar trial extra", "Ver criterios"],
    },
    financeiro: {
      title: "Financeiro SaaS",
      description: "MRR, recebimentos, inadimplencia, churn e receita por plano.",
      table: "assinaturas_cobrancas",
      columns: ["referencia", "valor", "status", "forma_pagamento", "data_expiracao", "pago_em"],
      actions: ["Ver inadimplentes", "Exportar receita", "Gerar cobranca manual"],
    },
    operacao: {
      title: "Operacao",
      description: "Saude do sistema, crons, sincronizacoes e reprocessamentos.",
      table: "eventos_cron",
      columns: ["nome", "status", "resumo", "erro_texto", "iniciado_em", "finalizado_em"],
      actions: ["Rodar sincronizacao", "Reprocessar eventos", "Recalcular assinaturas"],
    },
    suporte: {
      title: "Suporte",
      description: "Tickets, clientes com problema, historico e acoes de suporte.",
      table: "tickets",
      columns: ["numero", "assunto", "categoria", "prioridade", "status", "criado_em"],
      actions: ["Criar ticket", "Entrar como salao", "Ver ultimos erros"],
    },
    relatorios: {
      title: "Relatorios e growth",
      description: "Crescimento, uso dos saloes, retencao, churn e conversao.",
      table: "score_saude_salao",
      columns: ["id_salao", "score_total", "uso_recente", "inadimplencia_risco", "tickets_abertos"],
      actions: ["Ver crescimento", "Ver uso por modulo", "Exportar relatorio"],
    },
    "configuracoes-globais": {
      title: "Configuracoes globais",
      description: "Manutencao, banners, onboarding, politicas e templates globais.",
      table: "configuracoes_globais",
      columns: ["chave", "descricao", "atualizado_em"],
      actions: ["Publicar aviso", "Ativar manutencao", "Salvar template"],
    },
  };

  const config = map[section] || {
    title: section,
    description: "Modulo AdminMaster preparado para operacao.",
    table: "admin_master_auditoria",
    columns: ["acao", "entidade", "descricao", "criado_em"],
    actions: ["Ver detalhes", "Exportar", "Auditar"],
  };

  const { data } = await supabase
    .from(config.table)
    .select("*")
    .limit(100);

  const rows = ((data || []) as Record<string, unknown>[]).map((row) =>
    config.columns.reduce((acc, column) => {
      const value = row[column];
      acc[column] =
        typeof value === "boolean"
          ? value
            ? "Sim"
            : "Nao"
          : typeof value === "number"
            ? value
            : value
              ? String(value)
              : "-";
      return acc;
    }, {} as AdminTableRow)
  );

  return {
    title: config.title,
    description: config.description,
    kpis: [
      {
        label: "Registros",
        value: String(rows.length),
        hint: "Ultimos registros do modulo",
        tone: "dark",
      },
      {
        label: "Acoes prontas",
        value: String(config.actions.length),
        hint: "Fluxo de operacao definido",
        tone: "blue",
      },
      {
        label: "Auditoria",
        value: "Ativa",
        hint: "Acoes criticas devem registrar historico",
        tone: "green",
      },
    ],
    rows,
    columns: config.columns,
    actions: config.actions,
  };
}
