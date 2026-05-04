"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePainelSession } from "@/components/layout/PainelSessionProvider";

type PlanoAccessPayload = {
  planoCodigo?: string;
  planoNome?: string;
  limites?: {
    usuarios?: number | null;
    profissionais?: number | null;
    clientes?: number | null;
    servicos?: number | null;
    agendamentosMensais?: number | null;
  };
  uso?: {
    usuarios?: number;
    profissionais?: number;
    clientes?: number;
    servicos?: number;
    agendamentosMensais?: number;
  };
  recursos?: Record<string, boolean>;
};

export function getUpgradeTarget(
  planoCodigo?: string | null
): "basico" | "pro" | "premium" {
  const normalized = String(planoCodigo || "").toLowerCase();

  if (normalized === "pro") return "premium";
  if (normalized === "basico") return "pro";
  return "basico";
}

export function usePlanoAccessSnapshot(enabled = true) {
  const { snapshot: painelSession } = usePainelSession();
  const [loadingPlanoAccess, setLoadingPlanoAccess] = useState(enabled);
  const [planoAccess, setPlanoAccess] = useState<PlanoAccessPayload | null>(() =>
    painelSession?.planoRecursos
      ? {
          planoCodigo: undefined,
          planoNome: painelSession.planoNome,
          recursos: painelSession.planoRecursos,
        }
      : null
  );

  const carregarPlanoAccess = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoadingPlanoAccess(true);
      const response = await fetch("/api/plano/access", {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as PlanoAccessPayload;
      setPlanoAccess(data);
    } catch (error) {
      console.error("Erro ao carregar plano atual:", error);
    } finally {
      setLoadingPlanoAccess(false);
    }
  }, [enabled]);

  useEffect(() => {
    void carregarPlanoAccess();
  }, [carregarPlanoAccess]);

  useEffect(() => {
    if (!painelSession?.planoRecursos) {
      return;
    }

    setPlanoAccess((current) => ({
      ...current,
      planoNome: current?.planoNome || painelSession.planoNome,
      recursos: current?.recursos || painelSession.planoRecursos,
    }));

    setLoadingPlanoAccess(false);
  }, [painelSession?.planoNome, painelSession?.planoRecursos]);

  const upgradeTarget = useMemo(
    () => getUpgradeTarget(planoAccess?.planoCodigo),
    [planoAccess?.planoCodigo]
  );

  return {
    planoAccess,
    loadingPlanoAccess,
    carregarPlanoAccess,
    upgradeTarget,
  };
}
