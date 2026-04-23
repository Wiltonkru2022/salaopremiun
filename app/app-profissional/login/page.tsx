import { redirect } from "next/navigation";
import LoginProfissionalForm from "@/components/profissional/auth/LoginProfissionalForm";
import ProfissionalHeader from "@/components/profissional/layout/ProfissionalHeader";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";

function getGoogleErrorMessage(value: string | string[] | undefined) {
  const code = Array.isArray(value) ? value[0] : value;

  if (!code) return null;

  const messages: Record<string, string> = {
    google_indisponivel: "Login Google indisponivel agora. Use CPF e senha.",
    google_codigo_ausente: "Retorno do Google invalido. Tente novamente.",
    google_sessao_invalida: "Nao foi possivel validar sua sessao Google.",
    google_usuario_invalido: "Nao foi possivel identificar sua conta Google.",
    sessao_expirada: "Sessao expirada. Entre novamente para conectar o Google.",
  };

  return (
    messages[code] ||
    (code.includes("Conta Google")
      ? code
      : "Nao foi possivel entrar com Google. Use CPF e senha.")
  );
}

export default async function LoginProfissionalPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string | string[] }>;
}) {
  const session = await getProfissionalSessionFromCookie();
  const params = await searchParams;

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
            <LoginProfissionalForm
              oauthError={getGoogleErrorMessage(params.erro)}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
