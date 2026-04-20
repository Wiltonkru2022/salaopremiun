"use client";

import { useCallback, useRef } from "react";
import type { ComandaDetalhe } from "@/components/caixa/types";
import type { CaixaSessao } from "@/lib/caixa/sessaoCaixa";
import { monitorClientOperation } from "@/lib/monitoring/client";
import type {
  ProcessarComandaBody,
  ProcessarComandaErrorResponse,
  ProcessarComandaParams,
  ProcessarComandaResponse,
} from "@/types/comandas";
import type {
  ProcessarCaixaErrorResponse,
  ProcessarCaixaParams,
  ProcessarCaixaResponse,
} from "@/types/caixa";

type UseCaixaApiParams = {
  idSalao: string;
  comandaSelecionada: ComandaDetalhe | null;
  sessaoCaixa: CaixaSessao | null;
};

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useCaixaApi({
  idSalao,
  comandaSelecionada,
  sessaoCaixa,
}: UseCaixaApiParams) {
  const pendingOperationKeysRef = useRef<Record<string, string>>({});

  const gerarChaveOperacao = useCallback((scope: string) => {
    const existente = pendingOperationKeysRef.current[scope];
    if (existente) return existente;

    const novaChave =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    pendingOperationKeysRef.current[scope] = novaChave;
    return novaChave;
  }, []);

  const limparChaveOperacao = useCallback((scope: string) => {
    delete pendingOperationKeysRef.current[scope];
  }, []);

  const processarComanda = useCallback(
    async (params: ProcessarComandaParams) => {
      const response = await monitorClientOperation(
        {
          module: "caixa",
          action: params.acao,
          route: "/api/comandas/processar",
          screen: "caixa",
          entity: "comanda",
          entityId: comandaSelecionada?.id || null,
          details: {
            idSalao,
            numeroComanda: comandaSelecionada?.numero || null,
          },
          successMessage: `Comanda processada com sucesso: ${params.acao}.`,
          errorMessage: `Falha ao processar comanda: ${params.acao}.`,
        },
        () =>
          fetch("/api/comandas/processar", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idSalao,
              acao: params.acao,
              comanda: {
                idComanda: comandaSelecionada?.id || null,
                numero: comandaSelecionada?.numero || null,
                idCliente: comandaSelecionada?.id_cliente || null,
                status: params.status || comandaSelecionada?.status || "aberta",
                observacoes: comandaSelecionada?.observacoes || null,
                desconto:
                  params.desconto ?? Number(comandaSelecionada?.desconto || 0),
                acrescimo:
                  params.acrescimo ??
                  Number(comandaSelecionada?.acrescimo || 0),
              },
              item: params.item,
            } satisfies ProcessarComandaBody),
          })
      );

      const result = (await response.json().catch(() => ({}))) as Partial<
        ProcessarComandaResponse
      > &
        ProcessarComandaErrorResponse;

      if (!response.ok) {
        throw new Error(result.error || "Erro ao processar comanda.");
      }

      return result as ProcessarComandaResponse;
    },
    [comandaSelecionada, idSalao]
  );

  const processarCaixa = useCallback(
    async (params: ProcessarCaixaParams) => {
      const response = await monitorClientOperation(
        {
          module: "caixa",
          action: params.acao,
          route: "/api/caixa/processar",
          screen: "caixa",
          entity:
            params.acao === "abrir_caixa" || params.acao === "fechar_caixa"
              ? "sessao_caixa"
              : params.acao.includes("comanda")
                ? "comanda"
                : "caixa",
          entityId: comandaSelecionada?.id || sessaoCaixa?.id || null,
          details: {
            idSalao,
            idempotencyKey: params.idempotencyKey || null,
            sessaoId: sessaoCaixa?.id || null,
          },
          successMessage: `Acao de caixa executada com sucesso: ${params.acao}.`,
          errorMessage: `Falha na acao de caixa: ${params.acao}.`,
        },
        () =>
          fetch("/api/caixa/processar", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idSalao,
              acao: params.acao,
              idempotencyKey: params.idempotencyKey || null,
              comanda: {
                idComanda: comandaSelecionada?.id || null,
              },
              sessao: params.sessao,
              movimento: params.movimento,
              pagamento: params.pagamento,
              motivo: params.motivo,
            }),
          })
      );

      const result = (await response.json().catch(() => ({}))) as Partial<
        ProcessarCaixaResponse
      > &
        ProcessarCaixaErrorResponse;

      if (!response.ok) {
        throw new Error(result.error || "Erro ao processar o caixa.");
      }

      return result as ProcessarCaixaResponse;
    },
    [comandaSelecionada?.id, idSalao, sessaoCaixa?.id]
  );

  return {
    gerarChaveOperacao,
    limparChaveOperacao,
    processarComanda,
    processarCaixa,
  };
}
