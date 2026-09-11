import { redirect } from "next/navigation";
import ClientSessionAutoRestore from "@/components/client-app/ClientSessionAutoRestore";
import ClientAuthShell from "@/components/client-app/auth/ClientAuthShell";
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
      redirect(next || "/app-cliente/inicio");
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
    <ClientAuthShell backHref={salaoPublicPath || "/app-cliente/inicio"}>
      <div className="space-y-3">
        <ClientSessionAutoRestore
          next={next || salaoPublicPath}
          clearOnLoad={logout === "1"}
        />

        <LoginClienteForm
          salaoId={salaoContext?.salao?.id || salaoId || null}
          salaoNome={salaoContext?.salao?.nome || null}
          oauthError={getErrorMessage(params.erro)}
          next={next || salaoPublicPath}
        />
      </div>
    </ClientAuthShell>
  );
}
