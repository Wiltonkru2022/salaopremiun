import Link from "next/link";
import { ChevronLeft, ShieldCheck, Ticket } from "lucide-react";
import RecuperarSenhaProfissionalForm from "@/components/profissional/auth/RecuperarSenhaProfissionalForm";
import ProfissionalHeader from "@/components/profissional/layout/ProfissionalHeader";

export default function RecuperarSenhaProfissionalPage() {
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,#fff2c5_0,#f5f5f5_42%,#e7ecf2_100%)]">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-[#f5f5f5]/95 shadow-[0_0_80px_rgba(15,23,42,0.08)]">
        <ProfissionalHeader
          title="Recuperar senha"
          subtitle="Acesso do profissional"
        />

        <main className="flex flex-1 items-start px-4 py-4">
          <div className="w-full space-y-3.5">
            <Link
              href="/app-profissional/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600"
            >
              <ChevronLeft size={16} />
              Voltar para login
            </Link>

            <section className="overflow-hidden rounded-[1.5rem] bg-zinc-950 px-4 py-4 text-white shadow-[0_16px_34px_rgba(15,23,42,0.15)]">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100">
                <ShieldCheck size={14} />
                Acesso seguro
              </div>
              <h1 className="mt-3 text-[1.5rem] font-black tracking-[-0.04em] leading-none">
                Pedir nova senha
              </h1>
              <p className="mt-2.5 text-sm leading-6 text-zinc-300">
                Informe seu CPF e um contato opcional. O pedido segue para o suporte
                do salao sem expor senha no app.
              </p>
            </section>

            <RecuperarSenhaProfissionalForm />

            <div className="rounded-[1.4rem] border border-zinc-200 bg-white p-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-amber-50 text-amber-700">
                  <Ticket size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-bold tracking-[-0.02em] text-zinc-950">
                    Como funciona
                  </div>
                  <p className="mt-1.5 text-sm leading-6 text-zinc-500">
                    Assim que o pedido entrar, a equipe do salao pode redefinir seu
                    acesso com seguranca e te orientar pelo contato informado.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
