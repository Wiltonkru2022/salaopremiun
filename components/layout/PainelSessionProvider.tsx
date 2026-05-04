"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  PAINEL_SESSION_STORAGE_KEY,
  type PainelSessionSnapshot,
} from "@/lib/painel/session-snapshot";

const PainelSessionContext = createContext<PainelSessionSnapshot | null>(null);

function readStoredPainelSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(PAINEL_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PainelSessionSnapshot;
  } catch {
    return null;
  }
}

export function PainelSessionProvider({
  value,
  children,
}: {
  value: PainelSessionSnapshot | null;
  children: ReactNode;
}) {
  useEffect(() => {
    if (typeof window === "undefined" || !value) {
      return;
    }

    window.localStorage.setItem(PAINEL_SESSION_STORAGE_KEY, JSON.stringify(value));
  }, [value]);

  return (
    <PainelSessionContext.Provider value={value}>
      {children}
    </PainelSessionContext.Provider>
  );
}

export function usePainelSession() {
  const contextValue = useContext(PainelSessionContext);
  const [storedValue, setStoredValue] = useState<PainelSessionSnapshot | null>(
    () => contextValue ?? readStoredPainelSession()
  );

  useEffect(() => {
    if (contextValue) {
      setStoredValue(contextValue);
      return;
    }

    setStoredValue(readStoredPainelSession());
  }, [contextValue]);

  const snapshot = contextValue ?? storedValue;

  return useMemo(
    () => ({
      snapshot,
      ready: Boolean(snapshot?.idSalao && snapshot?.permissoes),
    }),
    [snapshot]
  );
}
