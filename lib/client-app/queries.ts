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
  profissionaisPermitidos: string[];
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
  intervaloAgendaMinutos: number;
};

export type ClientAppAppointmentListItem = {
  id: string;
  idSalao: string;
  salaoNome: string;
  salaoWhatsapp: string | null;
  salaoTelefone: string | null;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: string;
  observacoes: string | null;
  servicoNome: string;
  profissionalNome: string;
  podeCancelar: boolean;
  podeAvaliar: boolean;
  avaliado: boolean;
};

export type ClientAppProfileData = {
  nome: string;
  email: string;
  telefone: string | null;
  preferenciasGerais: string | null;
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
          "estado",
          "bairro",
          "endereco",
          "numero",
          "cep",
          "logo_url",
          "telefone",
          "whatsapp",
          "descricao_publica",
          "foto_capa_url",
          "latitude",
          "longitude",
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
      estado: String(row.estado || "").trim() || null,
      bairro: String(row.bairro || "").trim() || null,
      endereco: String(row.endereco || "").trim() || null,
      numero: String(row.numero || "").trim() || null,
      cep: String(row.cep || "").trim() || null,
      enderecoCompleto:
        [
          [String(row.endereco || "").trim(), String(row.numero || "").trim()]
            .filter(Boolean)
            .join(", "),
          String(row.bairro || "").trim(),
          [String(row.cidade || "").trim(), String(row.estado || "").trim()]
            .filter(Boolean)
            .join(" - "),
          String(row.cep || "").trim(),
        ]
          .filter(Boolean)
          .join(" | ") || null,
      logoUrl: String(row.logo_url || "").trim() || null,
      fotoCapaUrl: String(row.foto_capa_url || "").trim() || null,
      latitude: Number(row.latitude ?? Number.NaN) || null,
      longitude: Number(row.longitude ?? Number.NaN) || null,
      whatsapp: String(row.whatsapp || "").trim() || null,
      telefone: String(row.telefone || "").trim() || null,
      descricaoPublica: String(row.descricao_publica || "").trim() || null,
      estacionamento: Boolean(row.estacionamento),
      formasPagamento: Array.isArray(row.formas_pagamento_publico)
        ? row.formas_pagamento_publico
            .map((item) => String(item || "").trim())
            .filter(Boolean)
        : [],
    }));
  },
  ["client-app-visible-saloes-v2"],
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

    const [profissionaisResult, servicosResult, avaliacoesResult, vinculosResult, configResult] =
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
        supabaseAdmin
          .from("profissional_servicos")
          .select("id_profissional, id_servico, ativo")
          .eq("id_salao", idSalao)
          .eq("ativo", true),
        supabaseAdmin
          .from("configuracoes_salao")
          .select("intervalo_minutos")
          .eq("id_salao", idSalao)
          .limit(1)
          .maybeSingle(),
      ]);

    const vinculosPorServico = new Map<string, string[]>();

    if (vinculosResult.status === "fulfilled") {
      for (const item of (vinculosResult.value.data || []) as Array<{
        id_profissional?: string | null;
        id_servico?: string | null;
      }>) {
        const idServico = String(item.id_servico || "").trim();
        const idProfissional = String(item.id_profissional || "").trim();
        if (!idServico || !idProfissional) continue;

        const current = vinculosPorServico.get(idServico) || [];
        if (!current.includes(idProfissional)) {
          current.push(idProfissional);
          vinculosPorServico.set(idServico, current);
        }
      }
    }

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
              profissionaisPermitidos:
                vinculosPorServico.get(String(item.id || "").trim()) || [],
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
      intervaloAgendaMinutos:
        configResult.status === "fulfilled"
          ? Number(configResult.value.data?.intervalo_minutos || 15) || 15
          : 15,
    } satisfies ClientAppSalonDetail;
  },
  ["client-app-salon-detail-v2"],
  {
    revalidate: 60,
    tags: ["client-app-saloes"],
  }
);

export async function getClientAppSalonDetail(idSalao: string) {
  return getClientAppSalonDetailCached(idSalao);
}

export async function listClienteAppAppointments(params: { idConta: string }) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: vinculos, error: vinculosError } = await supabaseAdmin
    .from("clientes_auth")
    .select("id_cliente, id_salao, saloes(nome, nome_fantasia, whatsapp, telefone)")
    .eq("app_conta_id", params.idConta)
    .eq("app_ativo", true)
    .limit(40);

  if (vinculosError || !vinculos?.length) {
    return [];
  }

  const clientesIds = Array.from(
    new Set(
      vinculos
        .map((item) => String(item.id_cliente || "").trim())
        .filter(Boolean)
    )
  );

  if (!clientesIds.length) {
    return [];
  }

  const salaoNomeByCliente = new Map<
    string,
    {
      nome: string;
      idSalao: string;
      whatsapp: string | null;
      telefone: string | null;
    }
  >();
  for (const item of vinculos) {
    const idCliente = String(item.id_cliente || "").trim();
    const idSalao = String(item.id_salao || "").trim();
    if (!idCliente || !idSalao) continue;
    const salaoRow = item.saloes as
      | { nome?: string | null; nome_fantasia?: string | null }
      | null;
    salaoNomeByCliente.set(idCliente, {
      idSalao,
      nome:
        String(salaoRow?.nome_fantasia || "").trim() ||
        String(salaoRow?.nome || "").trim() ||
        "Salao Premium",
      whatsapp: String((salaoRow as { whatsapp?: string | null } | null)?.whatsapp || "").trim() || null,
      telefone: String((salaoRow as { telefone?: string | null } | null)?.telefone || "").trim() || null,
    });
  }

  const { data, error } = await supabaseAdmin
    .from("agendamentos")
    .select(
      "id, cliente_id, id_salao, data, hora_inicio, hora_fim, status, observacoes, servicos(nome), profissionais(nome, nome_exibicao)"
    )
    .in("cliente_id", clientesIds)
    .order("data", { ascending: false })
    .order("hora_inicio", { ascending: false })
    .limit(40);

  if (error || !data) {
    return [];
  }

  const rows = data as Array<Record<string, unknown>>;
  const appointmentIds = rows
    .map((item) => String(item.id || "").trim())
    .filter(Boolean);

  const { data: reviewRows } = appointmentIds.length
    ? await (supabaseAdmin as any)
        .from("clientes_avaliacoes")
        .select("id_agendamento")
        .in("id_agendamento", appointmentIds)
    : { data: [] };

  const reviewedIds = new Set(
    ((reviewRows as Array<{ id_agendamento?: string | null }> | null) || [])
      .map((item) => String(item.id_agendamento || "").trim())
      .filter(Boolean)
  );

  return rows.map((item) => {
    const status = String(item.status || "").trim() || "pendente";
    const avaliado = reviewedIds.has(String(item.id || "").trim());
    const clienteId = String(item.cliente_id || "").trim();
    const salaoMeta = salaoNomeByCliente.get(clienteId);
    return {
      id: String(item.id || ""),
      idSalao: salaoMeta?.idSalao || String(item.id_salao || "").trim(),
      salaoNome: salaoMeta?.nome || "Salao Premium",
      salaoWhatsapp: salaoMeta?.whatsapp || null,
      salaoTelefone: salaoMeta?.telefone || null,
      data: String(item.data || ""),
      horaInicio: String(item.hora_inicio || ""),
      horaFim: String(item.hora_fim || ""),
      status,
      observacoes: String(item.observacoes || "").trim() || null,
      servicoNome:
        String((item.servicos as { nome?: string } | null)?.nome || "").trim() ||
        "Servico",
      profissionalNome:
        String(
          (
            item.profissionais as
              | { nome_exibicao?: string; nome?: string }
              | null
          )?.nome_exibicao ||
            (
              item.profissionais as
                | { nome_exibicao?: string; nome?: string }
                | null
            )?.nome ||
            ""
        ).trim() || "Profissional",
      podeCancelar: status === "pendente" || status === "confirmado",
      podeAvaliar:
        !avaliado &&
        (status === "atendido" || status === "aguardando_pagamento"),
      avaliado,
    } satisfies ClientAppAppointmentListItem;
  });
}

export async function getClienteAppProfileData(params: { idConta: string }) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: conta } = await (supabaseAdmin as any)
    .from("clientes_app_auth")
    .select("nome, email, telefone, preferencias_gerais")
    .eq("id", params.idConta)
    .limit(1)
    .maybeSingle();

  return {
    nome: String(conta?.nome || "").trim(),
    email: String(conta?.email || "").trim(),
    telefone: String(conta?.telefone || "").trim() || null,
    preferenciasGerais: String(conta?.preferencias_gerais || "").trim() || null,
  } satisfies ClientAppProfileData;
}
