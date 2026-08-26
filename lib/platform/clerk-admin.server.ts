import "server-only";

const CLERK_API_BASE = "https://api.clerk.com/v1";

export type ClerkUser = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  public_metadata?: Record<string, unknown>;
  primary_email_address_id?: string | null;
  email_addresses?: Array<{ id?: string; email_address?: string }>;
};

function secretKey() {
  const value = String(process.env.CLERK_SECRET_KEY || "").trim();
  if (!value) throw new Error("CLERK_SECRET_KEY nao configurada.");
  return value;
}

async function clerkRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${CLERK_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { errors?: Array<{ long_message?: string; message?: string }> }
      | null;
    const message =
      payload?.errors?.[0]?.long_message ||
      payload?.errors?.[0]?.message ||
      `Clerk API retornou ${response.status}.`;
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function getClerkUser(userId: string) {
  return clerkRequest<ClerkUser>(`/users/${encodeURIComponent(userId)}`);
}

export async function createClerkUser(params: {
  email: string;
  password: string;
  nome: string;
  publicMetadata?: Record<string, unknown>;
}) {
  return clerkRequest<ClerkUser>("/users", {
    method: "POST",
    body: JSON.stringify({
      email_address: [params.email],
      password: params.password,
      first_name: params.nome || undefined,
      public_metadata: params.publicMetadata || {},
    }),
  });
}

export async function updateClerkUser(params: {
  userId: string;
  password?: string;
  nome?: string;
  publicMetadata?: Record<string, unknown>;
}) {
  return clerkRequest<ClerkUser>(`/users/${encodeURIComponent(params.userId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...(params.password ? { password: params.password } : {}),
      ...(params.nome ? { first_name: params.nome } : {}),
      ...(params.publicMetadata
        ? { public_metadata: params.publicMetadata }
        : {}),
    }),
  });
}

export async function deleteClerkUser(userId: string) {
  await clerkRequest(`/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}
