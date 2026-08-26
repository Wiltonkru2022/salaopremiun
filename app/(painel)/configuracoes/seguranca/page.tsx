"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { PainelPageHeader } from "@/components/painel-ui";

type MfaStatus = {
  ok?: boolean;
  provider?: string;
  factorActive?: boolean;
  currentLevel?: "aal1" | "aal2";
};

export default function SegurancaConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [mfaAtivo, setMfaAtivo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function carregar() {
      try {
        setLoading(true);
        const response = await fetch("/api/auth/mfa", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });
        const payload = (await response.json().catch(() => null)) as MfaStatus | null;
        if (!cancelled) {
          setMfaAtivo(Boolean(response.ok && payload?.factorActive));
        }
      } catch {
        if (!cancelled) setMfaAtivo(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void carregar();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5">
      <PainelPageHeader
        eyebrow="Configurações"
        title="Segurança da conta"
        description="Senha e verificação em 2 etapas são protegidas pelo Clerk; os dados do salão permanecem no Neon."
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white">
              <ShieldCheck size={21} />
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${mfaAtivo ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>
              {loading ? (
                <span className="inline-flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" />Verificando...</span>
              ) : mfaAtivo ? "Ativada" : "Opcional"}
            </span>
          </div>
          <h2 className="mt-5 text-xl font-black tracking-[-0.03em] text-zinc-950">Verificação em 2 etapas</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            O autenticador e o segundo fator são gerenciados pelo Clerk. O SalãoPremium apenas consome o estado verificado da sessão.
          </p>
          <Link
            href="/seguranca/mfa?next=/configuracoes/seguranca"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white"
          >
            {mfaAtivo ? "Gerenciar no Clerk" : "Configurar no Clerk"}
          </Link>
        </div>

        <div className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
            <KeyRound size={21} />
          </div>
          <h2 className="mt-5 text-xl font-black tracking-[-0.03em] text-zinc-950">Senha da conta</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            A senha não é mais atualizada pelo banco. A troca e a recuperação ficam no fluxo seguro do Clerk.
          </p>
          <a
            href="https://login.salaopremiun.com.br/login-clerk?motivo=recuperar_senha&next=%2Fconfiguracoes%2Fseguranca"
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white"
          >
            <KeyRound size={17} />
            Alterar ou recuperar senha
          </a>
        </div>
      </section>
    </div>
  );
}
