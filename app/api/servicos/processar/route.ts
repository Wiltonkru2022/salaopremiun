import { NextRequest, NextResponse } from "next/server";
import {
  AuthzError,
  requireSalaoPermission,
} from "@/lib/auth/require-salao-permission";
import {
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type AcaoServico = "salvar" | "alterar_status" | "excluir";

type ServicoPayload = {
  id?: string | null;
  nome?: string | null;
  id_categoria?: string | null;
  categoria?: string | null;
  descricao?: string | null;
  gatilho_retorno_dias?: number | null;
  duracao_minutos?: number | null;
  pausa_minutos?: number | null;
  recurso_nome?: string | null;
  preco_padrao?: number | null;
  preco_variavel?: boolean | null;
  preco_minimo?: number | null;
  custo_produto?: number | null;
  comissao_percentual_padrao?: number | null;
  comissao_assistente_percentual?: number | null;
  base_calculo?: string | null;
  desconta_taxa_maquininha?: boolean | null;
  exige_avaliacao?: boolean | null;
  ativo?: boolean | null;
  status?: string | null;
};

type VinculoPayload = {
  id_profissional?: string | null;
  ativo?: boolean | null;
  duracao_minutos?: number | null;
  preco_personalizado?: number | null;
  comissao_percentual?: number | null;
  comissao_assistente_percentual?: number | null;
  base_calculo?: string | null;
  desconta_taxa_maquininha?: boolean | null;
};

type ConsumoPayload = {
  id_produto?: string | null;
  quantidade_consumo?: number | null;
  unidade_medida?: string | null;
  custo_estimado?: number | null;
  ativo?: boolean | null;
};

type BodyPayload = {
  idSalao?: string | null;
  acao?: AcaoServico | null;
  servico?: ServicoPayload | null;
  novaCategoria?: string | null;
  vinculos?: VinculoPayload[] | null;
  consumos?: ConsumoPayload[] | null;
};

type CategoriaServicoResult = {
  id: string;
  nome: string;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUuid(value: unknown) {
  const parsed = String(value || "").trim();
  return UUID_REGEX.test(parsed) ? parsed : null;
}

function sanitizeText(value: unknown) {
  const parsed = String(value || "").trim();
  return parsed || null;
}

function sanitizeBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  return fallback;
}

function sanitizeNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeMoney(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function sanitizeOptionalMoney(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
}

function sanitizeBaseCalculo(value: unknown, fallback = "bruto") {
  const parsed = String(value || "").trim().toLowerCase();
  return parsed === "liquido" ? "liquido" : fallback;
}

function sanitizeOptionalBaseCalculo(value: unknown) {
  const parsed = String(value || "").trim().toLowerCase();
  if (!parsed) return null;
  return parsed === "liquido" ? "liquido" : "bruto";
}

function resolveHttpStatus(error: unknown) {
  const candidate = error as { code?: string } | null;
  if (!candidate?.code) return 500;
  if (candidate.code === "P0001") return 400;
  if (candidate.code === "23514") return 409;
  return 500;
}

async function resolverCategoria(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  idSalao: string;
  idCategoria: string | null;
  novaCategoria: string | null;
}) {
  const { supabaseAdmin, idSalao, idCategoria, novaCategoria } = params;

  if (idCategoria === "__nova__" || novaCategoria) {
    const nomeNovaCategoria = sanitizeText(novaCategoria);
    if (!nomeNovaCategoria) {
      throw new Error("Informe o nome da nova categoria.");
    }

    const { data, error } = await supabaseAdmin.rpc(
      "fn_get_or_create_servico_categoria",
      {
        p_id_salao: idSalao,
        p_nome: nomeNovaCategoria,
      }
    );

    if (error) {
      throw error;
    }

    const categoria = (Array.isArray(data) ? data[0] : data) as
      | CategoriaServicoResult
      | null;

    if (!categoria?.id) {
      throw new Error("Nao foi possivel criar a categoria.");
    }

    return categoria;
  }

  const categoriaId = sanitizeUuid(idCategoria);
  if (!categoriaId) return null;

  const { data, error } = await supabaseAdmin
    .from("servicos_categorias")
    .select("id, nome")
    .eq("id", categoriaId)
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    throw new Error("Categoria do servico nao encontrada para este salao.");
  }

  return data as CategoriaServicoResult;
}

function buildServicoPayload(params: {
  idSalao: string;
  servico: ServicoPayload;
  categoria: CategoriaServicoResult | null;
}) {
  const nome = sanitizeText(params.servico.nome);
  if (!nome) {
    throw new Error("Informe o nome do servico.");
  }

  const ativo = sanitizeBoolean(params.servico.ativo, true);

  return {
    id_salao: params.idSalao,
    nome,
    id_categoria: params.categoria?.id || null,
    categoria: params.categoria?.nome || null,
    descricao: sanitizeText(params.servico.descricao),
    gatilho_retorno_dias: sanitizeOptionalNumber(
      params.servico.gatilho_retorno_dias
    ),
    duracao_minutos: sanitizeNumber(params.servico.duracao_minutos),
    pausa_minutos: sanitizeNumber(params.servico.pausa_minutos),
    recurso_nome: sanitizeText(params.servico.recurso_nome),
    preco_padrao: sanitizeMoney(params.servico.preco_padrao),
    preco_variavel: sanitizeBoolean(params.servico.preco_variavel, false),
    preco_minimo: sanitizeOptionalMoney(params.servico.preco_minimo),
    custo_produto: sanitizeMoney(params.servico.custo_produto),
    comissao_percentual_padrao: sanitizeOptionalMoney(
      params.servico.comissao_percentual_padrao
    ),
    comissao_assistente_percentual: sanitizeMoney(
      params.servico.comissao_assistente_percentual
    ),
    base_calculo: sanitizeBaseCalculo(params.servico.base_calculo),
    desconta_taxa_maquininha: sanitizeBoolean(
      params.servico.desconta_taxa_maquininha,
      false
    ),
    exige_avaliacao: sanitizeBoolean(params.servico.exige_avaliacao, false),
    ativo,
    status: ativo ? "ativo" : "inativo",
  };
}

async function normalizarVinculos(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  idSalao: string;
  idServico: string;
  vinculos: VinculoPayload[];
}) {
  const vinculosAtivos = params.vinculos.filter(
    (item) => sanitizeBoolean(item.ativo, false) && sanitizeUuid(item.id_profissional)
  );

  if (vinculosAtivos.length === 0) {
    return [];
  }

  const idsProfissionais = Array.from(
    new Set(
      vinculosAtivos
        .map((item) => sanitizeUuid(item.id_profissional))
        .filter((item): item is string => Boolean(item))
    )
  );

  const { data: profissionais, error } = await params.supabaseAdmin
    .from("profissionais")
    .select("id, tipo_profissional")
    .eq("id_salao", params.idSalao)
    .in("id", idsProfissionais);

  if (error) {
    throw error;
  }

  const profissionaisValidos = new Set(
    (profissionais || [])
      .filter(
        (item) =>
          String(item.tipo_profissional || "profissional").toLowerCase() !==
          "assistente"
      )
      .map((item) => item.id)
  );

  return vinculosAtivos
    .map((item) => {
      const idProfissional = sanitizeUuid(item.id_profissional);
      if (!idProfissional || !profissionaisValidos.has(idProfissional)) {
        return null;
      }

      return {
        id_salao: params.idSalao,
        id_profissional: idProfissional,
        id_servico: params.idServico,
        ativo: true,
        duracao_minutos: sanitizeOptionalNumber(item.duracao_minutos),
        preco_personalizado: sanitizeOptionalMoney(item.preco_personalizado),
        comissao_percentual: sanitizeOptionalMoney(item.comissao_percentual),
        comissao_assistente_percentual: sanitizeOptionalMoney(
          item.comissao_assistente_percentual
        ),
        base_calculo: sanitizeOptionalBaseCalculo(item.base_calculo),
        desconta_taxa_maquininha:
          typeof item.desconta_taxa_maquininha === "boolean"
            ? item.desconta_taxa_maquininha
            : null,
      };
    })
    .filter(
      (
        item
      ): item is {
        id_salao: string;
        id_profissional: string;
        id_servico: string;
        ativo: boolean;
        duracao_minutos: number | null;
        preco_personalizado: number | null;
        comissao_percentual: number | null;
        comissao_assistente_percentual: number | null;
        base_calculo: string | null;
        desconta_taxa_maquininha: boolean | null;
      } => Boolean(item)
    );
}

async function normalizarConsumos(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  idSalao: string;
  idServico: string;
  consumos: ConsumoPayload[];
}) {
  const consumosValidos = params.consumos.filter((item) => {
    const idProduto = sanitizeUuid(item.id_produto);
    return Boolean(idProduto) && sanitizeNumber(item.quantidade_consumo) > 0;
  });

  if (consumosValidos.length === 0) {
    return [];
  }

  const idsProdutos = Array.from(
    new Set(
      consumosValidos
        .map((item) => sanitizeUuid(item.id_produto))
        .filter((item): item is string => Boolean(item))
    )
  );

  const { data: produtos, error } = await params.supabaseAdmin
    .from("produtos")
    .select("id")
    .eq("id_salao", params.idSalao)
    .in("id", idsProdutos);

  if (error) {
    throw error;
  }

  const produtosValidos = new Set((produtos || []).map((item) => item.id));

  return consumosValidos
    .map((item) => {
      const idProduto = sanitizeUuid(item.id_produto);
      if (!idProduto || !produtosValidos.has(idProduto)) {
        return null;
      }

      return {
        id_salao: params.idSalao,
        id_servico: params.idServico,
        id_produto: idProduto,
        quantidade_consumo: sanitizeNumber(item.quantidade_consumo),
        unidade_medida: sanitizeText(item.unidade_medida),
        custo_estimado: sanitizeOptionalMoney(item.custo_estimado),
        ativo: sanitizeBoolean(item.ativo, true),
      };
    })
    .filter(
      (
        item
      ): item is {
        id_salao: string;
        id_servico: string;
        id_produto: string;
        quantidade_consumo: number;
        unidade_medida: string | null;
        custo_estimado: number | null;
        ativo: boolean;
      } => Boolean(item)
    );
}

async function salvarServicoCatalogoTransacional(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  idSalao: string;
  idServico: string | null;
  servicoPayload: ReturnType<typeof buildServicoPayload>;
  vinculos: VinculoPayload[];
  consumos: ConsumoPayload[];
}) {
  const { data, error } = await params.supabaseAdmin.rpc(
    "fn_salvar_servico_catalogo_transacional",
    {
      p_id_salao: params.idSalao,
      p_id_servico: params.idServico,
      p_servico: params.servicoPayload,
      p_vinculos: params.vinculos || [],
      p_consumos: params.consumos || [],
    }
  );

  if (error) throw error;

  const result = (Array.isArray(data) ? data[0] : data) as
    | { id_servico?: string | null }
    | string
    | null;
  const idServico =
    typeof result === "string" ? result : result?.id_servico || null;

  if (!idServico) {
    throw new Error("Nao foi possivel obter o servico salvo.");
  }

  return idServico;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BodyPayload;
    const idSalao = sanitizeUuid(body.idSalao);
    const acao = String(body.acao || "").trim().toLowerCase() as AcaoServico;

    if (!idSalao) {
      return NextResponse.json({ error: "Salao obrigatorio." }, { status: 400 });
    }

    if (!["salvar", "alterar_status", "excluir"].includes(acao)) {
      return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    await requireSalaoPermission(idSalao, "servicos_ver", {
      allowedNiveis: ["admin", "gerente"],
    });
    await assertCanMutatePlanFeature(idSalao, "servicos");

    const supabaseAdmin = getSupabaseAdmin();
    const servico = body.servico || {};

    if (acao === "salvar") {
      const categoria = await resolverCategoria({
        supabaseAdmin,
        idSalao,
        idCategoria: String(servico.id_categoria || ""),
        novaCategoria: sanitizeText(body.novaCategoria),
      });

      const payload = buildServicoPayload({
        idSalao,
        servico,
        categoria,
      });

      const idServico = await salvarServicoCatalogoTransacional({
        supabaseAdmin,
        idSalao,
        idServico: sanitizeUuid(servico.id),
        servicoPayload: payload,
        vinculos: body.vinculos || [],
        consumos: body.consumos || [],
      });

      return NextResponse.json({
        ok: true,
        idServico,
        categoria,
      });
    }

    const idServico = sanitizeUuid(servico.id);
    if (!idServico) {
      return NextResponse.json(
        { error: "Servico obrigatorio para esta acao." },
        { status: 400 }
      );
    }

    if (acao === "alterar_status") {
      const ativo = sanitizeBoolean(servico.ativo, true);
      const { data, error } = await supabaseAdmin
        .from("servicos")
        .update({
          ativo,
          status: ativo ? "ativo" : "inativo",
        })
        .eq("id", idServico)
        .eq("id_salao", idSalao)
        .select("id, ativo, status")
        .maybeSingle();

      if (error) {
        console.error("Erro ao alterar status do servico:", error);
        return NextResponse.json(
          { error: error.message || "Erro ao alterar status do servico." },
          { status: resolveHttpStatus(error) }
        );
      }

      if (!data?.id) {
        return NextResponse.json(
          { error: "Servico nao encontrado para alterar status." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        idServico: data.id,
        ativo: data.ativo,
        status: data.status,
      });
    }

    const { error } = await supabaseAdmin.rpc("fn_excluir_servico_catalogo", {
      p_id_salao: idSalao,
      p_id_servico: idServico,
    });

    if (error) {
      console.error("Erro ao excluir servico:", error);
      return NextResponse.json(
        { error: error.message || "Erro ao excluir servico." },
        { status: resolveHttpStatus(error) }
      );
    }

    return NextResponse.json({ ok: true, idServico });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (error instanceof PlanAccessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao processar servico.",
      },
      { status: 500 }
    );
  }
}
