import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  assertSalonCanAppearInClientApp,
  type ClientAppEligibleSalon,
} from "@/lib/client-app/eligibility";

export type ClientAppSalonListItem = ClientAppEligibleSalon;

export type ClientAppProfessionalListItem = {
  id: string;
  nome: string;
  especialidade: string | null;
  fotoUrl: string | null;
  bio: string | null;
};

export type ClientAppServiceListItem = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  duracaoMinutos: number | null;
};

export type ClientAppReviewListItem = {
  id: string;
  clienteNome: string;
  nota: number;
  comentario: string | null;
  createdAt: string;
};

export type ClientAppSalonDetail = ClientAppEligibleSalon & {
  profissionais: ClientAppProfessionalListItem[];
  servicos: ClientAppServiceListItem[];
  avaliacoes: ClientAppReviewListItem[];
};

function normalizeSearch(value?: string) {
  return String(value || "").trim().slice(0, 60);
}

function parsePrice(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

const listVisibleClientAppSaloesCached = unstable_cache(
  async (search: string, limit: number) => {
    const term = normalizeSearch(search);
    const pageSize = Math.min(Math.max(limit, 1), 24);
    const supabaseAdmin = getSupabaseAdmin();

    let query: any = supabaseAdmin
      .from("saloes")
      .select(
        [
          "id",
          "nome",
          "nome_fantasia",
          "cidade",
          "bairro",
          "logo_url",
          "descricao_publica",
          "foto_capa_url",
          "estacionamento",
          "formas_pagamento_publico",
          "status",
          "app_cliente_publicado",
          "assinaturas!inner(plano,status)",
        ].join(",")
      )
      .eq("status", "ativo")
      .eq("app_cliente_publicado", true)
      .eq("assinaturas.status", "ativo")
      .eq("assinaturas.plano", "premium")
      .order("nome", { ascending: true })
      .limit(pageSize);

    if (term) {
      query = query.or(
        `nome.ilike.%${term}%,nome_fantasia.ilike.%${term}%,cidade.ilike.%${term}%,bairro.ilike.%${term}%`
      );
    }

    const { data, error } = await query;

    if (error || !data) {
      return [] as ClientAppSalonListItem[];
    }

    return ((data as unknown as Array<Record<string, unknown>>) || []).map((row) => ({
      id: String(row.id || ""),
      nome:
        String(row.nome_fantasia || "").trim() ||
        String(row.nome || "").trim() ||
        "Salao Premium",
      cidade: String(row.cidade || "").trim() || null,
      bairro: String(row.bairro || "").trim() || null,
      logoUrl: String(row.logo_url || "").trim() || null,
      fotoCapaUrl: String(row.foto_capa_url || "").trim() || null,
      descricaoPublica: String(row.descricao_publica || "").trim() || null,
      estacionamento: Boolean(row.estacionamento),
      formasPagamento: Array.isArray(row.formas_pagamento_publico)
        ? row.formas_pagamento_publico
            .map((item) => String(item || "").trim())
            .filter(Boolean)
        : [],
    }));
  },
  ["client-app-visible-saloes"],
  {
    revalidate: 60,
    tags: ["client-app-saloes"],
  }
);

export async function listVisibleClientAppSaloes(params?: {
  search?: string;
  limit?: number;
}) {
  return listVisibleClientAppSaloesCached(
    normalizeSearch(params?.search),
    params?.limit ?? 12
  );
}

const getClientAppSalonDetailCached = unstable_cache(
  async (idSalao: string) => {
    const salao = await assertSalonCanAppearInClientApp(idSalao);
    const supabaseAdmin = getSupabaseAdmin();

    const [profissionaisResult, servicosResult, avaliacoesResult] =
      await Promise.allSettled([
        (supabaseAdmin as any)
          .from("profissionais")
          .select("id, nome, nome_exibicao, especialidade_publica, bio_publica, foto_url")
          .eq("id_salao", idSalao)
          .eq("ativo", true)
          .eq("app_cliente_visivel", true)
          .or("eh_assistente.is.null,eh_assistente.eq.false")
          .order("ordem_agenda", { ascending: true })
          .order("nome", { ascending: true })
          .limit(16),
        (supabaseAdmin as any)
          .from("servicos")
          .select("id, nome, descricao_publica, descricao, preco, duracao, duracao_minutos")
          .eq("id_salao", idSalao)
          .eq("ativo", true)
          .eq("app_cliente_visivel", true)
          .order("nome", { ascending: true })
          .limit(40),
        (supabaseAdmin as any)
          .from("clientes_avaliacoes")
          .select("id, nota, comentario, created_at, clientes(nome)")
          .eq("id_salao", idSalao)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

    const profissionais =
      profissionaisResult.status === "fulfilled"
        ? (((profissionaisResult.value.data || []) as unknown as Array<Record<string, unknown>>) || []).map(
            (item) => ({
              id: String(item.id || ""),
              nome:
                String(item.nome_exibicao || "").trim() ||
                String(item.nome || "").trim() ||
                "Profissional",
              especialidade:
                String(item.especialidade_publica || "").trim() || null,
              fotoUrl: String(item.foto_url || "").trim() || null,
              bio: String(item.bio_publica || "").trim() || null,
            })
          )
        : [];

    const servicos =
      servicosResult.status === "fulfilled"
        ? (((servicosResult.value.data || []) as unknown as Array<Record<string, unknown>>) || []).map(
            (item) => ({
              id: String(item.id || ""),
              nome: String(item.nome || "").trim() || "Servico",
              descricao:
                String(item.descricao_publica || item.descricao || "").trim() ||
                null,
              preco: parsePrice(item.preco),
              duracaoMinutos:
                Number(item.duracao_minutos ?? item.duracao ?? 0) || null,
            })
          )
        : [];

    const avaliacoes =
      avaliacoesResult.status === "fulfilled"
        ? (((avaliacoesResult.value.data || []) as unknown as Array<Record<string, unknown>>) || []).map(
            (item) => ({
              id: String(item.id || ""),
              clienteNome:
                String(
                  (item.clientes as { nome?: string } | null)?.nome || ""
                ).trim() || "Cliente",
              nota: Number(item.nota ?? 0) || 0,
              comentario: String(item.comentario || "").trim() || null,
              createdAt: String(item.created_at || ""),
            })
          )
        : [];

    return {
      ...salao,
      profissionais,
      servicos,
      avaliacoes,
    } satisfies ClientAppSalonDetail;
  },
  ["client-app-salon-detail"],
  {
    revalidate: 60,
    tags: ["client-app-saloes"],
  }
);

export async function getClientAppSalonDetail(idSalao: string) {
  return getClientAppSalonDetailCached(idSalao);
}

export async function listClienteAppAppointments(params: {
  idCliente: string;
  idSalao: string;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("agendamentos")
    .select(
      "id, data, hora_inicio, hora_fim, status, observacoes, servicos(nome), profissionais(nome, nome_exibicao)"
    )
    .eq("id_salao", params.idSalao)
    .eq("cliente_id", params.idCliente)
    .order("data", { ascending: false })
    .order("hora_inicio", { ascending: false })
    .limit(20);

  if (error || !data) {
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((item) => ({
    id: String(item.id || ""),
    data: String(item.data || ""),
    horaInicio: String(item.hora_inicio || ""),
    horaFim: String(item.hora_fim || ""),
    status: String(item.status || "").trim() || "pendente",
    observacoes: String(item.observacoes || "").trim() || null,
    servicoNome:
      String((item.servicos as { nome?: string } | null)?.nome || "").trim() ||
      "Servico",
    profissionalNome:
      String(
        (item.profissionais as { nome_exibicao?: string; nome?: string } | null)
          ?.nome_exibicao ||
          (item.profissionais as { nome_exibicao?: string; nome?: string } | null)
            ?.nome ||
          ""
      ).trim() || "Profissional",
  }));
}
