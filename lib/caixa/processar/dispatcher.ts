import {
  AuthzError,
  requireSalaoAnyPermission,
} from "@/lib/auth/require-salao-permission";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { abrirCaixa, fecharCaixa } from "./sessao";
import { lancarMovimentacao } from "./movimentos";
import { adicionarPagamento, removerPagamento } from "./pagamentos";
import { cancelarComanda, finalizarComanda } from "./finalizacao";
import type {
  AcaoCaixa,
  CaixaProcessarBody,
  CaixaProcessarContext,
} from "./types";
import { CaixaInputError, carregarComandaBase, sanitizeUuid } from "./utils";

export const ACOES_CAIXA: AcaoCaixa[] = [
  "abrir_caixa",
  "fechar_caixa",
  "lancar_movimentacao",
  "adicionar_pagamento",
  "remover_pagamento",
  "finalizar_comanda",
  "cancelar_comanda",
];

export function isAcaoCaixa(value: string): value is AcaoCaixa {
  return ACOES_CAIXA.includes(value as AcaoCaixa);
}

export async function carregarPermissaoCaixa(
  idSalao: string,
  acao: AcaoCaixa
) {
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

export async function criarContextoCaixa(params: {
  idSalao: string;
  acao: AcaoCaixa;
}) {
  const { idSalao, acao } = params;
  const permissionMembership = await carregarPermissaoCaixa(idSalao, acao);

  return {
    ctx: {
      supabaseAdmin: getSupabaseAdmin(),
      idSalao,
      idUsuario: permissionMembership.usuario.id,
    } satisfies CaixaProcessarContext,
    membership: permissionMembership,
  };
}

export async function processarAcaoCaixa(params: {
  ctx: CaixaProcessarContext;
  body: CaixaProcessarBody;
  acao: AcaoCaixa;
}) {
  const { ctx, body, acao } = params;
  const idComanda = sanitizeUuid(body.comanda?.idComanda);

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

export type { AuthzError };
