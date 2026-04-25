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

        <main className="flex flex-1 items-start px-4 py-5">
          <div className="w-full space-y-4">
            <Link
              href="/app-profissional/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600"
            >
              <ChevronLeft size={16} />
              Voltar para login
            </Link>

            <section className="overflow-hidden rounded-[1.85rem] bg-zinc-950 px-4 py-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-100">
                <ShieldCheck size={14} />
                Acesso seguro
              </div>
              <h1 className="mt-4 text-[1.7rem] font-black tracking-[-0.05em] leading-none">
                Pedir nova senha
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Informe seu CPF e um contato opcional. O pedido segue para o suporte
                do salao sem expor senha no app.
              </p>
            </section>

            <RecuperarSenhaProfissionalForm />

            <div className="rounded-[1.6rem] border border-zinc-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <Ticket size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-bold tracking-[-0.02em] text-zinc-950">
                    Como funciona
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
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
