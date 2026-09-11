import type {
  CatalogoExtra,
  CatalogoProduto,
  CatalogoServico,
  ConfigCaixaSalao,
  ProfissionalResumo,
} from "@/components/caixa/types";
import { createClient } from "@/lib/supabase/client";

type CaixaSupabaseClient = ReturnType<typeof createClient>;

type StaticCatalog = {
  servicosCatalogo: CatalogoServico[];
  extrasCatalogo: CatalogoExtra[];
  profissionaisCatalogo: ProfissionalResumo[];
};

type Timed<T> = { expiresAt: number; value: T };

const STATIC_CATALOG_TTL_MS = 120_000;
const CONFIG_TTL_MS = 180_000;
const staticCatalogCache = new Map<string, Timed<StaticCatalog>>();
const configCache = new Map<string, Timed<ConfigCaixaSalao | null>>();

export function invalidarCacheCatalogoCaixa(idSalao: string) {
  staticCatalogCache.delete(idSalao);
  configCache.delete(idSalao);
}

export async function carregarConfiguracoesCaixaOtimizada(
  supabase: CaixaSupabaseClient,
  idSalao: string
) {
  const cached = configCache.get(idSalao);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const { data, error } = await supabase
    .from("configuracoes_salao")
    .select("id_salao, exigir_cliente_na_venda, repassa_taxa_cliente, taxa_maquininha_credito, taxa_maquininha_debito, taxa_maquininha_pix, taxa_maquininha_transferencia, taxa_maquininha_boleto, taxa_maquininha_outro, taxa_credito_1x, taxa_credito_2x, taxa_credito_3x, taxa_credito_4x, taxa_credito_5x, taxa_credito_6x, taxa_credito_7x, taxa_credito_8x, taxa_credito_9x, taxa_credito_10x, taxa_credito_11x, taxa_credito_12x")
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (error) {
    console.error("Erro ao carregar configuracoes do caixa:", error);
    return null;
  }

  const value = (data as ConfigCaixaSalao) || null;
  configCache.set(idSalao, { expiresAt: Date.now() + CONFIG_TTL_MS, value });
  return value;
}

async function carregarCatalogoEstatico(
  supabase: CaixaSupabaseClient,
  idSalao: string
): Promise<StaticCatalog> {
  const cached = staticCatalogCache.get(idSalao);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const [servicosRes, extrasRes, profissionaisRes, assistentesRes] = await Promise.all([
    supabase
      .from("servicos")
      .select("id, nome, preco, preco_padrao, comissao_percentual, comissao_percentual_padrao, comissao_assistente_percentual, base_calculo, desconta_taxa_maquininha, eh_combo, combo_resumo")
      .eq("id_salao", idSalao)
      .eq("status", "ativo")
      .order("nome", { ascending: true }),
    supabase
      .from("itens_extras")
      .select("id, nome, preco_venda")
      .eq("id_salao", idSalao)
      .eq("ativo", true)
      .order("nome", { ascending: true }),
    supabase
      .from("profissionais")
      .select("id, nome, comissao_percentual, tipo_profissional")
      .eq("id_salao", idSalao)
      .eq("status", "ativo")
      .order("nome", { ascending: true }),
    supabase
      .from("profissional_assistentes")
      .select("id_profissional, id_assistente")
      .eq("id_salao", idSalao)
      .eq("ativo", true),
  ]);

  for (const result of [servicosRes, extrasRes, profissionaisRes, assistentesRes]) {
    if (result.error) throw result.error;
  }

  const assistentesPorProfissional = new Map<string, string[]>();
  for (const vinculo of (assistentesRes.data || []) as Array<{ id_profissional: string | null; id_assistente: string | null }>) {
    if (!vinculo.id_profissional || !vinculo.id_assistente) continue;
    const lista = assistentesPorProfissional.get(vinculo.id_profissional) || [];
    lista.push(vinculo.id_assistente);
    assistentesPorProfissional.set(vinculo.id_profissional, lista);
  }

  const value: StaticCatalog = {
    servicosCatalogo: (servicosRes.data || []) as CatalogoServico[],
    extrasCatalogo: (extrasRes.data || []) as CatalogoExtra[],
    profissionaisCatalogo: ((profissionaisRes.data || []) as ProfissionalResumo[]).map((profissional) => ({
      ...profissional,
      assistentes_ids: assistentesPorProfissional.get(profissional.id) || [],
    })),
  };

  staticCatalogCache.set(idSalao, { expiresAt: Date.now() + STATIC_CATALOG_TTL_MS, value });
  return value;
}

export async function carregarCatalogosCaixaOtimizado(
  supabase: CaixaSupabaseClient,
  idSalao: string
) {
  const [estatico, produtosRes] = await Promise.all([
    carregarCatalogoEstatico(supabase, idSalao),
    supabase
      .from("produtos")
      .select("id, nome, preco_venda")
      .eq("id_salao", idSalao)
      .eq("status", "ativo")
      .order("nome", { ascending: true }),
  ]);

  if (produtosRes.error) throw produtosRes.error;

  return {
    ...estatico,
    produtosCatalogo: (produtosRes.data || []) as CatalogoProduto[],
  };
}
