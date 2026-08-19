import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearProfessionalCache } from "../lib/cache";
import type { Profissional } from "../types/database";

type AuthContextValue = {
  profissional: Profissional | null;
  loading: boolean;
  login: (cpf: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfissional: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loginFallbackMessage(status: number) {
  if (status === 401) return "CPF ou senha inválidos.";
  if (status === 403) return "Seu acesso ao App Profissional está bloqueado ou indisponível.";
  if (status === 429) return "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.";
  return "Não foi possível concluir o acesso agora. Tente novamente em instantes.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfissional() {
    const response = await fetch("/api/app-profissional/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      clearProfessionalCache();
      setProfissional(null);
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as {
      profissional?: Profissional;
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
    }).catch(() => null);

    if (!response) {
      throw new Error("Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.");
    }

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      profissional?: Profissional;
    };

    if (!response.ok || !payload.profissional) {
      throw new Error(payload.error || loginFallbackMessage(response.status));
    }

    clearProfessionalCache();
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
      refreshProfissional: loadProfissional,
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
