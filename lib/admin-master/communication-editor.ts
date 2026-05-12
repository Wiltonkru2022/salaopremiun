import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AdminCampaignEditorRow = {
  id: string;
  nome: string;
  tipo: string;
  publicoTipo: string;
  objetivo: string | null;
  status: string;
  inicioEm: string | null;
  fimEm: string | null;
  filtrosJson: string;
};

export type AdminWhatsappPackageRow = {
  id: string;
  nome: string;
  preco: number;
  quantidadeCreditos: number;
  ativo: boolean;
};

export type AdminWhatsappTemplateRow = {
  id: string;
  nome: string;
  categoria: string;
  conteudo: string;
  ativo: boolean;
};

function toInputDateTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 16);
}

export async function getAdminCampaignEditorData() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("campanhas")
    .select("id, nome, tipo, publico_tipo, objetivo, status, inicio_em, fim_em, filtros_json")
    .order("criada_em", { ascending: false })
    .limit(80);

  return ((data || []) as {
    id: string;
    nome?: string | null;
    tipo?: string | null;
    publico_tipo?: string | null;
    objetivo?: string | null;
    status?: string | null;
    inicio_em?: string | null;
    fim_em?: string | null;
    filtros_json?: unknown;
  }[]).map((item): AdminCampaignEditorRow => ({
    id: item.id,
    nome: item.nome || "",
    tipo: item.tipo || "marketing",
    publicoTipo: item.publico_tipo || "todos",
    objetivo: item.objetivo || null,
    status: item.status || "rascunho",
    inicioEm: toInputDateTime(item.inicio_em),
    fimEm: toInputDateTime(item.fim_em),
    filtrosJson: JSON.stringify(item.filtros_json || {}, null, 2),
  }));
}

export async function getAdminWhatsappEditorData() {
  const supabase = getSupabaseAdmin();
  const [{ data: packages }, { data: templates }] = await Promise.all([
    supabase
      .from("whatsapp_pacotes")
      .select("id, nome, preco, quantidade_creditos, ativo")
      .order("criado_em", { ascending: false })
      .limit(80),
    supabase
      .from("whatsapp_templates")
      .select("id, nome, categoria, conteudo, ativo")
      .order("criado_em", { ascending: false })
      .limit(80),
  ]);

  return {
    packages: ((packages || []) as {
      id: string;
      nome?: string | null;
      preco?: number | null;
      quantidade_creditos?: number | null;
      ativo?: boolean | null;
    }[]).map((item): AdminWhatsappPackageRow => ({
      id: item.id,
      nome: item.nome || "",
      preco: Number(item.preco || 0),
      quantidadeCreditos: Number(item.quantidade_creditos || 0),
      ativo: item.ativo !== false,
    })),
    templates: ((templates || []) as {
      id: string;
      nome?: string | null;
      categoria?: string | null;
      conteudo?: string | null;
      ativo?: boolean | null;
    }[]).map((item): AdminWhatsappTemplateRow => ({
      id: item.id,
      nome: item.nome || "",
      categoria: item.categoria || "marketing",
      conteudo: item.conteudo || "",
      ativo: item.ativo !== false,
    })),
  };
}
