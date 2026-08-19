import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearOtherProfessionalCaches, clearProfessionalCache } from "../lib/cache";
import type { Profissional } from "../types/database";

type AuthContextValue = {
  profissional: Profissional | null;
  loading: boolean;
  login: (cpf: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfissional: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfissional() {
    const response = await fetch("/api/app-profissional/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) {
      clearProfessionalCache();
      setProfissional(null);
      return;
    }
    const payload = (await response.json().catch(() => ({}))) as {
      profissional: Profissional;
    };
    const nextProfissional = payload.profissional || null;
    if (nextProfissional?.id) {
      clearOtherProfessionalCaches(nextProfissional.id);
    }
    setProfissional(nextProfissional);
  }

  useEffect(() => {
    void loadProfissional().finally(() => setLoading(false));
  }, []);

  async function login(cpf: string, senha: string) {
    const response = await fetch("/api/app-profissional/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ cpf, senha }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error: string;
      profissional: Profissional;
    };
    if (!response.ok || !payload.profissional) {
      if (response.status === 429) {
        throw new Error(payload.error || "Muitas tentativas. Aguarde antes de tentar novamente.");
      }
      if (response.status === 403) {
        throw new Error(payload.error || "Seu acesso ao App Profissional está bloqueado.");
      }
      if (response.status >= 500) {
        throw new Error(payload.error || "O sistema está temporariamente indisponível. Tente novamente em instantes.");
      }
      throw new Error(payload.error || "CPF ou senha inválidos.");
    }

    clearOtherProfessionalCaches(payload.profissional.id);
    setProfissional(payload.profissional);
  }

  async function logout() {
    try {
      await fetch("/api/app-profissional/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      clearProfessionalCache();
      setProfissional(null);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      profissional,
      loading,
      login,
      logout,
      refreshProfissional: loadProfissional
    }),
    [profissional, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return value;
}
