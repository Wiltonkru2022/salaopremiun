import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
      setProfissional(null);
      return;
    }
    const payload = (await response.json().catch(() => ({}))) as {
      profissional: Profissional;
    };
    setProfissional(payload.profissional || null);
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
      throw new Error(payload.error || "CPF ou senha inválidos.");
    }

    setProfissional(payload.profissional);
  }

  async function logout() {
    const response = await fetch("/api/app-profissional/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(String(payload?.error || "Não foi possível sair da conta."));
    }
    setProfissional(null);
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
