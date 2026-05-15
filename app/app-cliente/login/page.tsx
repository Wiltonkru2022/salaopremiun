import Link from "next/link";
import { redirect } from "next/navigation";
import ClientSessionAutoRestore from "@/components/client-app/ClientSessionAutoRestore";
import LoginClienteForm from "@/components/client-app/auth/LoginClienteForm";
import { canSalonAppearInClientApp } from "@/lib/client-app/eligibility";
import { getClienteSessionFromCookie } from "@/lib/cliente-auth.server";
import { validateClienteAppSession } from "@/lib/client-context.server";
import { buildSalaoPublicPath } from "@/lib/saloes/public-link";
import { buildSecurityBlockPath } from "@/lib/security/user-security";

export const metadata = {
  title: "Login do Cliente",
};

function getErrorMessage(value: string | string[] | undefined) {
  const code = Array.isArray(value) ? value[0] : value;

  if (!code) return null;

  const messages: Record<string, string> = {
    sessao_expirada:
      "Estamos restaurando seu acesso neste aparelho. Se não voltar sozinho, entre novamente.",
    salao_indisponivel:
      "Esse salão não está disponível no app cliente agora. Confira o plano ou tente outro salão.",
  };

  return messages[code] || "Não foi possível entrar agora. Tente novamente.";
}

export default async function LoginClientePage({
  searchParams,
}: {
  searchParams: Promise<{
    erro?: string | string[];
    salao?: string | string[];
    next?: string | string[];
    logout?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const salaoId = Array.isArray(params.salao) ? params.salao[0] : params.salao;
  const next =
    (Array.isArray(params.next) ? params.next[0] : params.next) || "";
  const logout = Array.isArray(params.logout)
    ? params.logout[0]
    : params.logout;
  const session = await getClienteSessionFromCookie();

  if (session && logout !== "1") {
    const validation = await validateClienteAppSession().catch(() => null);
    if (validation?.context) {
      redirect(next || "/app-cliente/agendamentos");
    }

    if (validation?.reason === "security_blocked") {
      const destino = buildSecurityBlockPath({
        tipoUsuario: "cliente",
        origem: "cliente_login",
        returnTo: next || "/app-cliente",
      });
      redirect(
        `/app-cliente/logout?destino=${encodeURIComponent(destino)}`
      );
    }
  }

  const salaoContext = salaoId
    ? await canSalonAppearInClientApp(salaoId).catch(() => null)
    : null;
  const salaoPublicPath = salaoContext?.salao
    ? buildSalaoPublicPath(salaoContext.salao.appClienteSlug || salaoContext.salao.id)
    : salaoId
      ? buildSalaoPublicPath(salaoId)
      : null;

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[radial-gradient(circle_at_top,#fff2c5_0,#f5f5f5_42%,#e7ecf2_100%)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[#f5f5f5]/95 shadow-[0_0_80px_rgba(15,23,42,0.08)]">
        <header className="px-4 pt-4">
          <Link
            href={salaoPublicPath ? salaoPublicPath : "/app-cliente/inicio"}
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600"
          >
            Voltar
          </Link>
        </header>

        <main className="flex flex-1 items-start px-4 pb-6 pt-4">
          <div className="w-full space-y-3.5">
            <ClientSessionAutoRestore
              next={next || salaoPublicPath}
              clearOnLoad={logout === "1"}
            />

            <section className="overflow-hidden rounded-[1.5rem] bg-zinc-950 px-4 py-4 text-white shadow-[0_16px_34px_rgba(15,23,42,0.15)]">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10">
                  <img
                    src="/favicon-preview.png"
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </span>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100">
                    Cliente premium
                  </div>
                  <h1 className="mt-2 text-[1.5rem] font-black leading-none">
                    Entrar no app cliente
                  </h1>
                </div>
              </div>
              <p className="mt-2.5 text-sm leading-6 text-zinc-300">
                Acompanhe seus horários e agende seus próximos cuidados.
              </p>
            </section>

            <LoginClienteForm
              salaoId={salaoContext?.salao?.id || salaoId || null}
              salaoNome={salaoContext?.salao?.nome || null}
              oauthError={getErrorMessage(params.erro)}
              next={next || salaoPublicPath}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
