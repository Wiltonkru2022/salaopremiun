import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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

            <RecuperarSenhaProfissionalForm />
          </div>
        </main>
      </div>
    </div>
  );
}
