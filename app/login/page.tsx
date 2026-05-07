"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
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
      setSupabase(createClient());
    } catch (error) {
      console.warn("Supabase indisponivel para login:", error);
      setErro("Servico de autenticacao indisponivel neste ambiente.");
    }
  }, []);

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
        throw new Error("Servico de autenticacao indisponivel neste ambiente.");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setRateLimited(isSupabaseAuthRateLimit(error));
        setErro(getLoginErrorMessage(error));
        return;
      }

      setRedirectMessage(
        agendaQuickLogin
          ? "Login aceito. Abrindo a agenda em modo foco..."
          : "Login aceito. Entrando no painel e montando o resumo do salao..."
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

  function limparSessaoLocal() {
    clearSupabaseBrowserAuthState();
    setRateLimited(false);
    setErro("Sessao local limpa. Aguarde alguns segundos e tente entrar de novo.");
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <header className="flex h-[74px] items-center justify-between border-b border-zinc-200 bg-white px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-[var(--app-accent)]">
            <Sparkles size={18} />
          </span>
          <span className="font-display text-lg font-black tracking-[-0.03em]">
            SalaoPremium
          </span>
        </Link>

        <Link
          href="/cadastro-salao"
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-black text-zinc-800 transition hover:border-zinc-950"
        >
          Cadastrar salao
        </Link>
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
                Painel do salao
              </div>
              <h1 className="mt-7 font-display text-[3.2rem] font-black leading-[0.95] tracking-[-0.05em] xl:text-[4.2rem]">
                Menos peso na rotina, mais controle no seu negocio.
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-white/78">
                Entre para acompanhar agenda, clientes, equipe, vendas e
                notificacoes em tempo real.
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
                  : "Use o e-mail e a senha do seu salao."}
              </p>
            </div>

            {agendaQuickLogin ? (
              <div className="mb-5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
                <p className="font-semibold">Agenda em modo foco</p>
                <p className="mt-1">
                  Entre novamente e voce volta direto para a agenda, sem passar pelo
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
                  onClick={() =>
                    router.push(
                      email.trim()
                        ? `/recuperar-senha?email=${encodeURIComponent(email.trim())}`
                        : "/recuperar-senha"
                    )
                  }
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
                      Limpar sessao local
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

            {loading && redirectMessage ? (
              <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                {redirectMessage}
              </div>
            ) : null}

            <div className="mt-10 space-y-6 text-center">
              <p className="text-sm text-zinc-600">
                Ainda nao tem conta?{" "}
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      planoSelecionado
                        ? `/cadastro-salao?plano=${encodeURIComponent(planoSelecionado)}`
                        : "/cadastro-salao"
                    )
                  }
                  className="font-black text-[var(--app-accent-strong)] transition hover:text-zinc-950"
                >
                  Cadastre-se
                </button>
              </p>

              <div className="text-sm text-zinc-500">
                <p>Deseja agendar algum servico?</p>
                <button
                  type="button"
                  onClick={() =>
                    window.location.assign("https://salaopremiun.com.br/app-cliente")
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

function LoginBadge({ label }: { label: string }) {
  return (
    <div className="rounded-[20px] border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur">
      {label}
    </div>
  );
}

function getManagedHostHref(path: string, host: "painel" | "assinatura") {
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
