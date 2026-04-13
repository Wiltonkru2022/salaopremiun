import LoginProfissionalForm from "@/components/profissional/auth/LoginProfissionalForm";
import ProfissionalHeader from "@/components/profissional/layout/ProfissionalHeader";

export default function LoginProfissionalPage() {
  return (
    <div className="min-h-dvh bg-[#f5f5f5]">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-[#f5f5f5]">
        <ProfissionalHeader
          title="SalãoPremium"
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