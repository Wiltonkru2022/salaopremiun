"use client";

import { Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { ClerkAdminSignIn } from "@/components/auth/ClerkAdminSignIn";
import { getLoginRedirectNotice } from "@/lib/auth/login-redirect";

export default function PainelClerkLoginPage() {
  return (
    <Suspense fallback={<PainelClerkLoginFallback />}>
      <PainelClerkLoginContent />
    </Suspense>
  );
}

function PainelClerkLoginFallback() {
  return <main className="min-h-screen bg-white" />;
}

function PainelClerkLoginContent() {
  const search = useSearchParams();
  const next = search.get("returnTo") || search.get("next") || "/dashboard?boot=1";
  const notice = getLoginRedirectNotice(search);

  const onAuthenticated = useCallback((redirectTo: string) => {
    const root = String(process.env.NEXT_PUBLIC_APP_URL || "https://salaopremiun.com.br").replace(/\/$/, "");
    const painelHost = root.includes("salaopremiun.com.br") ? "https://painel.salaopremiun.com.br" : root;
    window.location.replace(`${painelHost}${redirectTo.startsWith("/") ? redirectTo : "/dashboard?boot=1"}`);
  }, []);

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <header className="flex h-[74px] items-center justify-between border-b border-zinc-200 bg-white px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-amber-300">
            <Sparkles size={18} />
          </span>
          <span className="text-lg font-black tracking-[-0.03em]">SalãoPremium</span>
        </div>
        <span className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-600">Painel do salão</span>
      </header>

      <main className="grid min-h-[calc(100vh-74px)] lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-zinc-950 bg-cover bg-center lg:block" style={{ backgroundImage: "url('/site/cadastro-salao-bg.jpeg')" }}>
          <div className="absolute inset-0 bg-zinc-950/60" />
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-950/55 to-transparent" />
          <div className="relative flex h-full flex-col justify-between p-10 text-white xl:p-14">
            <div className="max-w-lg">
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-white/75">Acesso seguro</div>
              <h1 className="mt-7 text-[3.2rem] font-black leading-[0.95] tracking-[-0.05em] xl:text-[4.2rem]">Menos peso na rotina, mais controle no seu negócio.</h1>
              <p className="mt-5 max-w-md text-base leading-7 text-white/78">Agenda, clientes, equipe, vendas e gestão protegidos por autenticação moderna e MFA.</p>
            </div>
            <div className="grid max-w-xl gap-3 sm:grid-cols-3">
              {['Agenda protegida','Equipe conectada','Dados seguros'].map((label) => <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-semibold text-white/80">{label}</div>)}
            </div>
          </div>
        </section>

        <section className="flex items-start justify-center px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="w-full max-w-[460px]">
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">SalãoPremium</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">Entrar no painel</h2>
              <p className="mt-2 text-sm font-semibold text-zinc-500">Seu login continua com a cara do Salão Premium. O Clerk fica por trás cuidando de sessão e MFA.</p>
            </div>

            {notice ? (
              <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${notice.tone === 'danger' ? 'border-rose-200 bg-rose-50 text-rose-700' : notice.tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : notice.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>
                <p className="font-bold">{notice.title}</p><p className="mt-1">{notice.description}</p>
              </div>
            ) : null}

            <ClerkAdminSignIn
              exchangeEndpoint="/api/auth/painel/clerk"
              migrationEndpoint="/api/auth/painel/migrate-to-clerk"
              nextPath={next}
              onAuthenticated={onAuthenticated}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
