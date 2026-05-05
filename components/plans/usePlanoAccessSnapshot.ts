"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePainelSession } from "@/components/layout/PainelSessionProvider";
import type {
  PainelPlanoLimites,
  PainelPlanoUso,
  PainelSessionSnapshot,
} from "@/lib/painel/session-snapshot";

type PlanoAccessPayload = {
  planoCodigo?: string;
  planoNome?: string;
  limites?: PainelPlanoLimites;
  uso?: PainelPlanoUso;
  recursos?: Record<string, boolean>;
};

function buildPlanoAccessFromSession(
  painelSession: PainelSessionSnapshot | null
): PlanoAccessPayload | null {
  if (
    !painelSession?.planoRecursos &&
    !painelSession?.planoNome &&
    !painelSession?.planoCodigo
  ) {
    return null;
  }

  return {
    planoCodigo: painelSession?.planoCodigo,
    planoNome: painelSession?.planoNome,
    limites: painelSession?.planoLimites,
    uso: painelSession?.planoUso,
    recursos: painelSession?.planoRecursos,
  };
}

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
  const sessionPlanoAccess = useMemo(
    () => buildPlanoAccessFromSession(painelSession),
    [painelSession]
  );
  const [loadingPlanoAccess, setLoadingPlanoAccess] = useState(
    enabled && !sessionPlanoAccess
  );
  const [planoAccess, setPlanoAccess] = useState<PlanoAccessPayload | null>(
    () => sessionPlanoAccess
  );

  const carregarPlanoAccess = useCallback(async () => {
    if (!enabled) return;
    if (sessionPlanoAccess) {
      setPlanoAccess(sessionPlanoAccess);
      setLoadingPlanoAccess(false);
      return;
    }

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
  }, [enabled, sessionPlanoAccess]);

  useEffect(() => {
    void carregarPlanoAccess();
  }, [carregarPlanoAccess]);

  useEffect(() => {
    if (!sessionPlanoAccess) {
      return;
    }

    setPlanoAccess(sessionPlanoAccess);
    setLoadingPlanoAccess(false);
  }, [sessionPlanoAccess]);

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
