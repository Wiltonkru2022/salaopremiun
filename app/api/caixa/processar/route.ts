import { NextRequest, NextResponse } from "next/server";
import {
  AuthzError,
  requireSalaoAnyPermission,
} from "@/lib/auth/require-salao-permission";
import { processarEstoqueComanda } from "@/lib/estoque/comanda-stock";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { obterTaxaConfigurada, type CaixaTaxasConfig } from "@/lib/caixa/taxas";

type AcaoCaixa =
  | "abrir_caixa"
  | "fechar_caixa"
  | "lancar_movimentacao"
  | "adicionar_pagamento"
  | "remover_pagamento"
  | "finalizar_comanda"
  | "cancelar_comanda";

type BodyPayload = {
  idSalao?: string | null;
  acao?: AcaoCaixa | null;
  idempotencyKey?: string | null;
  comanda?: {
    idComanda?: string | null;
  } | null;
  sessao?: {
    idSessao?: string | null;
    valorAbertura?: number | null;
    valorFechamento?: number | null;
    observacoes?: string | null;
  } | null;
  movimento?: {
    tipo?: string | null;
    valor?: number | null;
    descricao?: string | null;
    idProfissional?: string | null;
    idComanda?: string | null;
    formaPagamento?: string | null;
  } | null;
  pagamento?: {
    idPagamento?: string | null;
    formaPagamento?: string | null;
    valorBase?: number | null;
    parcelas?: number | null;
    observacoes?: string | null;
  } | null;
  motivo?: string | null;
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

function sanitizeIdempotencyKey(value: unknown) {
  const parsed = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, "")
    .slice(0, 160);

  return parsed || null;
}

function sanitizeMoney(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function sanitizeInteger(value: unknown, fallback = 1) {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveHttpStatus(error: unknown) {
  const candidate = error as { code?: string; message?: string } | null;
  if (!candidate?.code) return 500;
  if (candidate.code === "P0001") return 400;
  if (candidate.code === "23514") return 409;
  return 500;
}

function isMissingRpcFunction(error: unknown, functionName: string) {
  const candidate = error as { code?: string; message?: string } | null;
  const message = String(candidate?.message || "").toLowerCase();

  return (
    candidate?.code === "PGRST202" ||
    message.includes("could not find the function") ||
    message.includes(`function public.${functionName.toLowerCase()}`)
  );
}

async function carregarComandaBase(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  idSalao: string;
  idComanda: string;
}) {
  const { supabaseAdmin, idSalao, idComanda } = params;

  const { data: comanda, error } = await supabaseAdmin
    .from("comandas")
    .select("id, id_salao, id_cliente, numero, status")
    .eq("id", idComanda)
    .eq("id_salao", idSalao)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!comanda?.id) {
    throw new Error("Comanda nao encontrada para este salao.");
  }

  return comanda;
}

async function carregarSessaoAberta(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  idSalao: string
) {
  const { data: sessao, error } = await supabaseAdmin
    .from("caixa_sessoes")
    .select("id, status")
    .eq("id_salao", idSalao)
    .eq("status", "aberto")
    .order("aberto_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!sessao?.id) {
    throw new Error("Abra o caixa antes de vender, receber ou finalizar comanda.");
  }

  return sessao;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BodyPayload;
    const idSalao = sanitizeUuid(body.idSalao);
    const acao = String(body.acao || "").trim().toLowerCase() as AcaoCaixa;
    const idComanda = sanitizeUuid(body.comanda?.idComanda);
    const idempotencyKey = sanitizeIdempotencyKey(body.idempotencyKey);

    if (!idSalao) {
      return NextResponse.json(
        { error: "Salao obrigatorio." },
        { status: 400 }
      );
    }

    if (
      ![
        "abrir_caixa",
        "fechar_caixa",
        "lancar_movimentacao",
        "adicionar_pagamento",
        "remover_pagamento",
        "finalizar_comanda",
        "cancelar_comanda",
      ].includes(acao)
    ) {
      return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    const permissionMembership =
      acao === "adicionar_pagamento" || acao === "remover_pagamento"
        ? await requireSalaoAnyPermission(idSalao, [
            "caixa_editar",
            "caixa_pagamentos",
          ])
        : acao === "abrir_caixa" || acao === "lancar_movimentacao"
        ? await requireSalaoAnyPermission(idSalao, [
            "caixa_editar",
            "caixa_operar",
          ])
        : await requireSalaoAnyPermission(idSalao, [
            "caixa_editar",
            "caixa_finalizar",
          ]);

    const supabaseAdmin = getSupabaseAdmin();

    if (acao === "abrir_caixa") {
      const { error, data } = await supabaseAdmin.rpc("fn_caixa_abrir_sessao", {
        p_id_salao: idSalao,
        p_id_usuario: permissionMembership.usuario.id,
        p_valor_abertura: sanitizeMoney(body.sessao?.valorAbertura),
        p_observacoes: sanitizeText(body.sessao?.observacoes),
      });

      if (error) {
        console.error("Erro ao abrir caixa:", error);
        return NextResponse.json(
          { error: error.message || "Erro ao abrir caixa." },
          { status: resolveHttpStatus(error) }
        );
      }

      return NextResponse.json({ ok: true, idSessao: data || null });
    }

    if (acao === "fechar_caixa") {
      const idSessao = sanitizeUuid(body.sessao?.idSessao);

      if (!idSessao) {
        return NextResponse.json(
          { error: "Sessao do caixa obrigatoria para fechamento." },
          { status: 400 }
        );
      }

      const { error, data } = await supabaseAdmin.rpc("fn_caixa_fechar_sessao", {
        p_id_salao: idSalao,
        p_id_sessao: idSessao,
        p_id_usuario: permissionMembership.usuario.id,
        p_valor_fechamento: sanitizeMoney(body.sessao?.valorFechamento),
        p_observacoes: sanitizeText(body.sessao?.observacoes),
      });

      if (error) {
        console.error("Erro ao fechar caixa:", error);
        return NextResponse.json(
          { error: error.message || "Erro ao fechar caixa." },
          { status: resolveHttpStatus(error) }
        );
      }

      return NextResponse.json({ ok: true, idSessao: data || null });
    }

    if (acao === "lancar_movimentacao") {
      const idSessao = sanitizeUuid(body.sessao?.idSessao);

      if (!idSessao) {
        return NextResponse.json(
          { error: "Sessao do caixa obrigatoria para lancar movimentacao." },
          { status: 400 }
        );
      }

      const movimentoPayload = {
        p_id_salao: idSalao,
        p_id_sessao: idSessao,
        p_id_usuario: permissionMembership.usuario.id,
        p_tipo: sanitizeText(body.movimento?.tipo),
        p_valor: sanitizeMoney(body.movimento?.valor),
        p_descricao: sanitizeText(body.movimento?.descricao),
        p_id_profissional: sanitizeUuid(body.movimento?.idProfissional),
        p_id_comanda: sanitizeUuid(body.movimento?.idComanda),
        p_forma_pagamento: sanitizeText(body.movimento?.formaPagamento),
      };
      let { data, error } = await supabaseAdmin.rpc(
        "fn_caixa_lancar_movimentacao_idempotente",
        {
          ...movimentoPayload,
          p_idempotency_key: idempotencyKey,
        }
      );

      if (
        error &&
        isMissingRpcFunction(error, "fn_caixa_lancar_movimentacao_idempotente")
      ) {
        const fallback = await supabaseAdmin.rpc(
          "fn_caixa_lancar_movimentacao",
          movimentoPayload
        );
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.error("Erro ao lancar movimentacao do caixa:", error);
        return NextResponse.json(
          { error: error.message || "Erro ao lancar movimentacao do caixa." },
          { status: resolveHttpStatus(error) }
        );
      }

      const resultRow = Array.isArray(data) ? data[0] : data;

      return NextResponse.json({
        ok: true,
        idMovimentacao: resultRow?.id_movimentacao || null,
        idVale: resultRow?.id_vale || null,
        idempotentReplay: Boolean(resultRow?.ja_existia),
      });
    }

    if (!idComanda) {
      return NextResponse.json(
        { error: "Comanda obrigatoria para esta acao." },
        { status: 400 }
      );
    }

    await carregarComandaBase({
      supabaseAdmin,
      idSalao,
      idComanda,
    });

    if (acao === "adicionar_pagamento") {
      const sessao = await carregarSessaoAberta(supabaseAdmin, idSalao);
      const { data: config, error: configError } = await supabaseAdmin
        .from("configuracoes_salao")
        .select(
          "repassa_taxa_cliente, taxa_maquininha_credito, taxa_maquininha_debito, taxa_maquininha_pix, taxa_maquininha_transferencia, taxa_maquininha_boleto, taxa_maquininha_outro, taxa_credito_1x, taxa_credito_2x, taxa_credito_3x, taxa_credito_4x, taxa_credito_5x, taxa_credito_6x, taxa_credito_7x, taxa_credito_8x, taxa_credito_9x, taxa_credito_10x, taxa_credito_11x, taxa_credito_12x"
        )
        .eq("id_salao", idSalao)
        .maybeSingle();

      if (configError) {
        console.error("Erro ao carregar configuracoes do caixa:", configError);
        return NextResponse.json(
          { error: "Erro ao carregar as configuracoes do caixa." },
          { status: 500 }
        );
      }

      const formaPagamento = sanitizeText(body.pagamento?.formaPagamento) || "pix";
      const parcelas = sanitizeInteger(body.pagamento?.parcelas, 1);
      const valorBase = sanitizeMoney(body.pagamento?.valorBase);

      if (valorBase <= 0) {
        return NextResponse.json(
          { error: "Informe um valor de pagamento valido." },
          { status: 400 }
        );
      }

      const configCaixa = (config as CaixaTaxasConfig | null) || null;
      const taxaPercentual = sanitizeMoney(
        obterTaxaConfigurada(formaPagamento, parcelas, configCaixa)
      );
      const taxaValor = sanitizeMoney((valorBase * taxaPercentual) / 100);
      const repassaTaxaCliente = Boolean(configCaixa?.repassa_taxa_cliente);
      const valorFinalCobrado = repassaTaxaCliente
        ? sanitizeMoney(valorBase + taxaValor)
        : valorBase;

      const pagamentoPayload = {
        p_id_salao: idSalao,
        p_id_comanda: idComanda,
        p_id_sessao: sessao.id,
        p_id_usuario: permissionMembership.usuario.id,
        p_forma_pagamento: formaPagamento,
        p_valor: valorFinalCobrado,
        p_parcelas: parcelas,
        p_taxa_percentual: taxaPercentual,
        p_taxa_valor: taxaValor,
        p_observacoes: sanitizeText(body.pagamento?.observacoes),
      };
      let { data, error } = await supabaseAdmin.rpc(
        "fn_caixa_adicionar_pagamento_comanda_idempotente",
        {
          ...pagamentoPayload,
          p_idempotency_key: idempotencyKey,
        }
      );

      if (
        error &&
        isMissingRpcFunction(
          error,
          "fn_caixa_adicionar_pagamento_comanda_idempotente"
        )
      ) {
        const fallback = await supabaseAdmin.rpc(
          "fn_caixa_adicionar_pagamento_comanda",
          pagamentoPayload
        );
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.error("Erro ao adicionar pagamento da comanda:", error);
        return NextResponse.json(
          { error: error.message || "Erro ao adicionar pagamento." },
          { status: resolveHttpStatus(error) }
        );
      }

      const resultRow = Array.isArray(data) ? data[0] : data;

      return NextResponse.json({
        ok: true,
        idPagamento: resultRow?.id_pagamento || null,
        idMovimentacao: resultRow?.id_movimentacao || null,
        repassaTaxaCliente,
        taxaPercentual,
        taxaValor,
        valorFinalCobrado,
        idempotentReplay: Boolean(resultRow?.ja_existia),
      });
    }

    if (acao === "remover_pagamento") {
      const idPagamento = sanitizeUuid(body.pagamento?.idPagamento);

      if (!idPagamento) {
        return NextResponse.json(
          { error: "Pagamento obrigatorio para remocao." },
          { status: 400 }
        );
      }

      const { error } = await supabaseAdmin.rpc(
        "fn_caixa_remover_pagamento_comanda",
        {
          p_id_salao: idSalao,
          p_id_comanda: idComanda,
          p_id_pagamento: idPagamento,
        }
      );

      if (error) {
        console.error("Erro ao remover pagamento da comanda:", error);
        return NextResponse.json(
          { error: error.message || "Erro ao remover pagamento." },
          { status: resolveHttpStatus(error) }
        );
      }

      return NextResponse.json({ ok: true });
    }

    if (acao === "finalizar_comanda") {
      await carregarSessaoAberta(supabaseAdmin, idSalao);

      const { data: config, error: configError } = await supabaseAdmin
        .from("configuracoes_salao")
        .select("exigir_cliente_na_venda")
        .eq("id_salao", idSalao)
        .maybeSingle();

      if (configError) {
        console.error("Erro ao carregar configuracoes para finalizar comanda:", configError);
        return NextResponse.json(
          { error: "Erro ao carregar configuracoes do caixa." },
          { status: 500 }
        );
      }

      const exigirCliente = Boolean(
        (config as { exigir_cliente_na_venda?: boolean | null } | null)
          ?.exigir_cliente_na_venda
      );

      const { error } = await supabaseAdmin.rpc("fn_caixa_finalizar_comanda", {
        p_id_salao: idSalao,
        p_id_comanda: idComanda,
        p_exigir_cliente: exigirCliente,
      });

      if (error) {
        console.error("Erro ao finalizar comanda:", error);
        return NextResponse.json(
          { error: error.message || "Erro ao finalizar comanda." },
          { status: resolveHttpStatus(error) }
        );
      }

      let warning: string | null = null;

      try {
        const estoqueResult = await processarEstoqueComanda(supabaseAdmin, {
          idSalao,
          idComanda,
          idUsuario: permissionMembership.usuario.id,
        });

        if (
          estoqueResult.skipped &&
          estoqueResult.reason &&
          !estoqueResult.reason.toLowerCase().includes("ja foi processado")
        ) {
          warning = estoqueResult.reason;
        }
      } catch (estoqueError) {
        warning =
          estoqueError instanceof Error
            ? estoqueError.message
            : "nao foi possivel atualizar o estoque da comanda.";
      }

      return NextResponse.json({
        ok: true,
        warning,
      });
    }

    const { error } = await supabaseAdmin.rpc("fn_caixa_cancelar_comanda", {
      p_id_salao: idSalao,
      p_id_comanda: idComanda,
      p_motivo: sanitizeText(body.motivo),
    });

    if (error) {
      console.error("Erro ao cancelar comanda:", error);
      return NextResponse.json(
        { error: error.message || "Erro ao cancelar comanda." },
        { status: resolveHttpStatus(error) }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Erro geral ao processar caixa:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao processar acao do caixa.",
      },
      { status: 500 }
    );
  }
}
