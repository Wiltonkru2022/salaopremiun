"use client";

import { Suspense, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ClerkAdminSignIn } from "@/components/auth/ClerkAdminSignIn";
import {
  ADMIN_MASTER_HOME_PATH,
  sanitizeAdminMasterNextPath,
} from "@/lib/admin-master/auth/login-path";

const PAINEL_HOST =
  process.env.NEXT_PUBLIC_PAINEL_HOST ||
  process.env.PAINEL_HOST ||
  "painel.salaopremiun.com.br";

function buildPainelHostUrl(pathname: string) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `https://${PAINEL_HOST}${normalizedPath}`;
}

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export default function AdminMasterClerkLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4efe7]" />}>
      <AdminMasterClerkLoginContent />
    </Suspense>
  );
}

function AdminMasterClerkLoginContent() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => sanitizeAdminMasterNextPath(searchParams.get("next")) || ADMIN_MASTER_HOME_PATH,
    [searchParams]
  );

  const onAuthenticated = useCallback((redirectTo: string) => {
    if (typeof window === "undefined") return;

    // Em desenvolvimento o Admin Master permanece no próprio localhost.
    // Antes o login 200 tentava navegar para painel.salaopremiun.com.br,
    // iniciando novas trocas de sessão e causando 401 depois do sucesso.
    if (isLocalHost(window.location.hostname)) {
      window.location.assign(redirectTo.startsWith("/") ? redirectTo : ADMIN_MASTER_HOME_PATH);
      return;
    }

    if (window.location.hostname !== PAINEL_HOST && redirectTo.startsWith("/")) {
      window.location.assign(buildPainelHostUrl(redirectTo));
      return;
    }

    window.location.assign(redirectTo);
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8f1e7,_#efe5d7_52%,_#eadfce_100%)] px-4 py-8 text-[#21170f]">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl overflow-hidden rounded-[32px] border border-[#d9cfc1] bg-[#fffdf9] shadow-[0_28px_90px_rgba(57,39,18,0.16)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden bg-[#1f160e] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7b36f]">SalãoPremium</p>
            <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-[-0.05em]">Admin Master seguro, sem perder a identidade do sistema.</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/70">Acesse com segurança as ferramentas de administração do SalãoPremium.</p>
          </div>
          <div className="grid gap-3 text-sm text-white/75">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Acesso por e-mail e senha. A verificação em duas etapas é opcional.</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Sessão separada do painel dos salões.</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Seus dados administrativos permanecem protegidos.</div>
          </div>
        </section>

        <section className="p-6 sm:p-8 lg:p-10">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#9d7c45]">Acesso executivo</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">Entrar no Admin Master</h2>
          <p className="mt-3 text-sm leading-6 text-[#6b5b45]">Entre com sua conta administrativa. A verificação em duas etapas pode ser ativada depois, se desejar.</p>

          <div className="mt-6">
            <ClerkAdminSignIn
              exchangeEndpoint="/api/admin-master/auth/clerk"
              migrationEndpoint="/api/admin-master/auth/migrate-to-clerk"
              nextPath={nextPath}
              onAuthenticated={onAuthenticated}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
