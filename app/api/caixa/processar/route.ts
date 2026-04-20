import { NextRequest, NextResponse } from "next/server";
import {
  AuthzError,
  requireSalaoAnyPermission,
} from "@/lib/auth/require-salao-permission";
import { abrirCaixa, fecharCaixa } from "@/lib/caixa/processar/sessao";
import { lancarMovimentacao } from "@/lib/caixa/processar/movimentos";
import {
  adicionarPagamento,
  removerPagamento,
} from "@/lib/caixa/processar/pagamentos";
import {
  cancelarComanda,
  finalizarComanda,
} from "@/lib/caixa/processar/finalizacao";
import type {
  AcaoCaixa,
  CaixaProcessarBody,
  CaixaProcessarContext,
} from "@/lib/caixa/processar/types";
import {
  CaixaInputError,
  carregarComandaBase,
  resolveHttpStatus,
  sanitizeUuid,
} from "@/lib/caixa/processar/utils";
import {
  assertCanMutatePlanFeature,
  PlanAccessError,
} from "@/lib/plans/access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const ACOES_CAIXA: AcaoCaixa[] = [
  "abrir_caixa",
  "fechar_caixa",
  "lancar_movimentacao",
  "adicionar_pagamento",
  "remover_pagamento",
  "finalizar_comanda",
  "cancelar_comanda",
];

function isAcaoCaixa(value: string): value is AcaoCaixa {
  return ACOES_CAIXA.includes(value as AcaoCaixa);
}

async function carregarPermissaoCaixa(idSalao: string, acao: AcaoCaixa) {
  if (acao === "adicionar_pagamento" || acao === "remover_pagamento") {
    return requireSalaoAnyPermission(idSalao, [
      "caixa_editar",
      "caixa_pagamentos",
    ]);
  }

  if (acao === "abrir_caixa" || acao === "lancar_movimentacao") {
    return requireSalaoAnyPermission(idSalao, [
      "caixa_editar",
      "caixa_operar",
    ]);
  }

  return requireSalaoAnyPermission(idSalao, [
    "caixa_editar",
    "caixa_finalizar",
  ]);
}

async function processarAcao(params: {
  ctx: CaixaProcessarContext;
  body: CaixaProcessarBody;
  acao: AcaoCaixa;
  idComanda: string | null;
}) {
  const { ctx, body, acao, idComanda } = params;

  if (acao === "abrir_caixa") {
    return abrirCaixa(ctx, body);
  }

  if (acao === "fechar_caixa") {
    return fecharCaixa(ctx, body);
  }

  if (acao === "lancar_movimentacao") {
    return lancarMovimentacao(ctx, body);
  }

  if (!idComanda) {
    throw new CaixaInputError("Comanda obrigatoria para esta acao.");
  }

  await carregarComandaBase({
    supabaseAdmin: ctx.supabaseAdmin,
    idSalao: ctx.idSalao,
    idComanda,
  });

  if (acao === "adicionar_pagamento") {
    return adicionarPagamento({ ctx, body, idComanda });
  }

  if (acao === "remover_pagamento") {
    return removerPagamento({ ctx, body, idComanda });
  }

  if (acao === "finalizar_comanda") {
    return finalizarComanda({ ctx, idComanda });
  }

  return cancelarComanda({ ctx, body, idComanda });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CaixaProcessarBody;
    const idSalao = sanitizeUuid(body.idSalao);
    const acaoRaw = String(body.acao || "").trim().toLowerCase();
    const idComanda = sanitizeUuid(body.comanda?.idComanda);

    if (!idSalao) {
      return NextResponse.json(
        { error: "Salao obrigatorio." },
        { status: 400 }
      );
    }

    if (!isAcaoCaixa(acaoRaw)) {
      return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    const permissionMembership = await carregarPermissaoCaixa(idSalao, acaoRaw);
    await assertCanMutatePlanFeature(idSalao, "caixa");

    const result = await processarAcao({
      ctx: {
        supabaseAdmin: getSupabaseAdmin(),
        idSalao,
        idUsuario: permissionMembership.usuario.id,
      },
      body,
      acao: acaoRaw,
      idComanda,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    if (error instanceof PlanAccessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    if (error instanceof CaixaInputError) {
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
      { status: resolveHttpStatus(error) }
    );
  }
}
