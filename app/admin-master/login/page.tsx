"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AdminMasterPasswordLogin } from "@/components/auth/AdminMasterPasswordLogin";
import {
  ADMIN_MASTER_HOME_PATH,
  sanitizeAdminMasterNextPath,
} from "@/lib/admin-master/auth/login-path";

export default function AdminMasterLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <AdminMasterLoginContent />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#efe5d7] px-4">
      <p className="text-sm font-semibold text-zinc-600">Carregando login...</p>
    </main>
  );
}

function AdminMasterLoginContent() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () =>
      sanitizeAdminMasterNextPath(searchParams.get("next")) ||
      ADMIN_MASTER_HOME_PATH,
    [searchParams]
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8f1e7,_#efe5d7_52%,_#eadfce_100%)] px-4 py-8 text-[#21170f]">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl overflow-hidden rounded-[32px] border border-[#d9cfc1] bg-[#fffdf9] shadow-[0_28px_90px_rgba(57,39,18,0.16)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden bg-[#1f160e] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7b36f]">
              SalãoPremium
            </p>
            <h1 className="mt-6 text-5xl font-black leading-[0.95] tracking-[-0.05em]">
              Admin Master
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/70">
              Acesso interno separado do painel dos salões. Entre somente com seu e-mail administrativo e senha.
            </p>
          </div>

          <div className="space-y-3 text-sm text-white/75">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              Sessão própria do Admin Master.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              O cadastro administrativo continua validado no Neon.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              MFA não é obrigatório neste login.
            </div>
          </div>
        </section>

        <section className="flex items-center p-6 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800">
                <ShieldCheck size={14} /> Acesso administrativo
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em]">
                Entrar no Admin Master
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6b5b45]">
                Digite seu e-mail e senha. Não há etapa de MFA neste fluxo.
              </p>
            </div>

            <AdminMasterPasswordLogin nextPath={nextPath} />
          </div>
        </section>
      </div>
    </main>
  );
}
