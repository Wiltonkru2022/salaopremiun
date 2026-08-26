"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { ClerkAdminSignIn } from "@/components/auth/ClerkAdminSignIn";
import { sanitizeLoginReturnTo } from "@/lib/auth/login-redirect";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <Loader2 className="animate-spin text-zinc-500" size={24} />
    </div>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const returnTo = sanitizeLoginReturnTo(searchParams.get("returnTo"));
  const plano = searchParams.get("plano")?.trim() || "";
  const nextPath = returnTo || (plano ? `/assinatura?plano=${encodeURIComponent(plano)}` : "/dashboard?boot=1");

  const onAuthenticated = useCallback((redirectTo: string) => {
    window.location.replace(redirectTo || nextPath);
  }, [nextPath]);

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <header className="flex h-[74px] items-center justify-between border-b border-zinc-200 bg-white px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-[var(--app-accent)]">
            <Sparkles size={18} />
          </span>
          <span className="font-display text-lg font-black tracking-[-0.03em]">SalãoPremium</span>
        </Link>
        <Link href="/cadastro-salao" className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-black text-zinc-800 transition hover:border-zinc-950">
          Cadastrar salão
        </Link>
      </header>

      <main className="grid min-h-[calc(100vh-74px)] lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-zinc-950 bg-cover bg-center lg:block" style={{ backgroundImage: "url('/site/cadastro-salao-bg.jpeg')" }}>
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-black/45 to-black/80" />
          <div className="relative flex h-full flex-col justify-end p-12 text-white">
            <p className="max-w-xl text-4xl font-black tracking-[-0.05em]">Seu salão conectado com segurança, dados no Neon e acesso protegido pelo Clerk.</p>
            <p className="mt-4 max-w-lg text-base leading-7 text-white/75">Painel, Admin Master e operações administrativas não usam mais sessão do Supabase.</p>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-7">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-zinc-400">Acesso do salão</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-zinc-950">Entrar no painel</h1>
              <p className="mt-2 text-sm leading-6 text-zinc-600">Use sua conta Clerk. Se sua conta ainda era do login antigo, faça a migração única abaixo.</p>
            </div>

            <ClerkAdminSignIn
              exchangeEndpoint="/api/auth/painel/clerk"
              migrationEndpoint="/api/auth/painel/migrate-to-clerk"
              nextPath={nextPath}
              onAuthenticated={onAuthenticated}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
