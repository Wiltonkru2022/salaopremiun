import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import ProfissionalShell from "@/components/profissional/layout/ProfissionalShell";
import TrocarSenhaProfissionalForm from "@/components/profissional/auth/TrocarSenhaProfissionalForm";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";

export default async function TrocarSenhaProfissionalPage() {
  await requireProfissionalAppContext();

  return (
    <ProfissionalShell title="Trocar senha" subtitle="Acesso do profissional">
      <div className="space-y-3.5 pb-20">
        <Link
          href="/app-profissional/perfil"
          className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700"
        >
          <ArrowLeft size={14} />
          Voltar para perfil
        </Link>

        <section className="overflow-hidden rounded-[1.5rem] bg-zinc-950 px-4 py-4 text-white shadow-[0_16px_34px_rgba(15,23,42,0.15)]">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100">
            <KeyRound size={14} />
            Acesso seguro
          </div>
          <h1 className="mt-3 text-[1.45rem] font-black leading-none tracking-[-0.04em]">
            Atualizar senha
          </h1>
          <p className="mt-2.5 text-sm leading-6 text-zinc-300">
            A nova senha passa a valer no proximo login pelo CPF do profissional.
          </p>
        </section>

        <TrocarSenhaProfissionalForm />
      </div>
    </ProfissionalShell>
  );
}
