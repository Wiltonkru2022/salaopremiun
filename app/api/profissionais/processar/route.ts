import { NextRequest, NextResponse } from "next/server";
import {
  AuthzError,
  requireSalaoPermission,
} from "@/lib/auth/require-salao-permission";
import {
  assertCanCreateWithinLimit,
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  ProfissionalProcessarBody,
  ProfissionalServicoPayload,
} from "@/types/profissional";

type ProfissionalRow = {
  id: string;
  ativo?: boolean | null;
};

type RegraServicoRow = {
  id_servico: string;
  preco_personalizado?: number | null;
  comissao_percentual?: number | null;
  comissao_assistente_percentual?: number | null;
  base_calculo?: string | null;
  desconta_taxa_maquininha?: boolean | null;
};

const PROFISSIONAL_FIELDS = [
  "nome",
  "nome_social",
  "categoria",
  "cargo",
  "cpf",
  "rg",
  "data_nascimento",
  "telefone",
  "whatsapp",
  "email",
  "endereco",
  "numero",
  "bairro",
  "cidade",
  "estado",
  "cep",
  "especialidades",
  "data_admissao",
  "bio",
  "tipo_profissional",
  "tipo_vinculo",
  "comissao_produto_percentual",
  "pix_tipo",
  "pix_chave",
  "nivel_acesso",
  "status",
  "ativo",
  "dias_trabalho",
  "pausas",
  "foto_url",
] as const;

function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(extra || {}) }, { status });
}

function getString(value: unknown) {
  return String(value || "").trim();
}

function sanitizeProfissionalPayload(
  idSalao: string,
  raw: Record<string, unknown> | undefined
) {
  const input = raw || {};
  const payload: Record<string, unknown> = {
    id_salao: idSalao,
  };

  PROFISSIONAL_FIELDS.forEach((field) => {
    if (field in input) {
      payload[field] = input[field];
    }
  });

  const nome = getString(payload.nome);
  const tipoProfissional =
    getString(payload.tipo_profissional) === "assistente"
      ? "assistente"
      : "profissional";
  const ativo = Boolean(payload.ativo);

  payload.nome = nome;
  payload.tipo_profissional = tipoProfissional;
  payload.nivel_acesso =
    tipoProfissional === "assistente"
      ? "sem_acesso"
      : getString(payload.nivel_acesso) || "proprio";
  payload.status = ativo ? "ativo" : "inativo";
  payload.ativo = ativo;
  payload.comissao_produto_percentual = Number(
    payload.comissao_produto_percentual || 0
  );

  if (!Array.isArray(payload.especialidades)) {
    payload.especialidades = [];
  }

  if (!Array.isArray(payload.dias_trabalho)) {
    payload.dias_trabalho = [];
  }

  if (!Array.isArray(payload.pausas)) {
    payload.pausas = [];
  }

  return {
    payload,
    nome,
    tipoProfissional,
    ativo,
  };
}

function normalizeServicos(input: ProfissionalServicoPayload[] | undefined) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => ({
      id_servico: getString(item.id_servico),
      duracao_minutos: Number(item.duracao_minutos || 0),
      ativo: item.ativo ?? true,
    }))
    .filter((item) => item.id_servico);
}

function normalizeIds(input: string[] | undefined) {
  if (!Array.isArray(input)) return [];
  return Array.from(new Set(input.map((item) => getString(item)).filter(Boolean)));
}

async function validarServicosDoSalao(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  idSalao: string,
  servicos: ReturnType<typeof normalizeServicos>
) {
  const ids = Array.from(new Set(servicos.map((item) => item.id_servico)));
  if (ids.length === 0) return;

  const { data, error } = await supabaseAdmin
    .from("servicos")
    .select("id")
    .eq("id_salao", idSalao)
    .in("id", ids);

  if (error) throw error;

  const idsValidos = new Set((data || []).map((item) => String(item.id)));
  const algumInvalido = ids.some((id) => !idsValidos.has(id));

  if (algumInvalido) {
    throw new PlanAccessError(
      "Existe servico selecionado que nao pertence a este salao.",
      "INVALID_TENANT_SERVICE"
    );
  }
}

async function validarAssistentesDoSalao(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  idSalao: string,
  assistentes: string[]
) {
  if (assistentes.length === 0) return;

  const { data, error } = await supabaseAdmin
    .from("profissionais")
    .select("id")
    .eq("id_salao", idSalao)
    .eq("tipo_profissional", "assistente")
    .in("id", assistentes);

  if (error) throw error;

  const idsValidos = new Set((data || []).map((item) => String(item.id)));
  const algumInvalido = assistentes.some((id) => !idsValidos.has(id));

  if (algumInvalido) {
    throw new PlanAccessError(
      "Existe assistente selecionado que nao pertence a este salao.",
      "INVALID_TENANT_ASSISTANT"
    );
  }
}

async function sincronizarVinculos(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  idSalao: string;
  idProfissional: string;
  tipoProfissional: string;
  servicos: ReturnType<typeof normalizeServicos>;
  assistentes: string[];
}) {
  const {
    supabaseAdmin,
    idSalao,
    idProfissional,
    tipoProfissional,
    servicos,
    assistentes,
  } = params;
  const isAssistenteSalao = tipoProfissional === "assistente";

  if (isAssistenteSalao) {
    await supabaseAdmin
      .from("profissionais_acessos")
      .update({ ativo: false })
      .eq("id_profissional", idProfissional);
  }

  const { data: vinculosAtuais, error: vinculosAtuaisError } =
    await supabaseAdmin
      .from("profissional_servicos")
      .select(
        `
          id_servico,
          preco_personalizado,
          comissao_percentual,
          comissao_assistente_percentual,
          base_calculo,
          desconta_taxa_maquininha
        `
      )
      .eq("id_profissional", idProfissional);

  if (vinculosAtuaisError) throw vinculosAtuaisError;

  const regrasAtuaisPorServico = new Map(
    ((vinculosAtuais || []) as RegraServicoRow[]).map((item) => [
      item.id_servico,
      item,
    ])
  );

  const { error: removeServicosError } = await supabaseAdmin
    .from("profissional_servicos")
    .delete()
    .eq("id_profissional", idProfissional);

  if (removeServicosError) throw removeServicosError;

  if (!isAssistenteSalao && servicos.length > 0) {
    const vinculos = servicos.map((item) => ({
      id_salao: idSalao,
      id_profissional: idProfissional,
      id_servico: item.id_servico,
      duracao_minutos: item.duracao_minutos,
      ativo: Boolean(item.ativo),
      preco_personalizado:
        regrasAtuaisPorServico.get(item.id_servico)?.preco_personalizado ??
        null,
      comissao_percentual:
        regrasAtuaisPorServico.get(item.id_servico)?.comissao_percentual ??
        null,
      comissao_assistente_percentual:
        regrasAtuaisPorServico.get(item.id_servico)
          ?.comissao_assistente_percentual ?? null,
      base_calculo:
        regrasAtuaisPorServico.get(item.id_servico)?.base_calculo ?? null,
      desconta_taxa_maquininha:
        regrasAtuaisPorServico.get(item.id_servico)?.desconta_taxa_maquininha ??
        null,
    }));

    const { error: insertServicosError } = await supabaseAdmin
      .from("profissional_servicos")
      .insert(vinculos);

    if (insertServicosError) throw insertServicosError;
  }

  const { error: removeAssistentesError } = await supabaseAdmin
    .from("profissional_assistentes")
    .delete()
    .eq("id_salao", idSalao)
    .eq("id_profissional", idProfissional);

  if (removeAssistentesError) throw removeAssistentesError;

  if (!isAssistenteSalao && assistentes.length > 0) {
    const vinculosAssistentes = assistentes
      .filter((idAssistente) => idAssistente !== idProfissional)
      .map((idAssistente) => ({
        id_salao: idSalao,
        id_profissional: idProfissional,
        id_assistente: idAssistente,
      }));

    if (vinculosAssistentes.length > 0) {
      const { error: insertAssistentesError } = await supabaseAdmin
        .from("profissional_assistentes")
        .insert(vinculosAssistentes);

      if (insertAssistentesError) throw insertAssistentesError;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ProfissionalProcessarBody;
    const acao = body.acao;
    const idSalao = getString(body.idSalao);
    const idProfissional = getString(body.idProfissional);

    if (!idSalao) {
      return jsonError("Salao nao informado.");
    }

    await requireSalaoPermission(idSalao, "profissionais_ver", {
      allowedNiveis: ["admin", "gerente"],
    });
    await assertCanMutatePlanFeature(idSalao, "profissionais");

    const supabaseAdmin = getSupabaseAdmin();

    if (acao === "atualizar_foto") {
      const fotoUrl = getString(body.foto_url);

      if (!idProfissional || !fotoUrl) {
        return jsonError("Profissional e foto sao obrigatorios.");
      }

      const { error } = await supabaseAdmin
        .from("profissionais")
        .update({ foto_url: fotoUrl, foto: fotoUrl })
        .eq("id", idProfissional)
        .eq("id_salao", idSalao);

      if (error) throw error;

      return NextResponse.json({ ok: true, idProfissional });
    }

    if (acao !== "criar" && acao !== "atualizar") {
      return jsonError("Acao invalida.");
    }

    const { payload, nome, tipoProfissional, ativo } =
      sanitizeProfissionalPayload(idSalao, body.profissional);
    const servicos =
      tipoProfissional === "assistente"
        ? []
        : normalizeServicos(body.servicos);
    const assistentes =
      tipoProfissional === "assistente" ? [] : normalizeIds(body.assistentes);

    if (!nome) {
      return jsonError("Informe o nome do profissional.");
    }

    await validarServicosDoSalao(supabaseAdmin, idSalao, servicos);
    await validarAssistentesDoSalao(supabaseAdmin, idSalao, assistentes);

    let idFinal = idProfissional;

    if (acao === "criar") {
      if (ativo) {
        await assertCanCreateWithinLimit(idSalao, "profissionais");
      }

      const { data, error } = await supabaseAdmin
        .from("profissionais")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;

      idFinal = String(data?.id || "");
    } else {
      if (!idProfissional) {
        return jsonError("Profissional nao informado.");
      }

      const { data: existente, error: existenteError } = await supabaseAdmin
        .from("profissionais")
        .select("id, ativo")
        .eq("id", idProfissional)
        .eq("id_salao", idSalao)
        .maybeSingle();

      if (existenteError) throw existenteError;

      const profissionalExistente = existente as ProfissionalRow | null;

      if (!profissionalExistente?.id) {
        return jsonError("Profissional nao encontrado.", 404);
      }

      if (ativo && profissionalExistente.ativo !== true) {
        await assertCanCreateWithinLimit(idSalao, "profissionais");
      }

      const { error } = await supabaseAdmin
        .from("profissionais")
        .update(payload)
        .eq("id", idProfissional)
        .eq("id_salao", idSalao);

      if (error) throw error;
    }

    if (!idFinal) {
      return jsonError("Nao foi possivel obter o ID do profissional.", 500);
    }

    await sincronizarVinculos({
      supabaseAdmin,
      idSalao,
      idProfissional: idFinal,
      tipoProfissional,
      servicos,
      assistentes,
    });

    return NextResponse.json({ ok: true, idProfissional: idFinal });
  } catch (error) {
    if (error instanceof AuthzError) {
      return jsonError(error.message, error.status);
    }

    if (error instanceof PlanAccessError) {
      return jsonError(error.message, error.status, { code: error.code });
    }

    console.error("ERRO API PROFISSIONAIS PROCESSAR:", error);

    return jsonError("Erro interno ao salvar profissional.", 500);
  }
}
