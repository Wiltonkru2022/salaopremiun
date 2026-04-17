"use client";

import { Suspense, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail, Sparkles } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-xl rounded-[32px] border border-zinc-200 bg-white p-10 text-center shadow-2xl">
        <p className="text-sm text-zinc-500">Carregando login...</p>
      </div>
    </div>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const planoSelecionado = searchParams.get("plano")?.trim() || "";
  const emailQuery = searchParams.get("email")?.trim() || "";

  useEffect(() => {
    setSupabase(createClient());
  }, []);

  useEffect(() => {
    if (!emailQuery) return;
    setEmail((current) => current || emailQuery);
  }, [emailQuery]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!supabase) {
      setErro("Cliente de autenticação ainda não carregado.");
      return;
    }

    setLoading(true);
    setErro("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErro("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }

    router.push(
      planoSelecionado
        ? `/assinatura?plano=${encodeURIComponent(planoSelecionado)}`
        : "/dashboard"
    );
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-2xl md:grid-cols-2">
        <div className="hidden bg-zinc-900 p-10 text-white md:flex md:flex-col md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-300">
              <Sparkles size={14} />
              Sistema SaaS
            </div>

            <h1 className="mt-5 text-4xl font-bold leading-tight">
              SalaoPremium
            </h1>

            <p className="mt-4 max-w-md text-zinc-300">
              Gestão profissional para salões, clínicas e profissionais da
              beleza.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-200">
              Agenda própria, sem calendar pronto
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-200">
              Multi-salão com isolamento por salão
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-200">
              Painel premium com financeiro, vendas e relatórios
            </div>
          </div>
        </div>

        <div className="p-6 md:p-10">
          <div className="mx-auto max-w-md">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-zinc-900">Entrar</h2>
              <p className="mt-2 text-zinc-500">
                Acesse seu painel administrativo
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  E-mail
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-zinc-300 px-4 py-3 transition focus-within:border-zinc-900 focus-within:ring-4 focus-within:ring-zinc-200">
                  <Mail size={18} className="text-zinc-400" />
                  <input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent text-sm text-zinc-900 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Senha
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-zinc-300 px-4 py-3 transition focus-within:border-zinc-900 focus-within:ring-4 focus-within:ring-zinc-200">
                  <LockKeyhole size={18} className="text-zinc-400" />
                  <input
                    type="password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-sm text-zinc-900 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => router.push("/recuperar-senha")}
                  className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
                >
                  Esqueci minha senha
                </button>
              </div>

              {erro ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {erro}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading || !supabase}
                className="w-full rounded-2xl bg-zinc-900 px-4 py-3 font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-200" />
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                ou
              </span>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  planoSelecionado
                    ? `/cadastro-salao?plano=${encodeURIComponent(planoSelecionado)}`
                    : "/cadastro-salao"
                )
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-4 py-3 font-semibold text-zinc-900 transition hover:border-zinc-900 hover:bg-zinc-50"
            >
              <span>Cadastrar salão</span>
              <ArrowRight size={18} />
            </button>

            <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-600">
              Novo por aqui? Crie seu salão, escolha o plano e comece com agenda,
              caixa, comandas e gestão completa.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
