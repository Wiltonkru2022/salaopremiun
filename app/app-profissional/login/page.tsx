import { redirect } from "next/navigation";
import Link from "next/link";
import LoginProfissionalForm from "@/components/profissional/auth/LoginProfissionalForm";
import ProfissionalHeader from "@/components/profissional/layout/ProfissionalHeader";
import { getPlanoMinimoParaRecurso } from "@/lib/plans/catalog";
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

function getPlanoError(value: string | string[] | undefined) {
  const code = Array.isArray(value) ? value[0] : value;
  return code === "plano_sem_app";
}

export default async function LoginProfissionalPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string | string[]; limpar?: string | string[] }>;
}) {
  const params = await searchParams;
  const limpar = Array.isArray(params.limpar) ? params.limpar[0] : params.limpar;
  const planoSemApp = getPlanoError(params.erro);

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
            {planoSemApp ? (
              <div className="mb-4 rounded-[1.6rem] border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
                  Recurso do plano
                </div>
                <h2 className="mt-2 text-lg font-black tracking-[-0.03em]">
                  App profissional liberado no Pro ou Premium
                </h2>
                <p className="mt-2 text-sm leading-6 text-amber-800">
                  Este salao ainda nao tem acesso ao app profissional no plano
                  atual. Para usar agenda, comandas e clientes no celular, o
                  administrador precisa fazer upgrade.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="https://painel.salaopremiun.com.br/comparar-planos"
                    className="inline-flex items-center justify-center rounded-2xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                  >
                    Comparar planos
                  </Link>
                  <Link
                    href={`https://assinatura.salaopremiun.com.br/assinatura?plano=${getPlanoMinimoParaRecurso("app_profissional")}`}
                    className="inline-flex items-center justify-center rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  >
                    Fazer upgrade
                  </Link>
                </div>
              </div>
            ) : null}
            <LoginProfissionalForm
              oauthError={getGoogleErrorMessage(params.erro)}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
