import "server-only";

type ClerkEmail = {
  id?: string;
  email_address?: string;
};

type ClerkUser = {
  id?: string;
  external_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: ClerkEmail[];
};

type ClerkListResponse = ClerkUser[] | { data?: ClerkUser[] };

type ClerkErrorEnvelope = {
  message?: string;
  errors?: Array<{
    code?: string;
    message?: string;
    long_message?: string;
  }>;
};

export type AdminMasterPasswordIdentity = {
  clerkUserId: string;
  externalId: string | null;
  email: string;
  nome: string | null;
};

function getClerkSecretKey() {
  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) throw new Error("CLERK_SECRET_KEY não configurada.");
  return secret;
}

async function readClerkError(response: Response) {
  const payload = (await response.json().catch(() => null)) as ClerkErrorEnvelope | null;
  const first = payload?.errors?.[0];
  return {
    code: String(first?.code || "").trim(),
    message:
      first?.long_message ||
      first?.message ||
      payload?.message ||
      `Clerk respondeu HTTP ${response.status}.`,
  };
}

async function clerkRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${getClerkSecretKey()}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const clerkError = await readClerkError(response);
    throw Object.assign(new Error(clerkError.message), {
      status: response.status,
      code: clerkError.code,
    });
  }

  return (await response.json().catch(() => null)) as T;
}

function rowsFromClerk(payload: ClerkListResponse | null) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.data) ? payload.data : [];
}

function primaryEmail(user: ClerkUser) {
  const emails = Array.isArray(user.email_addresses) ? user.email_addresses : [];
  const primary =
    emails.find((item) => item.id === user.primary_email_address_id) || emails[0];
  return String(primary?.email_address || "").trim().toLowerCase();
}

async function findUserByEmail(email: string) {
  const query = new URLSearchParams({ limit: "10" });
  query.append("email_address[]", email);

  const payload = await clerkRequest<ClerkListResponse>(`/users?${query.toString()}`);
  return (
    rowsFromClerk(payload).find((user) => primaryEmail(user) === email) || null
  );
}

async function verifyUserPassword(userId: string, password: string) {
  const response = await clerkRequest<{ verified?: boolean }>(
    `/users/${encodeURIComponent(userId)}/verify_password`,
    {
      method: "POST",
      body: JSON.stringify({ password }),
    }
  );

  if (response?.verified !== true) {
    throw Object.assign(new Error("Senha incorreta."), {
      status: 401,
      code: "password_incorrect",
    });
  }
}

export async function authenticateAdminMasterPassword(params: {
  email: string;
  password: string;
}): Promise<AdminMasterPasswordIdentity> {
  const email = String(params.email || "").trim().toLowerCase();
  const password = String(params.password || "");

  if (!email || !email.includes("@")) {
    throw Object.assign(new Error("Informe um e-mail válido."), { status: 400 });
  }
  if (!password) {
    throw Object.assign(new Error("Informe sua senha."), { status: 400 });
  }

  const user = await findUserByEmail(email);
  const clerkUserId = String(user?.id || "").trim();
  if (!user || !clerkUserId) {
    throw Object.assign(new Error("E-mail ou senha inválidos."), { status: 401 });
  }

  try {
    await verifyUserPassword(clerkUserId, password);
  } catch (error) {
    const status = Number(
      typeof error === "object" && error && "status" in error
        ? (error as { status?: unknown }).status
        : 500
    );
    if (status === 400 || status === 401 || status === 422) {
      throw Object.assign(new Error("E-mail ou senha inválidos."), { status: 401 });
    }
    throw error;
  }

  const resolvedEmail = primaryEmail(user) || email;
  const nome = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();

  return {
    clerkUserId,
    externalId: String(user.external_id || "").trim() || null,
    email: resolvedEmail,
    nome: nome || null,
  };
}
