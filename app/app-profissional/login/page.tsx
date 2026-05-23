import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Sparkles } from "lucide-react";
import LoginProfissionalForm from "@/components/profissional/auth/LoginProfissionalForm";
import { getPlanoMinimoParaRecurso } from "@/lib/plans/catalog";
import {
  getProfissionalSessionFromCookie,
} from "@/lib/profissional-auth.server";
import { validateProfissionalAppSession } from "@/lib/profissional-context.server";
import { buildSecurityBlockPath } from "@/lib/security/user-security";

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
    redirect("/app-profissional/logout?destino=/app-profissional/login");
  }

  const session = await getProfissionalSessionFromCookie();

  if (session) {
    const validation = await validateProfissionalAppSession().catch(() => null);

    if (validation?.context) {
      redirect("/app-profissional/inicio");
    }

    if (validation?.reason === "security_blocked") {
      const destino = buildSecurityBlockPath({
        tipoUsuario: "profissional",
        origem: "profissional_login",
        returnTo: "/app-profissional",
      });
      redirect(
        `/app-profissional/logout?destino=${encodeURIComponent(destino)}`
      );
    }

    const destino =
      validation?.reason === "plan_blocked"
        ? "/app-profissional/login?erro=plano_sem_app"
        : "/app-profissional/login";

    redirect(
      `/app-profissional/logout?destino=${encodeURIComponent(destino)}`
    );
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,#fff2c5_0,#f5f5f5_42%,#e7ecf2_100%)]">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-[#f5f5f5]/95 shadow-[0_0_80px_rgba(15,23,42,0.08)]">
        <main className="flex flex-1 items-start px-4 py-[calc(env(safe-area-inset-top)+1rem)]">
          <div className="w-full space-y-3.5">
            <section className="overflow-hidden rounded-[1.5rem] bg-zinc-950 px-4 py-4 text-white shadow-[0_16px_34px_rgba(15,23,42,0.15)]">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10">
                  <img src="/favicon-preview.png" alt="" className="h-full w-full object-cover" />
                </span>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-amber-100">
                    <Sparkles size={14} />
                    App profissional
                  </div>
                  <h1 className="mt-2 text-[1.5rem] font-black tracking-[-0.04em] leading-none">
                    Entrar na rotina do salão
                  </h1>
                </div>
              </div>
              <p className="mt-2.5 text-sm leading-6 text-zinc-300">
                Agenda, comandas, clientes e comissões em um acesso leve e seguro.
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold text-white/80">
                <ShieldCheck size={15} />
                Login por CPF e senha cadastrados pelo salão.
              </div>
            </section>

            {planoSemApp ? (
              <div className="mb-3.5 rounded-[1.4rem] border border-amber-200 bg-amber-50 p-3.5 text-amber-900 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700">
                  Recurso do plano
                </div>
                <h2 className="mt-2 text-[1.05rem] font-black tracking-[-0.03em]">
                  App profissional liberado no Pro ou Premium
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-amber-800">
                  Este salão ainda não tem acesso ao app profissional no plano
                  atual. Para usar agenda, comandas e clientes no celular, o
                  administrador precisa fazer upgrade.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href="https://painel.salaopremiun.com.br/comparar-planos"
                    className="inline-flex items-center justify-center rounded-[18px] border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                  >
                    Comparar planos
                  </Link>
                  <Link
                    href={`https://assinatura.salaopremiun.com.br/assinatura?plano=${getPlanoMinimoParaRecurso("app_profissional")}`}
                    className="inline-flex items-center justify-center rounded-[18px] bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  >
                    Fazer upgrade
                  </Link>
                </div>
              </div>
            ) : null}
            <LoginProfissionalForm
              errorMessage={
                params.erro === "sessao_expirada"
                  ? "Sessão expirada. Entre novamente com CPF e senha."
                  : null
              }
            />
          </div>
        </main>
      </div>
    </div>
  );
}
