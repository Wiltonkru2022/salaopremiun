import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type CampaignPublicService = {
  id: string;
  nome: string;
  preco: number | null;
  tipoBeneficio: string;
  valorBeneficio: number | null;
  brindeDescricao: string | null;
  precoCampanha: number | null;
  beneficioLabel: string;
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function benefitLabel(params: {
  tipo: string;
  valor: number | null;
  preco: number | null;
  brinde?: string | null;
}) {
  if (params.tipo === "preco_fixo" && params.valor !== null) {
    return `por ${money(params.valor)}`;
  }
  if (params.tipo === "desconto_valor" && params.valor !== null) {
    return `${money(params.valor)} de desconto`;
  }
  if (params.tipo === "brinde") {
    return params.brinde || "brinde especial";
  }
  if (params.valor !== null) return `${params.valor}% de desconto`;
  return "beneficio especial";
}

function campaignPrice(params: {
  tipo: string;
  valor: number | null;
  preco: number | null;
}) {
  if (params.preco === null || params.valor === null) return null;
  if (params.tipo === "preco_fixo") return params.valor;
  if (params.tipo === "desconto_valor") return Math.max(0, params.preco - params.valor);
  if (params.tipo === "desconto_percentual") {
    return Math.max(0, params.preco - params.preco * (params.valor / 100));
  }
  return params.preco;
}

export async function loadPublicCampaign(slugOrCode: string) {
  const key = String(slugOrCode || "").trim();
  if (!key) return null;

  const supabase = getSupabaseAdmin();
  const { data: campanha } = await (supabase as any)
    .from("cupons_salao")
    .select(
      "id, id_salao, codigo, nome, descricao, descricao_interna, mensagem_cliente, tipo_desconto, valor_desconto, valido_de, valido_ate, ativo, slug, status_campanha, publico_tipo, limite_uso_total, limite_uso_cliente, limite_uso_dia, resgate_token, saloes(id, nome, nome_fantasia, app_cliente_slug, logo_url, foto_capa_url)"
    )
    .or(`slug.eq.${key},codigo.eq.${key.toUpperCase()}`)
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (!campanha?.id) return null;

  const idCampanha = String(campanha.id);
  const [{ data: servicos }, { count: usos }, { count: cliques }, { count: agendamentos }] =
    await Promise.all([
      (supabase as any)
        .from("cupom_salao_servicos")
        .select(
          "id_servico, tipo_beneficio, valor_beneficio, brinde_descricao, limite_uso_servico, servicos(id, nome, preco, preco_padrao, duracao_minutos, app_cliente_visivel, ativo)"
        )
        .eq("id_cupom", idCampanha)
        .eq("id_salao", campanha.id_salao)
        .limit(80),
      (supabase as any)
        .from("cupom_salao_usos")
        .select("id", { count: "exact", head: true })
        .eq("id_cupom", idCampanha),
      (supabase as any)
        .from("campanha_eventos")
        .select("id", { count: "exact", head: true })
        .eq("id_cupom", idCampanha)
        .eq("tipo", "clique"),
      (supabase as any)
        .from("campanha_eventos")
        .select("id", { count: "exact", head: true })
        .eq("id_cupom", idCampanha)
        .eq("tipo", "agendamento"),
    ]);

  const serviceRows = ((servicos || []) as Array<Record<string, any>>)
    .map((row) => {
      const servico = Array.isArray(row.servicos) ? row.servicos[0] : row.servicos;
      if (!servico?.id || servico.ativo === false || servico.app_cliente_visivel === false) {
        return null;
      }
      const precoRaw = Number(servico.preco_padrao ?? servico.preco);
      const preco = Number.isFinite(precoRaw) ? precoRaw : null;
      const tipo = String(row.tipo_beneficio || "desconto_percentual");
      const valorRaw = Number(row.valor_beneficio);
      const valor = Number.isFinite(valorRaw) ? valorRaw : null;
      return {
        id: String(servico.id),
        nome: String(servico.nome || "Serviço"),
        preco,
        tipoBeneficio: tipo,
        valorBeneficio: valor,
        brindeDescricao: String(row.brinde_descricao || "").trim() || null,
        precoCampanha: campaignPrice({ tipo, valor, preco }),
        beneficioLabel: benefitLabel({
          tipo,
          valor,
          preco,
          brinde: String(row.brinde_descricao || "").trim() || null,
        }),
      };
    })
    .filter(Boolean) as CampaignPublicService[];

  return {
    id: idCampanha,
    idSalao: String(campanha.id_salao),
    codigo: String(campanha.codigo || ""),
    slug: String(campanha.slug || campanha.codigo || ""),
    nome: String(campanha.nome || "Campanha"),
    descricao: String(campanha.mensagem_cliente || campanha.descricao || "").trim(),
    validoDe: String(campanha.valido_de || "").slice(0, 10) || null,
    validoAte: String(campanha.valido_ate || "").slice(0, 10) || null,
    status: String(campanha.status_campanha || "ativa"),
    resgateToken: String(campanha.resgate_token || ""),
    limiteTotal: Number(campanha.limite_uso_total || 0) || null,
    usos: Number(usos || 0),
    cliques: Number(cliques || 0),
    agendamentos: Number(agendamentos || 0),
    services: serviceRows,
    salao: Array.isArray(campanha.saloes) ? campanha.saloes[0] : campanha.saloes,
  };
}

export function getCampaignAvailability(campaign: Awaited<ReturnType<typeof loadPublicCampaign>>) {
  if (!campaign) return { ok: false, reason: "not_found" };
  const today = new Date().toISOString().slice(0, 10);
  if (campaign.status !== "ativa") return { ok: false, reason: campaign.status };
  if (campaign.validoDe && campaign.validoDe > today) return { ok: false, reason: "not_started" };
  if (campaign.validoAte && campaign.validoAte < today) return { ok: false, reason: "expired" };
  if (campaign.limiteTotal && campaign.usos >= campaign.limiteTotal) {
    return { ok: false, reason: "sold_out" };
  }
  return { ok: true, reason: "active" };
}

export async function registerCampaignClick(params: {
  idCampanha: string;
  idSalao: string;
  metadata?: Record<string, unknown>;
}) {
  await (getSupabaseAdmin() as any).from("campanha_eventos").insert({
    id_salao: params.idSalao,
    id_cupom: params.idCampanha,
    tipo: "clique",
    metadata: params.metadata || {},
  });
}
