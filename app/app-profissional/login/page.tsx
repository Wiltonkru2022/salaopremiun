import { redirect } from "next/navigation";
import LoginProfissionalForm from "@/components/profissional/auth/LoginProfissionalForm";
import ProfissionalHeader from "@/components/profissional/layout/ProfissionalHeader";
import {
  clearProfissionalSession,
  getProfissionalSessionFromCookie,
} from "@/lib/profissional-auth.server";
import { validateProfissionalAppSession } from "@/lib/profissional-context.server";

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
  searchParams: Promise<{ erro?: string | string[]; limpar?: string | string[] }>;
}) {
  const params = await searchParams;
  const limpar = Array.isArray(params.limpar) ? params.limpar[0] : params.limpar;

  if (limpar === "1") {
    await clearProfissionalSession();
  }

  const session = await getProfissionalSessionFromCookie();

  if (session) {
    const validation = await validateProfissionalAppSession().catch(() => null);

    if (validation?.context) {
      redirect("/app-profissional/inicio");
    }

    await clearProfissionalSession();
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
