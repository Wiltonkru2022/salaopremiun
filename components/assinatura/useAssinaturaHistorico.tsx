"use client";

import { useCallback, useState } from "react";
import { monitorClientOperation } from "@/lib/monitoring/client";
import type { HistoricoCobrancaRow, SalaoRow } from "./types";

type UseAssinaturaHistoricoParams = {
  salao: SalaoRow | null;
  setErro: (message: string) => void;
};

export function useAssinaturaHistorico({
  salao,
  setErro,
}: UseAssinaturaHistoricoParams) {
  const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [historicoCobrancas, setHistoricoCobrancas] = useState<
    HistoricoCobrancaRow[]
  >([]);

  const carregarHistoricoCobrancas = useCallback(async (): Promise<void> => {
    try {
      setCarregandoHistorico(true);
      setErro("");

      if (!salao?.id) {
        setHistoricoCobrancas([]);
        return;
      }

      const response = await monitorClientOperation(
        {
          module: "assinatura",
          action: "carregar_historico_cobrancas",
          route: "/api/assinatura/historico",
          screen: "assinatura_historico",
          entity: "salao",
          entityId: salao.id,
          successMessage: "Historico de cobrancas carregado.",
          errorMessage: "Falha ao carregar historico de cobrancas.",
        },
        () =>
          fetch("/api/assinatura/historico", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idSalao: salao.id,
            }),
          })
      );

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        historico?: HistoricoCobrancaRow[];
      };

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar historico.");
      }

      setHistoricoCobrancas(Array.isArray(data.historico) ? data.historico : []);
    } catch (error: unknown) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar historico."
      );
      setHistoricoCobrancas([]);
    } finally {
      setCarregandoHistorico(false);
    }
  }, [salao?.id, setErro]);

  const abrirHistoricoModal = useCallback(async (): Promise<void> => {
    setHistoricoModalOpen(true);
    await carregarHistoricoCobrancas();
  }, [carregarHistoricoCobrancas]);

  const fecharHistoricoModal = useCallback((): void => {
    setHistoricoModalOpen(false);
  }, []);

  return {
    historicoModalOpen,
    abrirHistoricoModal,
    fecharHistoricoModal,
    carregandoHistorico,
    historicoCobrancas,
  };
}
