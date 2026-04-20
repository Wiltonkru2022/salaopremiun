"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  ADMIN_MASTER_HOME_PATH,
  sanitizeAdminMasterNextPath,
} from "@/lib/admin-master/auth/login-path";
import {
  clearSupabaseBrowserAuthState,
  getLoginErrorMessage,
  isSupabaseAuthRateLimit,
} from "@/lib/supabase/auth-client-recovery";

export default function AdminMasterLoginPage() {
  return (
    <Suspense fallback={<AdminMasterLoginFallback />}>
      <AdminMasterLoginContent />
    </Suspense>
  );
}

function AdminMasterLoginFallback() {
  return (
    <div className="min-h-screen bg-[#f4efe7] p-4">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center justify-center rounded-[36px] border border-[#d9cfc1] bg-white px-6 py-12 shadow-[0_30px_80px_rgba(57,39,18,0.14)]">
        <p className="text-sm font-medium text-[#6b5b45]">
          Carregando acesso do Admin Master...
        </p>
      </div>
    </div>
  );
}

function AdminMasterLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const submittingRef = useRef(false);

  const [supabase, setSupabase] =
    useState<ReturnType<typeof createClient> | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [rateLimited, setRateLimited] = useState(false);

  const nextPath = useMemo(
    () =>
      sanitizeAdminMasterNextPath(searchParams.get("next")) ||
      ADMIN_MASTER_HOME_PATH,
    [searchParams]
  );

  useEffect(() => {
    setSupabase(createClient());
  }, []);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (loading || submittingRef.current) return;

    if (!supabase) {
      setErro("Cliente de autenticacao ainda nao carregado.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setErro("");
    setRateLimited(false);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setRateLimited(isSupabaseAuthRateLimit(error));
      setErro(getLoginErrorMessage(error));
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    const accessResponse = await fetch(
      `/api/admin-master/auth/access?next=${encodeURIComponent(nextPath)}`,
      {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      }
    );

    const accessPayload = (await accessResponse.json().catch(() => null)) as
      | {
          ok?: boolean;
          message?: string;
          redirectTo?: string;
        }
      | null;

    if (!accessResponse.ok || !accessPayload?.ok) {
      await supabase.auth.signOut();
      setErro(
        accessPayload?.message ||
          "Este e-mail nao possui acesso liberado ao Admin Master."
      );
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    router.push(accessPayload.redirectTo || nextPath);
    router.refresh();
  }

  function limparSessaoLocal() {
    clearSupabaseBrowserAuthState();
    setSupabase(createClient());
    setRateLimited(false);
    setErro("Sessao local limpa. Aguarde alguns segundos e tente entrar de novo.");
    submittingRef.current = false;
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8f1e7,_#efe5d7_52%,_#eadfce_100%)] p-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[36px] border border-[#d9cfc1] bg-white shadow-[0_30px_80px_rgba(57,39,18,0.14)] lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden bg-[#17120d] px-6 py-8 text-white md:px-10 md:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,196,87,0.28),_transparent_38%),linear-gradient(160deg,_rgba(255,255,255,0.04),_transparent_46%)]" />

          <div className="relative flex h-full flex-col justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-100">
                <ShieldCheck size={14} />
                Acesso Interno
              </div>

              <h1 className="mt-6 max-w-xl text-4xl font-black leading-[1.05] text-[#fff6ea] md:text-5xl">
                Admin Master com entrada propria e operacao centralizada.
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-6 text-[#d9cbb8] md:text-base">
                Este ambiente e exclusivo para operacao, financeiro, produto e
                suporte do SalaoPremium. O acesso passa por validacao dedicada
                antes de liberar o painel executivo.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                "Monitora assinaturas, cobrancas e risco operacional em um unico shell.",
                "Centraliza tickets, webhooks, onboarding e saude comercial dos saloes.",
                "Mantem o fluxo separado do login de cliente para reduzir erro humano.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-white/10 bg-white/6 p-4 text-sm leading-6 text-[#f4eadb]"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="rounded-[28px] border border-[#5a4730] bg-[#241b12] p-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#3a2a1a] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200">
                <Sparkles size={12} />
                Fluxo Protegido
              </div>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#dccfbd]">
                Depois do login, o sistema confirma se o e-mail esta ativo em
                <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-xs text-white">
                  admin_master_usuarios
                </code>
                antes de abrir o painel.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center bg-[#fffdf9] px-6 py-8 md:px-10 md:py-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7c45]">
                SalaoPremium
              </p>
              <h2 className="mt-3 text-3xl font-black text-[#21170f]">
                Entrar no Admin Master
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#6b5b45]">
                Use seu e-mail interno para abrir o ambiente administrativo
                executivo.
              </p>
            </div>

            {nextPath !== ADMIN_MASTER_HOME_PATH ? (
              <div className="mb-5 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Apos autenticar, vamos continuar em{" "}
                <code className="rounded bg-white px-1.5 py-0.5 text-xs">
                  {nextPath}
                </code>
                .
              </div>
            ) : null}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#4b3d2c]">
                  E-mail corporativo
                </label>
                <div className="flex items-center gap-3 rounded-[24px] border border-[#d8c7af] bg-white px-4 py-3.5 transition focus-within:border-[#8e6f3d] focus-within:ring-4 focus-within:ring-amber-100">
                  <Mail size={18} className="text-[#96703b]" />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="voce@salaopremiun.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent text-sm text-[#1f1810] outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#4b3d2c]">
                  Senha
                </label>
                <div className="flex items-center gap-3 rounded-[24px] border border-[#d8c7af] bg-white px-4 py-3.5 transition focus-within:border-[#8e6f3d] focus-within:ring-4 focus-within:ring-amber-100">
                  <LockKeyhole size={18} className="text-[#96703b]" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-sm text-[#1f1810] outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Link
                  href="/login"
                  className="text-sm font-medium text-[#7d6240] transition hover:text-[#2e2115]"
                >
                  Login do salao
                </Link>

                <Link
                  href="/recuperar-senha"
                  className="text-sm font-medium text-[#7d6240] transition hover:text-[#2e2115]"
                >
                  Esqueci minha senha
                </Link>
              </div>

              {erro ? (
                <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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
                disabled={loading || !supabase}
                className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-[#1f160e] px-4 py-3.5 font-semibold text-white transition hover:bg-[#2b1d11] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{loading ? "Validando acesso..." : "Entrar no Admin Master"}</span>
                <ArrowRight size={18} />
              </button>
            </form>

            <div className="mt-6 rounded-[24px] border border-[#eadcc8] bg-[#fff6ea] px-4 py-4 text-sm leading-6 text-[#654f35]">
              Se o login autenticar, mas o e-mail nao estiver ativo no
              Admin Master, a sessao e encerrada automaticamente para evitar
              mistura com o ambiente do salao.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
