import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase, supabaseConfigured } from "../lib/supabase";
import type { Profissional } from "../types/database";

type AuthContextValue = {
  profissional: Profissional | null;
  loading: boolean;
  login: (cpf: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfissional: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_KEY = "salaopremiun.profissional.session";

function normalizeCpf(value: string) {
  return String(value || "").replace(/\D/g, "").trim();
}

function normalizeHorarioFuncionamento(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfissional(idProfissional?: string | null) {
    if (!idProfissional) return;
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Profissional;
      if (saved.id === idProfissional) setProfissional(saved);
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as Profissional;
        setProfissional(saved);
        void loadProfissional(saved.id);
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setLoading(false);
  }, []);

  async function login(cpf: string, senha: string) {
    if (!supabaseConfigured) {
      throw new Error("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.");
    }

    const cpfLimpo = normalizeCpf(cpf);
    const senhaLimpa = String(senha || "").trim();

    if (!cpfLimpo || !senhaLimpa) {
      throw new Error("Informe CPF e senha.");
    }

    const { data, error } = await supabase.rpc("app_profissional_login", {
      p_cpf: cpfLimpo,
      p_senha: senhaLimpa
    });

    if (error) throw new Error(error.message);
    const prof = Array.isArray(data) ? data[0] : null;
    if (!prof) throw new Error("CPF ou senha invalidos.");
    if ((prof as Record<string, unknown>).ativo === false) {
      throw new Error("Profissional inativo.");
    }

    const next = {
      ...(prof as Record<string, unknown>),
      cpf: String((prof as Record<string, unknown>).cpf || cpfLimpo),
      telefone: ((prof as Record<string, unknown>).telefone as string | null) ?? null,
      email: ((prof as Record<string, unknown>).email as string | null) ?? null,
      intervalo_agenda_minutos:
        Number((prof as Record<string, unknown>).intervalo_agenda_minutos) || 30,
      horario_funcionamento: normalizeHorarioFuncionamento(
        (prof as Record<string, unknown>).horario_funcionamento ||
          (prof as Record<string, unknown>).dias_trabalho
      )
    } as Profissional;

    setProfissional(next);
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  }

  async function logout() {
    localStorage.removeItem(SESSION_KEY);
    setProfissional(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      profissional,
      loading,
      login,
      logout,
      refreshProfissional: () => loadProfissional(profissional?.id)
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

