import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "./components/Shell";
import { Button } from "./components/ui";
import { supabase } from "./lib/supabase";
import type { AppSession, ModuleKey, Salao, UsuarioPainel } from "./types";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AgendaPage } from "./pages/AgendaPage";
import { CaixaPage } from "./pages/CaixaPage";
import { ResourcePage, resourceConfigs } from "./pages/ResourcePage";
import { SettingsPage } from "./pages/SettingsPage";

const PAGE_KEY = "sistema-salao-premiun.page";

type InternalAuthSession = {
  user: { id: string; email?: string | null };
  usuario?: UsuarioPainel | null;
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AppSession | null>(null);
  const [authSession, setAuthSession] = useState<InternalAuthSession | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState<ModuleKey>(() => (localStorage.getItem(PAGE_KEY) as ModuleKey) || "dashboard");

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const current = (await supabase.auth.getSession()).data.session as InternalAuthSession | null;
      setAuthSession(current);
      if (!current?.user || !current.usuario?.id_salao) {
        setSession(null);
        return;
      }

      const usuario = current.usuario;
      const { data: salao, error: salaoError } = await supabase
        .from("saloes")
        .select("id, nome, responsavel, logo_url, plano, status")
        .eq("id", usuario.id_salao)
        .maybeSingle();

      if (salaoError) throw new Error(salaoError.message || "Erro ao carregar salao.");

      setSession({
        userId: current.user.id,
        email: current.user.email ?? usuario.email ?? null,
        usuario,
        salao: (salao || null) as Salao | null,
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

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-center">
        <div>
          <img src="/icons/icon-192.png" className="mx-auto h-16 w-16 rounded-2xl" alt="Salão Premiun" />
          <div className="mt-4 text-lg font-black">Carregando painel...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginPage error={error} />;
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
        window.location.assign("https://login.salaopremiun.com.br/login-clerk?returnTo=%2Fdashboard%3Fboot%3D1");
      }}
    >
      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
          {authSession ? <Button className="ml-3 h-8 px-3" variant="secondary" onClick={() => void loadSession()}>Tentar de novo</Button> : null}
        </div>
      ) : null}
      {content}
    </Shell>
  );
}
