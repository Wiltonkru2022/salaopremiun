import { NextRequest, NextResponse } from "next/server";
import {
  AuthzError,
  requireSalaoPermission,
} from "@/lib/auth/require-salao-permission";
import {
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { reportOperationalIncident } from "@/lib/monitoring/operational-incidents";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  AcaoProduto,
  ProdutoProcessarBody,
  ProdutoPayload,
} from "@/types/produtos";

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

function sanitizeMoney(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
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

function sanitizeBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  return fallback;
}

function resolveHttpStatus(error: unknown) {
  const candidate = error as { code?: string } | null;
  if (!candidate?.code) return 500;
  if (candidate.code === "P0001") return 400;
  if (candidate.code === "23514") return 409;
  return 500;
}

function buildProdutoPayload(idSalao: string, produto: ProdutoPayload) {
  const nome = sanitizeText(produto.nome);
  if (!nome) {
    throw new Error("Informe o nome do produto.");
  }

  const ativo = sanitizeBoolean(produto.ativo, true);

  return {
    id_salao: idSalao,
    nome,
    sku: sanitizeText(produto.sku),
    codigo_barras: sanitizeText(produto.codigo_barras),
    marca: sanitizeText(produto.marca),
    linha: sanitizeText(produto.linha),
    unidade_medida: sanitizeText(produto.unidade_medida) || "un",
    quantidade_por_embalagem: sanitizeNumber(produto.quantidade_por_embalagem),
    preco_custo: sanitizeMoney(produto.preco_custo),
    custos_extras: sanitizeMoney(produto.custos_extras),
    custo_por_dose: sanitizeMoney(produto.custo_por_dose),
    dose_padrao: sanitizeNumber(produto.dose_padrao),
    unidade_dose: sanitizeText(produto.unidade_dose),
    preco_venda: sanitizeMoney(produto.preco_venda),
    margem_lucro_percentual: sanitizeMoney(produto.margem_lucro_percentual),
    estoque_atual: sanitizeNumber(produto.estoque_atual),
    estoque_minimo: sanitizeNumber(produto.estoque_minimo),
    estoque_maximo: sanitizeOptionalNumber(produto.estoque_maximo),
    data_validade: sanitizeText(produto.data_validade),
    lote: sanitizeText(produto.lote),
    destinacao: sanitizeText(produto.destinacao) || "uso_interno",
    categoria: sanitizeText(produto.categoria),
    comissao_revenda_percentual: sanitizeMoney(
      produto.comissao_revenda_percentual
    ),
    fornecedor_nome: sanitizeText(produto.fornecedor_nome),
    fornecedor_contato_nome: sanitizeText(produto.fornecedor_contato_nome),
    fornecedor_telefone: sanitizeText(produto.fornecedor_telefone),
    fornecedor_whatsapp: sanitizeText(produto.fornecedor_whatsapp),
    prazo_medio_entrega_dias: sanitizeOptionalNumber(
      produto.prazo_medio_entrega_dias
    ),
    observacoes: sanitizeText(produto.observacoes),
    foto_url: sanitizeText(produto.foto_url),
    ativo,
    status: ativo ? "ativo" : "inativo",
  };
}

async function assertProdutoPodeSerExcluido(params: {
  idSalao: string;
  idProduto: string;
}) {
  const supabaseAdmin = getSupabaseAdmin();

  const [
    { count: movimentacoesCount, error: movimentacoesError },
    { count: consumoServicoCount, error: consumoServicoError },
    { count: comandaItensCount, error: comandaItensError },
  ] = await Promise.all([
    supabaseAdmin
      .from("produtos_movimentacoes")
      .select("id", { count: "exact", head: true })
      .eq("id_salao", params.idSalao)
      .eq("id_produto", params.idProduto),
    supabaseAdmin
      .from("produto_servico_consumo")
      .select("id", { count: "exact", head: true })
      .eq("id_salao", params.idSalao)
      .eq("id_produto", params.idProduto),
    supabaseAdmin
      .from("comanda_itens")
      .select("id", { count: "exact", head: true })
      .eq("id_salao", params.idSalao)
      .eq("id_produto", params.idProduto),
  ]);

  if (movimentacoesError) throw movimentacoesError;
  if (consumoServicoError) throw consumoServicoError;
  if (comandaItensError) throw comandaItensError;

  if ((movimentacoesCount || 0) > 0) {
    throw new Error(
      "Este produto ja tem historico de estoque. Inative o cadastro em vez de excluir."
    );
  }

  if ((comandaItensCount || 0) > 0) {
    throw new Error(
      "Este produto ja foi usado em comandas. Inative o cadastro em vez de excluir."
    );
  }

  if ((consumoServicoCount || 0) > 0) {
    throw new Error(
      "Este produto esta vinculado ao consumo de servicos. Remova os vinculos antes de excluir."
    );
  }
}

export async function POST(req: NextRequest) {
  let idSalao = "";
  let acaoRaw = "";

  try {
    const body = (await req.json()) as ProdutoProcessarBody;
    idSalao = sanitizeUuid(body.idSalao) || "";
    acaoRaw = String(body.acao || "").trim().toLowerCase();
    const acao = acaoRaw as AcaoProduto;

    if (!idSalao) {
      return NextResponse.json({ error: "Salao obrigatorio." }, { status: 400 });
    }

    if (!["salvar", "alterar_status", "excluir"].includes(acao)) {
      return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    await requireSalaoPermission(idSalao, "produtos_ver", {
      allowedNiveis: ["admin", "gerente"],
    });
    await assertCanMutatePlanFeature(idSalao, "produtos");

    const supabaseAdmin = getSupabaseAdmin();
    const produto = body.produto || {};

    if (acao === "salvar") {
      const payload = buildProdutoPayload(idSalao, produto);
      const idProduto = sanitizeUuid(produto.id);

      if (idProduto) {
        const { data, error } = await supabaseAdmin
          .from("produtos")
          .update(payload)
          .eq("id", idProduto)
          .eq("id_salao", idSalao)
          .select("id")
          .maybeSingle();

        if (error) {
          console.error("Erro ao atualizar produto:", error);
          return NextResponse.json(
            { error: error.message || "Erro ao atualizar produto." },
            { status: resolveHttpStatus(error) }
          );
        }

        if (!data?.id) {
          return NextResponse.json(
            { error: "Produto nao encontrado para atualizacao." },
            { status: 404 }
          );
        }

        return NextResponse.json({ ok: true, idProduto: data.id });
      }

      const { data, error } = await supabaseAdmin
        .from("produtos")
        .insert(payload)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("Erro ao criar produto:", error);
        return NextResponse.json(
          { error: error.message || "Erro ao criar produto." },
          { status: resolveHttpStatus(error) }
        );
      }

      return NextResponse.json({ ok: true, idProduto: data?.id || null });
    }

    const idProduto = sanitizeUuid(produto.id);
    if (!idProduto) {
      return NextResponse.json(
        { error: "Produto obrigatorio para esta acao." },
        { status: 400 }
      );
    }

    if (acao === "alterar_status") {
      const ativo = sanitizeBoolean(produto.ativo, true);
      const { data, error } = await supabaseAdmin
        .from("produtos")
        .update({
          ativo,
          status: ativo ? "ativo" : "inativo",
        })
        .eq("id", idProduto)
        .eq("id_salao", idSalao)
        .select("id, ativo, status")
        .maybeSingle();

      if (error) {
        console.error("Erro ao alterar status do produto:", error);
        return NextResponse.json(
          { error: error.message || "Erro ao alterar status do produto." },
          { status: resolveHttpStatus(error) }
        );
      }

      if (!data?.id) {
        return NextResponse.json(
          { error: "Produto nao encontrado para alterar status." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        idProduto: data.id,
        ativo: data.ativo,
        status: data.status,
      });
    }

    await assertProdutoPodeSerExcluido({ idSalao, idProduto });

    const { error } = await supabaseAdmin.rpc("fn_excluir_produto_catalogo", {
      p_id_salao: idSalao,
      p_id_produto: idProduto,
    });

    if (error) {
      console.error("Erro ao excluir produto:", error);
      return NextResponse.json(
        { error: error.message || "Erro ao excluir produto." },
        { status: resolveHttpStatus(error) }
      );
    }

    return NextResponse.json({ ok: true, idProduto });
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

    if (idSalao) {
      try {
        await reportOperationalIncident({
          supabaseAdmin: getSupabaseAdmin(),
          key: `produtos:processar:${acaoRaw || "desconhecida"}:${idSalao}`,
          module: "produtos",
          title: "Processamento de produto falhou",
          description:
            error instanceof Error
              ? error.message
              : "Erro interno ao processar produto.",
          severity: "alta",
          idSalao,
          details: {
            acao: ["salvar", "alterar_status", "excluir"].includes(acaoRaw)
              ? acaoRaw
              : null,
            route: "/api/produtos/processar",
          },
        });
      } catch (incidentError) {
        console.error(
          "Falha ao registrar incidente operacional de produtos:",
          incidentError
        );
      }
    }

    console.error("Erro geral ao processar produto:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao processar produto.",
      },
      { status: 500 }
    );
  }
}
