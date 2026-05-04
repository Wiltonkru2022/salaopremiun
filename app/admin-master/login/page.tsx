"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  ADMIN_MASTER_HOME_PATH,
  sanitizeAdminMasterNextPath,
} from "@/lib/admin-master/auth/login-path";

const LOGIN_HOST =
  process.env.NEXT_PUBLIC_APP_LOGIN_HOST ||
  process.env.APP_LOGIN_HOST ||
  "login.salaopremiun.com.br";

function buildLoginHostUrl(pathname: string) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `https://${LOGIN_HOST}${normalizedPath}`;
}

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
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center justify-center rounded-[28px] border border-[#d9cfc1] bg-white px-6 py-10 shadow-[0_24px_70px_rgba(57,39,18,0.14)]">
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const nextPath = useMemo(
    () =>
      sanitizeAdminMasterNextPath(searchParams.get("next")) ||
      ADMIN_MASTER_HOME_PATH,
    [searchParams]
  );
  const salaoLoginUrl = useMemo(() => buildLoginHostUrl("/login"), []);
  const recuperarSenhaUrl = useMemo(
    () => buildLoginHostUrl("/recuperar-senha"),
    []
  );

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (loading || submittingRef.current) return;

    submittingRef.current = true;
    setLoading(true);
    setErro("");

    try {
      const loginResponse = await fetch("/api/admin-master/auth/login", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          next: nextPath,
        }),
      });

      const loginPayload = (await loginResponse.json().catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
            redirectTo?: string;
          }
        | null;

      if (!loginResponse.ok || !loginPayload?.ok) {
        setErro(
          loginPayload?.message ||
            "Nao foi possivel concluir o login do Admin Master."
        );
        return;
      }

      router.push(loginPayload.redirectTo || nextPath);
      router.refresh();
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8f1e7,_#efe5d7_52%,_#eadfce_100%)] p-4">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[28px] border border-[#d9cfc1] bg-white shadow-[0_24px_70px_rgba(57,39,18,0.14)] lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden bg-[#17120d] px-6 py-7 text-white md:px-8 md:py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,196,87,0.28),_transparent_38%),linear-gradient(160deg,_rgba(255,255,255,0.04),_transparent_46%)]" />

          <div className="relative flex h-full flex-col justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-100">
                <ShieldCheck size={14} />
                Acesso Interno
              </div>

              <h1 className="mt-5 max-w-xl text-[2.2rem] font-black leading-[1.05] text-[#fff6ea] md:text-[3rem]">
                Admin Master com entrada propria e operacao centralizada.
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-6 text-[#d9cbb8] md:text-[15px]">
                Este ambiente e exclusivo para operacao, financeiro, produto e
                suporte do SalaoPremium. O acesso passa por validacao dedicada
                antes de liberar o painel executivo.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                "Monitora assinaturas, cobrancas e risco operacional em um unico shell.",
                "Centraliza tickets, webhooks, onboarding e saude comercial dos saloes.",
                "Mantem o fluxo separado do login de cliente para reduzir erro humano.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[20px] border border-white/10 bg-white/6 p-3.5 text-sm leading-6 text-[#f4eadb]"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="rounded-[22px] border border-[#5a4730] bg-[#241b12] p-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#3a2a1a] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                <Sparkles size={12} />
                Fluxo Protegido
              </div>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#dccfbd]">
                Depois do login, o sistema confirma se o e-mail esta ativo em
                <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-xs text-white">
                  admin_master_usuarios
                </code>
                antes de abrir o painel.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center bg-[#fffdf9] px-6 py-7 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7c45]">
                SalaoPremium
              </p>
              <h2 className="mt-2.5 text-[2rem] font-black text-[#21170f]">
                Entrar no Admin Master
              </h2>
              <p className="mt-2.5 text-sm leading-6 text-[#6b5b45]">
                Use seu e-mail interno para abrir o ambiente administrativo
                executivo. Essa sessao nao compartilha login com o painel do
                salao.
              </p>
            </div>

            {nextPath !== ADMIN_MASTER_HOME_PATH ? (
              <div className="mb-4 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Apos autenticar, vamos continuar em{" "}
                <code className="rounded bg-white px-1.5 py-0.5 text-xs">
                  {nextPath}
                </code>
                .
              </div>
            ) : null}

            <form onSubmit={handleLogin} className="space-y-4.5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#4b3d2c]">
                  E-mail corporativo
                </label>
                <div className="flex items-center gap-3 rounded-[20px] border border-[#d8c7af] bg-white px-4 py-3 transition focus-within:border-[#8e6f3d] focus-within:ring-4 focus-within:ring-amber-100">
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
                <div className="flex items-center gap-3 rounded-[20px] border border-[#d8c7af] bg-white px-4 py-3 transition focus-within:border-[#8e6f3d] focus-within:ring-4 focus-within:ring-amber-100">
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
                <a
                  href={salaoLoginUrl}
                  className="text-sm font-medium text-[#7d6240] transition hover:text-[#2e2115]"
                >
                  Login do salao
                </a>

                <a
                  href={recuperarSenhaUrl}
                  className="text-sm font-medium text-[#7d6240] transition hover:text-[#2e2115]"
                >
                  Esqueci minha senha
                </a>
              </div>

              {erro ? (
                <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <p>{erro}</p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-[#1f160e] px-4 py-3 font-semibold text-white transition hover:bg-[#2b1d11] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>{loading ? "Validando acesso..." : "Entrar no Admin Master"}</span>
                <ArrowRight size={18} />
              </button>
            </form>

            <div className="mt-5 rounded-[20px] border border-[#eadcc8] bg-[#fff6ea] px-4 py-3.5 text-sm leading-6 text-[#654f35]">
              O Admin Master usa uma sessao separada do painel do salao. Mesmo
              com o mesmo navegador aberto, um acesso nao derruba o outro.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
