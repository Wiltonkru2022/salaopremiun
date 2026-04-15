import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Body = {
  idSalao: string;
  idComanda: string;
};

type ConfigRow = {
  repassa_taxa_cliente?: boolean | null;
  desconta_taxa_profissional?: boolean | null;
};

type PagamentoRow = {
  taxa_maquininha_valor?: number | null;
};

type ItemRow = {
  id: string;
  base_calculo_aplicada?: string | null;
  desconta_taxa_maquininha_aplicada?: boolean | null;
};

type ComissaoRow = {
  id: string;
  id_comanda_item?: string | null;
  tipo_profissional?: string | null;
  percentual_aplicado?: number | null;
  valor_base?: number | null;
};

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

async function requireGerenteOuAdminSalao(idSalao: string) {
  const supabase = await createClient();
  const supabaseAdmin = getSupabaseAdmin();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Usuário não autenticado.", status: 401 } as const;
  }

  const { data: usuario, error: usuarioError } = await supabaseAdmin
    .from("usuarios")
    .select("id_salao, status, nivel")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError) {
    console.error("Erro ao validar usuário da comissão:", usuarioError);
    return { error: "Erro ao validar usuário.", status: 500 } as const;
  }

  if (!usuario?.id_salao || usuario.id_salao !== idSalao) {
    return { error: "Acesso negado para este salão.", status: 403 } as const;
  }

  const nivel = String(usuario.nivel || "").toLowerCase();
  const status = String(usuario.status || "").toLowerCase();

  if (status !== "ativo") {
    return { error: "Usuário inativo.", status: 403 } as const;
  }

  if (!["admin", "gerente"].includes(nivel)) {
    return { error: "Somente admin ou gerente pode recalcular a comissão.", status: 403 } as const;
  }

  return { ok: true } as const;
}

function distribuirTaxa(totalTaxa: number, rows: Array<{ id: string; peso: number }>) {
  if (totalTaxa <= 0 || rows.length === 0) return new Map<string, number>();

  const totalPeso = rows.reduce((acc, row) => acc + row.peso, 0);
  if (totalPeso <= 0) return new Map<string, number>();

  const distribuicao = new Map<string, number>();
  let acumulado = 0;

  rows.forEach((row, index) => {
    const ultimo = index === rows.length - 1;
    const valor = ultimo
      ? roundCurrency(totalTaxa - acumulado)
      : roundCurrency((totalTaxa * row.peso) / totalPeso);

    distribuicao.set(row.id, valor);
    acumulado = roundCurrency(acumulado + valor);
  });

  return distribuicao;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const idSalao = String(body.idSalao || "").trim();
    const idComanda = String(body.idComanda || "").trim();

    if (!idSalao || !idComanda) {
      return NextResponse.json(
        { error: "Salão e comanda são obrigatórios." },
        { status: 400 }
      );
    }

    const auth = await requireGerenteOuAdminSalao(idSalao);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const [
      { data: config, error: configError },
      { data: pagamentos, error: pagamentosError },
      { data: itens, error: itensError },
      { data: comissoes, error: comissoesError },
    ] = await Promise.all([
      supabaseAdmin
        .from("configuracoes_salao")
        .select("repassa_taxa_cliente, desconta_taxa_profissional")
        .eq("id_salao", idSalao)
        .maybeSingle(),

      supabaseAdmin
        .from("comanda_pagamentos")
        .select("taxa_maquininha_valor")
        .eq("id_comanda", idComanda),

      supabaseAdmin
        .from("comanda_itens")
        .select("id, base_calculo_aplicada, desconta_taxa_maquininha_aplicada")
        .eq("id_comanda", idComanda)
        .eq("ativo", true),

      supabaseAdmin
        .from("comissoes_lancamentos")
        .select("id, id_comanda_item, tipo_profissional, percentual_aplicado, valor_base")
        .eq("id_salao", idSalao)
        .eq("id_comanda", idComanda),
    ]);

    if (configError || pagamentosError || itensError || comissoesError) {
      console.error("Erro ao carregar dados para recalcular comissão:", {
        configError,
        pagamentosError,
        itensError,
        comissoesError,
      });

      return NextResponse.json(
        { error: "Erro ao carregar dados para recalcular a comissão." },
        { status: 500 }
      );
    }

    const configRow = (config as ConfigRow | null) || null;
    const repassaTaxaCliente = Boolean(configRow?.repassa_taxa_cliente);
    const descontaTaxaProfissional = Boolean(configRow?.desconta_taxa_profissional);

    if (repassaTaxaCliente || !descontaTaxaProfissional) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: repassaTaxaCliente
          ? "Taxa repassada ao cliente."
          : "Desconto da taxa do profissional desativado.",
      });
    }

    const totalTaxa = roundCurrency(
      ((pagamentos as PagamentoRow[] | null) || []).reduce(
        (acc, item) => acc + Number(item.taxa_maquininha_valor || 0),
        0
      )
    );

    if (totalTaxa <= 0) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "Sem taxa de maquininha para descontar.",
      });
    }

    const itensMap = new Map<string, ItemRow>();
    ((itens as ItemRow[] | null) || []).forEach((item) => {
      itensMap.set(item.id, item);
    });

    const comissoesElegiveis = ((comissoes as ComissaoRow[] | null) || []).filter((row) => {
      const item = row.id_comanda_item ? itensMap.get(row.id_comanda_item) : null;
      const tipo = String(row.tipo_profissional || "").toLowerCase();

      if (!item) return false;
      if (tipo === "assistente") return false;
      if (String(item.base_calculo_aplicada || "").toLowerCase() !== "bruto") return false;
      if (!item.desconta_taxa_maquininha_aplicada) return false;

      const percentual = Number(row.percentual_aplicado || 0);
      const valorBase = Number(row.valor_base || 0);

      return percentual > 0 && valorBase > 0;
    });

    if (comissoesElegiveis.length === 0) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "Nenhuma comissão elegível para desconto em base bruta.",
      });
    }

    const distribuicaoTaxa = distribuirTaxa(
      totalTaxa,
      comissoesElegiveis.map((row) => ({
        id: row.id,
        peso: Number(row.valor_base || 0),
      }))
    );

    await Promise.all(
      comissoesElegiveis.map(async (row) => {
        const percentual = Number(row.percentual_aplicado || 0);
        const valorBase = Number(row.valor_base || 0);
        const taxaRateada = Number(distribuicaoTaxa.get(row.id) || 0);
        const valorBrutoComissao = roundCurrency((valorBase * percentual) / 100);
        const valorFinalComissao = Math.max(
          roundCurrency(valorBrutoComissao - taxaRateada),
          0
        );

        const { error: updateError } = await supabaseAdmin
          .from("comissoes_lancamentos")
          .update({
            valor_comissao: valorFinalComissao,
          })
          .eq("id", row.id)
          .eq("id_salao", idSalao);

        if (updateError) {
          throw updateError;
        }
      })
    );

    return NextResponse.json({
      ok: true,
      adjusted: true,
      totalTaxa,
      adjustedRows: comissoesElegiveis.length,
    });
  } catch (error) {
    console.error("Erro interno ao recalcular taxa do profissional:", error);

    return NextResponse.json(
      { error: "Erro interno ao recalcular taxa do profissional." },
      { status: 500 }
    );
  }
}
