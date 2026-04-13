import { PERMISSIONS, type PermissionKey, type UserNivel } from "@/lib/permissions";
import type { Cliente, ConfigSalao, Profissional, Servico } from "@/types/agenda";

function montarPermissoesPorNivel(userNivel: UserNivel) {
  const keys = Object.keys(PERMISSIONS) as PermissionKey[];

  return keys.reduce<Record<string, boolean>>((acc, key) => {
    acc[key] = PERMISSIONS[key].includes(userNivel);
    return acc;
  }, {});
}

function diferencaEmDias(dataAlvo: Date, dataBase: Date) {
  const alvo = new Date(
    dataAlvo.getFullYear(),
    dataAlvo.getMonth(),
    dataAlvo.getDate()
  );

  const base = new Date(
    dataBase.getFullYear(),
    dataBase.getMonth(),
    dataBase.getDate()
  );

  const diffMs = alvo.getTime() - base.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function parseDataAssinatura(valor?: string | null) {
  if (!valor) return null;

  const texto = String(valor).trim();
  if (!texto) return null;

  const dataCompleta = new Date(texto);
  if (!Number.isNaN(dataCompleta.getTime())) {
    return dataCompleta;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const apenasData = new Date(`${texto}T23:59:59`);
    if (!Number.isNaN(apenasData.getTime())) {
      return apenasData;
    }
  }

  return null;
}

function getAssinaturaBloqueada(params: {
  status?: string | null;
  vencimentoEm?: string | null;
  trialFimEm?: string | null;
}) {
  const statusNormalizado = String(params.status || "").toLowerCase();

  const vencimentoBase =
    ["teste_gratis", "trial"].includes(statusNormalizado)
      ? params.trialFimEm || params.vencimentoEm || null
      : params.vencimentoEm || params.trialFimEm || null;

  if (!statusNormalizado) {
    return true;
  }

  if (!vencimentoBase) {
    return true;
  }

  const hoje = new Date();
  const vencimento = parseDataAssinatura(vencimentoBase);

  if (!vencimento) {
    return true;
  }

  const diasRestantes = diferencaEmDias(vencimento, hoje);
  const vencida = diasRestantes < 0;
  const diasAtraso = vencida ? Math.abs(diasRestantes) : 0;

  if (["teste_gratis", "trial"].includes(statusNormalizado)) {
    return vencida;
  }

  if (["ativo", "ativa", "pago"].includes(statusNormalizado)) {
    return vencida && diasAtraso > 3;
  }

  if (["pendente", "aguardando_pagamento"].includes(statusNormalizado)) {
    return vencida && diasAtraso > 3;
  }

  if (["cancelada", "vencida"].includes(statusNormalizado)) {
    return true;
  }

  return true;
}

export async function initAgendaPage(params: {
  supabase: any;
  safeGetAuthUser: () => Promise<any>;
}): Promise<{
  ok: boolean;
  redirectTo?: string | null;
  erroTela?: string;
  permissoes?: Record<string, boolean> | null;
  idSalao?: string;
  config?: ConfigSalao | null;
  profissionais?: Profissional[];
  clientes?: Cliente[];
  servicos?: Servico[];
  assinaturaBloqueada?: boolean;
}> {
  const { supabase, safeGetAuthUser } = params;

  const user = await safeGetAuthUser();

  if (!user) {
    return {
      ok: false,
      erroTela: "Usuário não autenticado.",
    };
  }

  const usuarioRes = await supabase
    .from("usuarios")
    .select("id, id_salao, status, auth_user_id, nivel")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioRes.error) {
    console.error("Erro ao buscar usuário logado:", usuarioRes.error);
    return {
      ok: false,
      erroTela: "Não foi possível carregar os dados do usuário logado.",
    };
  }

  if (!usuarioRes.data?.id_salao) {
    return {
      ok: false,
      erroTela: "Não foi possível identificar o salão do usuário logado.",
    };
  }

  if (usuarioRes.data.status && usuarioRes.data.status !== "ativo") {
    return {
      ok: false,
      erroTela: "Usuário vinculado, mas inativo.",
    };
  }

  const userNivel = String(usuarioRes.data.nivel || "recepcao") as UserNivel;
  const permissoesNivel = montarPermissoesPorNivel(userNivel);

  if (!permissoesNivel.agenda_ver) {
    return {
      ok: true,
      permissoes: permissoesNivel,
      redirectTo: "/dashboard",
    };
  }

  const salaoId = usuarioRes.data.id_salao;

  const [configRes, profissionaisRes, clientesRes, servicosRes, assinaturaRes] =
    await Promise.all([
      supabase
        .from("configuracoes_salao")
        .select("*")
        .eq("id_salao", salaoId)
        .maybeSingle(),

      supabase
        .from("profissionais")
        .select("*")
        .eq("id_salao", salaoId)
        .eq("status", "ativo")
        .order("nome"),

      supabase
        .from("clientes")
        .select("id, nome, whatsapp")
        .eq("id_salao", salaoId)
        .order("nome"),

      supabase
        .from("servicos")
        .select(`
          id,
          nome,
          duracao_minutos,
          preco,
          preco_padrao,
          comissao_percentual,
          comissao_assistente_percentual,
          base_calculo,
          desconta_taxa_maquininha
        `)
        .eq("id_salao", salaoId)
        .eq("status", "ativo")
        .order("nome"),

      supabase
        .from("assinaturas")
        .select("status, vencimento_em, trial_fim_em")
        .eq("id_salao", salaoId)
        .maybeSingle(),
    ]);

  if (configRes.error) console.error("Erro config:", configRes.error);
  if (profissionaisRes.error) console.error("Erro profissionais:", profissionaisRes.error);
  if (clientesRes.error) console.error("Erro clientes:", clientesRes.error);
  if (servicosRes.error) console.error("Erro serviços:", servicosRes.error);
  if (assinaturaRes.error) console.error("Erro assinatura:", assinaturaRes.error);

  const assinaturaBloqueada = getAssinaturaBloqueada({
    status: assinaturaRes.data?.status,
    vencimentoEm: assinaturaRes.data?.vencimento_em || null,
    trialFimEm: assinaturaRes.data?.trial_fim_em || null,
  });

  return {
    ok: true,
    permissoes: permissoesNivel,
    idSalao: salaoId,
    config: (configRes.data as ConfigSalao) || null,
    profissionais: (profissionaisRes.data as Profissional[]) || [],
    clientes: (clientesRes.data as Cliente[]) || [],
    servicos: (servicosRes.data as Servico[]) || [],
    assinaturaBloqueada,
    erroTela: configRes.data
      ? ""
      : "Não foi possível carregar as configurações do salão.",
  };
}