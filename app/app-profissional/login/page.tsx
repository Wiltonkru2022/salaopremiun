import { redirect } from "next/navigation";
import LoginProfissionalForm from "@/components/profissional/auth/LoginProfissionalForm";
import ProfissionalHeader from "@/components/profissional/layout/ProfissionalHeader";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";

export default async function LoginProfissionalPage() {
  const session = await getProfissionalSessionFromCookie();

  if (session) {
    redirect("/app-profissional/inicio");
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,#fff2c5_0,#f5f5f5_42%,#e7ecf2_100%)]">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-[#f5f5f5]/95 shadow-[0_0_80px_rgba(15,23,42,0.08)]">
        <ProfissionalHeader
          title="SalaoPremium"
          subtitle="Acesso do profissional"
        />

        <main className="flex flex-1 items-start px-4 py-5">
          <div className="w-full">
            <LoginProfissionalForm />
          </div>
        </main>
      </div>
    </div>
  );
}
