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

type AcaoProduto = "salvar" | "alterar_status" | "excluir";

type ProdutoPayload = {
  id?: string | null;
  nome?: string | null;
  sku?: string | null;
  codigo_barras?: string | null;
  marca?: string | null;
  linha?: string | null;
  unidade_medida?: string | null;
  quantidade_por_embalagem?: number | null;
  preco_custo?: number | null;
  custos_extras?: number | null;
  custo_por_dose?: number | null;
  dose_padrao?: number | null;
  unidade_dose?: string | null;
  preco_venda?: number | null;
  margem_lucro_percentual?: number | null;
  estoque_atual?: number | null;
  estoque_minimo?: number | null;
  estoque_maximo?: number | null;
  data_validade?: string | null;
  lote?: string | null;
  destinacao?: string | null;
  categoria?: string | null;
  comissao_revenda_percentual?: number | null;
  fornecedor_nome?: string | null;
  fornecedor_contato_nome?: string | null;
  fornecedor_telefone?: string | null;
  fornecedor_whatsapp?: string | null;
  prazo_medio_entrega_dias?: number | null;
  observacoes?: string | null;
  foto_url?: string | null;
  ativo?: boolean | null;
  status?: string | null;
};

type BodyPayload = {
  idSalao?: string | null;
  acao?: AcaoProduto | null;
  produto?: ProdutoPayload | null;
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BodyPayload;
    const idSalao = sanitizeUuid(body.idSalao);
    const acao = String(body.acao || "").trim().toLowerCase() as AcaoProduto;

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
