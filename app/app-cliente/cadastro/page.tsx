import { redirect } from "next/navigation";
import CadastroClienteForm from "@/components/client-app/auth/CadastroClienteForm";
import ClientAuthShell from "@/components/client-app/auth/ClientAuthShell";
import { getClienteSessionFromCookie } from "@/lib/cliente-auth.server";
import { canSalonAppearInClientApp } from "@/lib/client-app/eligibility";
import { buildSalaoPublicPath } from "@/lib/saloes/public-link";

export const metadata = {
  title: "Cadastro do Cliente",
};

export default async function CadastroClientePage({
  searchParams,
}: {
  searchParams: Promise<{ salao?: string | string[]; next?: string | string[] }>;
}) {
  const params = await searchParams;
  const salaoId = Array.isArray(params.salao) ? params.salao[0] : params.salao;
  const next =
    (Array.isArray(params.next) ? params.next[0] : params.next) || "";
  const session = await getClienteSessionFromCookie();

  if (session) {
    redirect(next || "/app-cliente/inicio");
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
    <ClientAuthShell backHref={salaoPublicPath || "/app-cliente/inicio"}>
      <div className="space-y-4">
        <div className="px-1 pb-1 pt-2">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#9b6a14]">
            Cadastro único
          </p>
          <h1 className="mt-2 text-[2rem] font-black leading-tight tracking-[-0.05em] text-zinc-950">
            Crie sua conta
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Uma conta simples para reservar em salões e acompanhar seus horários.
          </p>
        </div>

        <CadastroClienteForm
          salaoId={salaoContext?.salao?.id || salaoId || null}
          salaoNome={salaoContext?.salao?.nome || null}
          next={next || salaoPublicPath}
        />
      </div>
    </ClientAuthShell>
  );
}
