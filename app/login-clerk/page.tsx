"use client";

import { Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ClerkAdminSignIn } from "@/components/auth/ClerkAdminSignIn";

export default function PainelClerkLoginPage() {
  return (
    <Suspense fallback={<PainelClerkLoginFallback />}>
      <PainelClerkLoginContent />
    </Suspense>
  );
}

function PainelClerkLoginFallback() {
  return (
    <main className="min-h-screen bg-zinc-50 px-5 py-10 text-zinc-950">
      <div className="mx-auto w-full max-w-[460px] rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-zinc-500">Carregando autenticação segura...</p>
      </div>
    </main>
  );
}

function PainelClerkLoginContent() {
  const search = useSearchParams();
  const next = search.get("returnTo") || search.get("next") || "/dashboard?boot=1";
  const onAuthenticated = useCallback((redirectTo: string) => {
    const root = String(process.env.NEXT_PUBLIC_APP_URL || "https://salaopremiun.com.br").replace(/\/$/, "");
    const painelHost = root.includes("salaopremiun.com.br")
      ? "https://painel.salaopremiun.com.br"
      : root;
    window.location.replace(`${painelHost}${redirectTo.startsWith("/") ? redirectTo : "/dashboard?boot=1"}`);
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 px-5 py-10 text-zinc-950">
      <div className="mx-auto w-full max-w-[460px] rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">SalãoPremium</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">Entrar no painel</h1>
          <p className="mt-2 text-sm font-medium text-zinc-500">
            Acesso administrativo protegido pelo Clerk e MFA. Contas antigas são migradas automaticamente no primeiro acesso.
          </p>
        </div>
        <ClerkAdminSignIn
          exchangeEndpoint="/api/auth/painel/clerk"
          migrationEndpoint="/api/auth/painel/migrate-to-clerk"
          nextPath={next}
          onAuthenticated={onAuthenticated}
        />
      </div>
    </main>
  );
}
