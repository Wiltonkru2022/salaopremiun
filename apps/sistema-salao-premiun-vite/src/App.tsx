import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Shell } from "./components/Shell";
import { Button } from "./components/ui";
import { supabase, supabaseConfigured } from "./lib/supabase";
import type { AppSession, ModuleKey, Salao, UsuarioPainel } from "./types";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AgendaPage } from "./pages/AgendaPage";
import { CaixaPage } from "./pages/CaixaPage";
import { ResourcePage, resourceConfigs } from "./pages/ResourcePage";
import { SettingsPage } from "./pages/SettingsPage";

const PAGE_KEY = "sistema-salao-premiun.page";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AppSession | null>(null);
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState<ModuleKey>(() => (localStorage.getItem(PAGE_KEY) as ModuleKey) || "dashboard");

  const loadSession = useCallback(async (nextAuthSession?: Session | null) => {
    setLoading(true);
    setError("");
    try {
      const current = nextAuthSession ?? (await supabase.auth.getSession()).data.session;
      setAuthSession(current);
      if (!current?.user) {
        setSession(null);
        return;
      }

      const { data: usuario, error: usuarioError } = await supabase
        .from("usuarios")
        .select("id, id_salao, nome, email, nivel, status")
        .eq("auth_user_id", current.user.id)
        .maybeSingle();

      if (usuarioError) throw usuarioError;
      if (!usuario?.id_salao) throw new Error("Usuário não está vinculado a nenhum salão.");

      const { data: salao } = await supabase
        .from("saloes")
        .select("id, nome, responsavel, logo_url, plano, status")
        .eq("id", usuario.id_salao)
        .maybeSingle();

      setSession({
        userId: current.user.id,
        email: current.user.email ?? null,
        usuario: usuario as UsuarioPainel,
        salao: (salao || null) as Salao | null
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao carregar sessão do painel.");
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void loadSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, [loadSession]);

  const content = useMemo(() => {
    if (!session) return null;
    if (page === "dashboard") return <DashboardPage session={session} />;
    if (page === "agenda") return <AgendaPage session={session} />;
    if (page === "caixa") return <CaixaPage session={session} />;
    if (page === "configuracoes") return <SettingsPage session={session} />;
    const config = resourceConfigs[page];
    return <ResourcePage session={session} config={config} />;
  }, [page, session]);

  if (!supabaseConfigured) {
    return (
      <div className="grid min-h-screen place-items-center px-5">
        <div className="max-w-lg rounded-[1.5rem] border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-soft">
          <h1 className="text-2xl font-black">Configure o Supabase</h1>
          <p className="mt-2 text-sm font-bold leading-6">
            Crie um arquivo `.env` neste projeto com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-center">
        <div>
          <img src="/icons/icon-192.png" className="mx-auto h-16 w-16 rounded-2xl" alt="Salão Premiun" />
          <div className="mt-4 text-lg font-black">Carregando painel Vite...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginPage
        error={error}
        onLogin={async (email, password) => {
          const { error: loginError, data } = await supabase.auth.signInWithPassword({ email, password });
          if (loginError) throw loginError;
          await loadSession(data.session);
        }}
      />
    );
  }

  return (
    <Shell
      session={session}
      page={page}
      onNavigate={(nextPage) => {
        setPage(nextPage);
        localStorage.setItem(PAGE_KEY, nextPage);
      }}
      onLogout={async () => {
        await supabase.auth.signOut();
        setAuthSession(null);
        setSession(null);
      }}
    >
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
          {authSession ? <Button className="ml-3 h-8 px-3" variant="secondary" onClick={() => void loadSession(authSession)}>Tentar de novo</Button> : null}
        </div>
      ) : null}
      {content}
    </Shell>
  );
}
