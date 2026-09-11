"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import {
  clearSupabaseBrowserAuthState,
  getLoginErrorMessage,
  isSupabaseAuthRateLimit,
} from "@/lib/supabase/auth-client-recovery";
import {
  getLoginRedirectNotice,
  sanitizeLoginReturnTo,
} from "@/lib/auth/login-redirect";

type WarmupTarget = {
  origin: string;
  href: string;
  mode: RequestMode;
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <Loader2 className="animate-spin text-zinc-500" size={24} />
    </div>
  );
}

function LoginPageContent() {
  const searchParams = useSearchParams();
  const submittingRef = useRef(false);
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(
    null
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [rateLimited, setRateLimited] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState("");

  const planoSelecionado = searchParams.get("plano")?.trim() || "";
  const emailQuery = searchParams.get("email")?.trim() || "";
  const returnTo = sanitizeLoginReturnTo(searchParams.get("returnTo"));
  const loginContext = searchParams.get("context")?.trim() || "";
  const redirectNotice = getLoginRedirectNotice(searchParams);
  const redirectReason = searchParams.get("motivo")?.trim() || "";
  const googleErro = searchParams.get("erro")?.trim() || "";
  const needsSessionRecovery =
    redirectReason === "salao_excluido" || googleErro === "google_nao_vinculado";
  const agendaQuickLogin = loginContext === "agenda" || returnTo === "/agenda";
  const redirectHref = returnTo
    ? getManagedHostHrefForPath(appendBootParam(returnTo))
    : planoSelecionado
      ? getManagedHostHref(
          `/assinatura?plano=${encodeURIComponent(planoSelecionado)}`,
          "assinatura"
        )
      : getManagedHostHref("/dashboard?boot=1", "painel");

  useEffect(() => {
    try {
      const client = createClient();
      setSupabase(client);

    } catch (error) {
      console.warn("Supabase indisponível para login:", error);
      setErro("Serviço de autenticação indisponível neste ambiente.");
    }
  }, []);

  useEffect(() => {
    if (!supabase || needsSessionRecovery) return;

    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session) return;
      setRedirectMessage("Sessão encontrada. Abrindo seu painel...");
      window.location.replace(redirectHref);
    });

    return () => {
      cancelled = true;
    };
  }, [needsSessionRecovery, redirectHref, supabase]);

  useEffect(() => {
    if (!supabase || redirectReason !== "salao_excluido") return;

    let cancelled = false;

    async function clearStaleDeletedSalonSession() {
      setRedirectMessage("Encerrando a sessão antiga para liberar outro login...");
      await supabase?.auth.signOut().catch(() => null);
      if (cancelled) return;
      clearSupabaseBrowserAuthState();
      setRedirectMessage("");
    }

    void clearStaleDeletedSalonSession();

    return () => {
      cancelled = true;
    };
  }, [redirectReason, supabase]);

  useEffect(() => {
    if (!emailQuery) return;
    setEmail((current) => current || emailQuery);
  }, [emailQuery]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const warmupTargets: WarmupTarget[] = [];

    const redirectOrigin = safeOriginFromHref(redirectHref);
    if (redirectOrigin && redirectHref) {
      warmupTargets.push({
        origin: redirectOrigin,
        href: redirectHref,
        mode: "no-cors",
      });
    }

    const supabaseOrigin = safeOriginFromHref(
      process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    );

    const createdLinks: HTMLLinkElement[] = [];

    warmupTargets.forEach(({ origin, href, mode }) => {
      const preconnect = document.createElement("link");
      preconnect.rel = "preconnect";
      preconnect.href = origin;
      preconnect.crossOrigin = "anonymous";
      document.head.appendChild(preconnect);
      createdLinks.push(preconnect);

      const dnsPrefetch = document.createElement("link");
      dnsPrefetch.rel = "dns-prefetch";
      dnsPrefetch.href = origin;
      document.head.appendChild(dnsPrefetch);
      createdLinks.push(dnsPrefetch);

      void fetch(href, {
        method: "GET",
        mode,
        cache: "no-store",
        credentials: "include",
      }).catch(() => undefined);
    });

    if (supabaseOrigin) {
      const supabasePreconnect = document.createElement("link");
      supabasePreconnect.rel = "preconnect";
      supabasePreconnect.href = supabaseOrigin;
      supabasePreconnect.crossOrigin = "anonymous";
      document.head.appendChild(supabasePreconnect);
      createdLinks.push(supabasePreconnect);

      const supabaseDnsPrefetch = document.createElement("link");
      supabaseDnsPrefetch.rel = "dns-prefetch";
      supabaseDnsPrefetch.href = supabaseOrigin;
      document.head.appendChild(supabaseDnsPrefetch);
      createdLinks.push(supabaseDnsPrefetch);
    }

    return () => {
      createdLinks.forEach((link) => link.remove());
    };
  }, [redirectHref]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading || submittingRef.current) return;

    submittingRef.current = true;
    setLoading(true);
    setErro("");
    setRateLimited(false);

    try {
      if (!supabase) {
        throw new Error("Serviço de autenticação indisponível neste ambiente.");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        const securityEvent = await reportSalaoLoginSecurityEvent({
          email,
          evento: "login_falhou",
          detalhes: { motivo: error.message || "erro_login" },
        });
        setRateLimited(isSupabaseAuthRateLimit(error));
        if (securityEvent?.blocked && securityEvent.redirectTo) {
          window.location.replace(securityEvent.redirectTo);
          return;
        }
        setErro(getLoginErrorMessage(error));
        return;
      }

      void reportSalaoLoginSecurityEvent({
        email,
        evento: "login_sucesso",
      });

      setRedirectMessage(
        agendaQuickLogin
          ? "Login aceito. Abrindo a agenda em modo foco..."
          : "Login aceito. Entrando no painel e montando o resumo do salão..."
      );

      window.location.replace(redirectHref);
    } catch (error) {
      setRateLimited(isSupabaseAuthRateLimit(error));
      setErro(getLoginErrorMessage(error));
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  async function handleGoogleLogin() {
    try {
      if (!supabase) {
        throw new Error("Serviço de autenticação indisponível neste ambiente.");
      }

      setLoading(true);
      setErro("");
      setRedirectMessage("Verificando se o Login com Google está configurado...");

      const emailDigitado = email.trim().toLowerCase();
      if (!emailDigitado) {
        setErro("Digite seu e-mail antes de entrar com Google.");
        setLoading(false);
        setRedirectMessage("");
        return;
      }

      const precheckResponse = await fetch("/api/auth/google-login-precheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailDigitado }),
      });
      const precheck = (await precheckResponse.json().catch(() => ({}))) as {
        ok?: boolean;
        allowed?: boolean;
        error?: string;
      };

      if (!precheckResponse.ok || !precheck.ok || !precheck.allowed) {
        setErro(
          precheck.error ||
            "Este e-mail ainda não tem Login com Google configurado. Entre com e-mail e senha e ative em Perfil do Salão > Login com Google."
        );
        setLoading(false);
        setRedirectMessage("");
        return;
      }

      setRedirectMessage("Abrindo login com Google...");

      const callbackUrl = new URL(
        getManagedHostHref("/auth/callback", "painel"),
        window.location.origin
      );
      callbackUrl.searchParams.set("next", returnTo || "/dashboard?boot=1");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          skipBrowserRedirect: true,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.location.assign(data.url);
        return;
      }

      throw new Error(
        "Não foi possível abrir o Google. Verifique se o provedor Google está ativo no Supabase."
      );
    } catch (error) {
      setLoading(false);
      setErro(getLoginErrorMessage(error));
    }
  }

  async function limparSessaoLocal() {
    setLoading(true);
    setErro("");
    setRedirectMessage("Limpando a sessão deste navegador...");
    await supabase?.auth.signOut().catch(() => null);
    clearSupabaseBrowserAuthState();
    setRateLimited(false);
    setRedirectMessage("");
    setLoading(false);
    setErro("Sessão local limpa. Agora tente entrar com outra conta.");
  }

  function abrirCadastroSalao() {
    window.location.assign(getManagedHostHref("/cadastro-salao", "cadastro"));
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <header className="flex h-[74px] items-center justify-between border-b border-zinc-200 bg-white px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-[var(--app-accent)]">
            <Sparkles size={18} />
          </span>
          <span className="font-display text-lg font-black tracking-[-0.03em]">
            SalãoPremium
          </span>
        </Link>

        <button
          type="button"
          onClick={abrirCadastroSalao}
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-black text-zinc-800 transition hover:border-zinc-950"
        >
          Cadastrar salão
        </button>
      </header>

      <main className="grid min-h-[calc(100vh-74px)] lg:grid-cols-2">
        <section
          className="relative hidden overflow-hidden bg-zinc-950 bg-cover bg-center lg:block"
          style={{ backgroundImage: "url('/site/cadastro-salao-bg.jpeg')" }}
        >
          <div className="absolute inset-0 bg-zinc-950/58" />
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-950/55 to-transparent" />

          <div className="relative flex h-full flex-col justify-between p-10 text-white xl:p-14">
            <div className="max-w-lg">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-white/75">
                Painel do salão
              </div>
              <h1 className="mt-7 font-display text-[3.2rem] font-black leading-[0.95] tracking-[-0.05em] xl:text-[4.2rem]">
                Menos peso na rotina, mais controle no seu negócio.
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-white/78">
                Entre para acompanhar agenda, clientes, equipe, vendas e
                notificações em tempo real.
              </p>
            </div>

            <div className="grid max-w-xl gap-3 sm:grid-cols-3">
              <LoginBadge label="Agenda protegida" />
              <LoginBadge label="Equipe conectada" />
              <LoginBadge label="Dados seguros" />
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-[430px]">
            <div className="mb-8">
              <h2 className="font-display text-3xl font-black tracking-[-0.04em] text-zinc-950">
                Entrar no painel
              </h2>
              <p className="mt-2 text-sm font-semibold text-zinc-500">
                {agendaQuickLogin
                  ? "Acesse para voltar direto para a agenda."
                  : "Use o e-mail e a senha do seu salão."}
              </p>
            </div>

            {agendaQuickLogin ? (
              <div className="mb-5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                <p className="font-semibold">Agenda em modo foco</p>
                <p className="mt-1">
                  Entre novamente e você volta direto para a agenda, sem passar pelo
                  dashboard.
                </p>
              </div>
            ) : null}

            {redirectNotice ? (
              <div
                className={
                  redirectNotice.tone === "danger"
                    ? "mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                    : redirectNotice.tone === "warning"
                      ? "mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                      : redirectNotice.tone === "success"
                        ? "mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                        : "mb-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700"
                }
              >
                <p className="font-semibold">{redirectNotice.title}</p>
                <p className="mt-1">{redirectNotice.description}</p>
                {redirectReason === "salao_excluido" ? (
                  <button
                    type="button"
                    onClick={limparSessaoLocal}
                    disabled={loading}
                    className="mt-3 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-black text-amber-900 transition hover:border-amber-300 disabled:opacity-60"
                  >
                    Limpar sessão e entrar com outra conta
                  </button>
                ) : null}
              </div>
            ) : null}

            {googleErro ? (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {googleErro === "google_nao_vinculado"
                  ? "Sua conta não tem integração com Google. Entre com e-mail e senha, conecte o Google no Perfil do Salão e tente novamente."
                  : "Não foi possível concluir o login com Google agora. Use e-mail e senha ou tente novamente."}
              </div>
            ) : null}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-800">
                  E-mail
                </label>
                <div className="flex min-h-12 items-center gap-3 rounded-xl border border-zinc-300 px-4 transition focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-[rgba(199,162,92,0.20)]">
                  <Mail size={18} className="text-zinc-400" />
                  <input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full bg-transparent text-base text-zinc-950 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-zinc-800">
                  Senha
                </label>
                <div className="flex min-h-12 items-center gap-3 rounded-xl border border-zinc-300 px-4 transition focus-within:border-zinc-950 focus-within:ring-4 focus-within:ring-[rgba(199,162,92,0.20)]">
                  <LockKeyhole size={18} className="text-zinc-400" />
                  <input
                    type="password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full bg-transparent text-base text-zinc-950 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const path = email.trim()
                      ? `/recuperar-senha?email=${encodeURIComponent(email.trim())}`
                      : "/recuperar-senha";
                    window.location.assign(path);
                  }}
                  className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
                >
                  Esqueci minha senha
                </button>
              </div>

              {erro ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  <p>{erro}</p>
                  {rateLimited ? (
                    <button
                      type="button"
                      onClick={limparSessaoLocal}
                      className="mt-3 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700"
                    >
                      Limpar sessão local
                    </button>
                  ) : null}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-black text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              <span className="h-px flex-1 bg-zinc-200" />
              ou
              <span className="h-px flex-1 bg-zinc-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || !supabase}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-zinc-300 bg-white px-4 text-sm font-black text-zinc-900 transition hover:border-zinc-950 disabled:opacity-60"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-base font-black text-zinc-950 shadow-sm ring-1 ring-zinc-200">
                G
              </span>
              Entrar com Google
            </button>

            {loading && redirectMessage ? (
              <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                {redirectMessage}
              </div>
            ) : null}

            <div className="mt-10 space-y-6 text-center">
              <p className="text-sm text-zinc-600">
                Ainda não tem conta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    const path = planoSelecionado
                      ? `/cadastro-salao?plano=${encodeURIComponent(planoSelecionado)}`
                      : "/cadastro-salao";
                    window.location.assign(getManagedHostHref(path, "cadastro"));
                  }}
                  className="font-black text-[var(--app-accent-strong)] transition hover:text-zinc-950"
                >
                  Cadastre-se
                </button>
              </p>

              <div className="text-sm text-zinc-500">
                <p>Deseja agendar algum serviço?</p>
                <button
                  type="button"
                  onClick={() =>
                    window.location.assign("https://app.salaopremiun.com.br/app-cliente")
                  }
                  className="mt-2 font-black text-zinc-950 underline"
                >
                  Entrar como cliente
                  <ArrowRight size={14} className="ml-1 inline" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

async function reportSalaoLoginSecurityEvent(params: {
  email: string;
  evento: "login_falhou" | "login_sucesso";
  detalhes?: Record<string, unknown>;
}) {
  try {
    const response = await fetch("/api/auth/security-login-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: params.email.trim().toLowerCase(),
        evento: params.evento,
        origem: "login-salao",
        route: "/login",
        detalhes: params.detalhes || {},
      }),
      keepalive: params.evento === "login_sucesso",
    });

    return (await response.json().catch(() => null)) as
      | { blocked?: boolean; redirectTo?: string | null }
      | null;
  } catch {
    return null;
  }
}

function LoginBadge({ label }: { label: string }) {
  return (
    <div className="rounded-[20px] border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur">
      {label}
    </div>
  );
}

function getManagedHostHref(
  path: string,
  host: "painel" | "assinatura" | "cadastro"
) {
  if (typeof window === "undefined") {
    return path;
  }

  const isManagedHost = window.location.hostname.endsWith("salaopremiun.com.br");

  if (!isManagedHost) {
    return path;
  }

  const targetHost =
    host === "assinatura"
      ? "assinatura.salaopremiun.com.br"
      : host === "cadastro"
        ? "cadastro.salaopremiun.com.br"
        : "painel.salaopremiun.com.br";

  return `https://${targetHost}${path}`;
}

function getManagedHostHrefForPath(path: string) {
  if (path === "/assinatura" || path.startsWith("/assinatura/")) {
    return getManagedHostHref(path, "assinatura");
  }

  return getManagedHostHref(path, "painel");
}

function appendBootParam(path: string) {
  if (!path.startsWith("/")) return path;

  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("boot", "1");
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function safeOriginFromHref(href: string) {
  try {
    return new URL(href, typeof window !== "undefined" ? window.location.origin : undefined)
      .origin;
  } catch {
    return null;
  }
}
