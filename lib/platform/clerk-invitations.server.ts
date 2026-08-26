import "server-only";

type ClerkInvitationError = {
  message?: string;
  errors?: Array<{ message?: string; long_message?: string }>;
};

function getClerkSecretKey() {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("CLERK_SECRET_KEY nao configurada.");
  return secretKey;
}

async function readError(response: Response) {
  const payload = (await response.json().catch(() => null)) as ClerkInvitationError | null;
  return (
    payload?.errors?.[0]?.long_message ||
    payload?.errors?.[0]?.message ||
    payload?.message ||
    `Clerk respondeu HTTP ${response.status}.`
  );
}

export async function sendClerkMigrationInvitation(params: {
  email: string;
  redirectUrl: string;
}) {
  const email = String(params.email || "").trim().toLowerCase();
  const redirectUrl = String(params.redirectUrl || "").trim();
  if (!email) throw new Error("E-mail obrigatorio para convite Clerk.");
  if (!redirectUrl) throw new Error("Redirect do convite Clerk nao configurado.");

  const response = await fetch("https://api.clerk.com/v1/invitations", {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${getClerkSecretKey()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: email,
      redirect_url: redirectUrl,
      notify: true,
      ignore_existing: false,
      public_metadata: {
        salao_premium_migration: true,
      },
    }),
  });

  if (!response.ok) {
    throw Object.assign(new Error(await readError(response)), {
      status: response.status,
    });
  }

  return (await response.json().catch(() => null)) as
    | { id?: string; status?: string }
    | null;
}

export function getClerkMigrationRedirect(surface: "painel" | "admin-master") {
  const configured =
    surface === "admin-master"
      ? process.env.CLERK_ADMIN_MASTER_MIGRATION_REDIRECT_URL?.trim()
      : process.env.CLERK_PAINEL_MIGRATION_REDIRECT_URL?.trim();
  if (configured) return configured;

  const rootDomain = process.env.APP_ROOT_DOMAIN?.trim() || "salaopremiun.com.br";
  const loginHost = process.env.APP_LOGIN_HOST?.trim() || `login.${rootDomain}`;
  const path =
    surface === "admin-master"
      ? "/admin-master/clerk-login?migracao=1"
      : "/login-clerk?migracao=1";

  if (process.env.NODE_ENV === "production") return `https://${loginHost}${path}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) return `${appUrl.replace(/\/$/, "")}${path}`;
  return `http://localhost:${process.env.PORT || "3000"}${path}`;
}
