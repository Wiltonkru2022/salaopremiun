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
      <CadastroClienteForm
        salaoId={salaoContext?.salao?.id || salaoId || null}
        salaoNome={salaoContext?.salao?.nome || null}
        next={next || salaoPublicPath}
      />
    </ClientAuthShell>
  );
}
