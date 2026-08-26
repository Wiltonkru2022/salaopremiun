import type { AdminSectionData, AdminTableRow } from "@/lib/admin-master/data";
import { getDatabaseAdmin } from "@/lib/db/admin";

function formatDate(value?: string | null) {
  if (!value) return "Sem limite";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Campo_Grande",
  }).format(parsed);
}

function listLabel(value: unknown) {
  if (!Array.isArray(value) || !value.length) return "Todos";
  return value
    .map((item) => String(item || "").replaceAll("_", " "))
    .filter(Boolean)
    .join(", ");
}

function partnerName(value: unknown) {
  if (!value || typeof value !== "object") return "Salão Premiun";
  const row = value as { nome_fantasia?: string | null; razao_social?: string | null };
  return row.nome_fantasia || row.razao_social || "Empresa parceira";
}

export async function getAdvertisingCampaignsSection(): Promise<AdminSectionData> {
  const supabase = getDatabaseAdmin() as any;
  const { data, error } = await supabase
    .from("parceria_campanhas")
    .select(
      "id,id_parceiro,nome,descricao,status,publico,locais_exibicao,destino_url,inicio_em,fim_em,origem,prioridade,criado_em,parceiros_comerciais(razao_social,nome_fantasia),parceria_criativos(id,ativo)"
    )
    .order("criado_em", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message || "Não foi possível carregar as campanhas de anúncios.");
  }

  const campaigns = (data || []) as Array<{
    id: string;
    id_parceiro?: string | null;
    nome?: string | null;
    descricao?: string | null;
    status?: string | null;
    publico?: unknown;
    locais_exibicao?: unknown;
    destino_url?: string | null;
    inicio_em?: string | null;
    fim_em?: string | null;
    origem?: string | null;
    prioridade?: number | null;
    criado_em?: string | null;
    parceiros_comerciais?: unknown;
    parceria_criativos?: Array<{ id?: string | null; ativo?: boolean | null }> | null;
  }>;

  const now = Date.now();
  const active = campaigns.filter((row) => {
    const status = String(row.status || "").toLowerCase();
    const starts = row.inicio_em ? new Date(row.inicio_em).getTime() : Number.NEGATIVE_INFINITY;
    const ends = row.fim_em ? new Date(row.fim_em).getTime() : Number.POSITIVE_INFINITY;
    return ["ativa", "ativo"].includes(status) && starts <= now && ends >= now;
  }).length;
  const scheduled = campaigns.filter((row) => row.inicio_em && new Date(row.inicio_em).getTime() > now).length;
  const partnerCampaigns = campaigns.filter((row) => Boolean(row.id_parceiro)).length;
  const internalCampaigns = campaigns.filter((row) => row.origem === "salao_premium" || !row.id_parceiro).length;

  const rows: AdminTableRow[] = campaigns.map((row) => {
    const activeCreatives = (row.parceria_criativos || []).filter((item) => item.ativo !== false).length;
    return {
      campanha: row.nome || "Campanha sem nome",
      anunciante: row.id_parceiro ? partnerName(row.parceiros_comerciais) : "Salão Premiun",
      publico: listLabel(row.publico),
      exibicao: listLabel(row.locais_exibicao),
      status: row.status || "rascunho",
      periodo: `${formatDate(row.inicio_em)} → ${formatDate(row.fim_em)}`,
      criativos: activeCreatives,
      acao: "Editar",
      acao_tipo: "parceria_campaign_edit",
      acao_id: row.id,
    };
  });

  return {
    title: "Campanhas e anúncios",
    description:
      "Campanhas reais exibidas no painel, App Cliente, App Profissional e área de parceiros. Esta tela usa a mesma fonte de dados dos anúncios publicados.",
    kpis: [
      { label: "Campanhas", value: String(campaigns.length), hint: "Até 100 campanhas mais recentes", tone: "blue" },
      { label: "Ativas agora", value: String(active), hint: "Dentro do período de exibição", tone: active ? "green" : "amber" },
      { label: "Agendadas", value: String(scheduled), hint: "Com início futuro", tone: scheduled ? "blue" : undefined },
      { label: "Parceiros / internas", value: `${partnerCampaigns} / ${internalCampaigns}`, hint: "Origem das campanhas", tone: "blue" },
    ],
    diagnostics: [
      {
        label: "Fonte dos anúncios",
        value: "Unificada",
        detail: "A listagem agora lê parceria_campanhas, a mesma base usada pelo módulo Parcerias e pelos popups de publicidade.",
        tone: "green",
        href: "/admin-master/parcerias",
      },
      {
        label: "Criativos",
        value: String(campaigns.reduce((sum, row) => sum + (row.parceria_criativos || []).filter((item) => item.ativo !== false).length, 0)),
        detail: "Somente a contagem dos criativos é carregada junto da campanha; nenhuma imagem é baixada para montar esta tabela.",
        tone: "blue",
      },
      {
        label: "Carga no Supabase",
        value: "Baixa",
        detail: "Uma consulta limitada traz campanha, anunciante e contagem de criativos para esta visão administrativa.",
        tone: "green",
      },
    ],
    rows,
    columns: ["campanha", "anunciante", "publico", "exibicao", "status", "periodo", "criativos", "acao"],
    actions: ["Criar campanha", "Abrir parcerias"],
  };
}
