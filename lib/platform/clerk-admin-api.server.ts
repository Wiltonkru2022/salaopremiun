import "server-only";

import { randomUUID } from "node:crypto";

type ClerkErrorEnvelope = {
  message?: string;
  errors?: Array<{
    code?: string;
    message?: string;
    long_message?: string;
  }>;
};

type ClerkEmailAddress = {
  id?: string;
  email_address?: string;
};

type ClerkExternalAccount = {
  id?: string;
  provider?: string;
  email_address?: string | null;
};

type ClerkRawUser = {
  id?: string;
  external_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: ClerkEmailAddress[];
  public_metadata?: Record<string, unknown> | null;
  private_metadata?: Record<string, unknown> | null;
  unsafe_metadata?: Record<string, unknown> | null;
  external_accounts?: ClerkExternalAccount[];
  totp_enabled?: boolean;
  backup_code_enabled?: boolean;
  two_factor_enabled?: boolean;
};

type ClerkAdminUser = {
  /** UUID interno usado pelos relacionamentos existentes no Neon. */
  id: string;
  /** ID nativo do Clerk (user_...). */
  clerkUserId: string;
  /** Mesmo UUID interno salvo no external_id do Clerk, quando disponível. */
  externalId: string | null;
  email: string | null;
  publicMetadata: Record<string, unknown>;
  privateMetadata: Record<string, unknown>;
  identities: Array<{
    id: string;
    provider: string;
    identity_data: { email: string | null };
  }>;
  totp_enabled: boolean;
  backup_code_enabled: boolean;
  two_factor_enabled: boolean;
};

function getClerkSecretKey() {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("CLERK_SECRET_KEY nao configurada.");
  return secretKey;
}

async function parseClerkError(response: Response) {
  const payload = (await response.json().catch(() => null)) as ClerkErrorEnvelope | null;
  const first = payload?.errors?.[0];
  return (
    first?.long_message ||
    first?.message ||
    payload?.message ||
    `Clerk respondeu HTTP ${response.status}.`
  );
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
    throw Object.assign(new Error(await parseClerkError(response)), {
      status: response.status,
    });
  }

  if (response.status === 204) return null as T;
  return (await response.json().catch(() => null)) as T;
}

function splitName(value: unknown) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");
  if (!normalized) return { first_name: undefined, last_name: undefined };
  const [firstName, ...rest] = normalized.split(" ");
  return {
    first_name: firstName || undefined,
    last_name: rest.join(" ") || undefined,
  };
}

function normalizeProvider(provider: unknown) {
  return String(provider || "")
    .trim()
    .toLowerCase()
    .replace(/^oauth_/, "");
}

function rawUsers(payload: ClerkRawUser[] | { data?: ClerkRawUser[] } | null) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.data) ? payload.data : [];
}

function toClerkAdminUser(user: ClerkRawUser): ClerkAdminUser {
  const clerkUserId = String(user.id || "").trim();
  if (!clerkUserId) throw new Error("Clerk retornou usuario sem ID.");

  const externalId = String(user.external_id || "").trim() || null;
  const internalId = externalId || clerkUserId;
  const emails = Array.isArray(user.email_addresses) ? user.email_addresses : [];
  const primary =
    emails.find((item) => item.id === user.primary_email_address_id) || emails[0];
  const email = String(primary?.email_address || "").trim().toLowerCase() || null;

  return {
    id: internalId,
    clerkUserId,
    externalId,
    email,
    publicMetadata: {
      ...(user.public_metadata || {}),
      nome:
        (user.public_metadata || {}).nome ||
        [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
        undefined,
    },
    privateMetadata: { ...(user.private_metadata || {}) },
    identities: (user.external_accounts || [])
      .map((account) => ({
        id: String(account.id || "").trim(),
        provider: normalizeProvider(account.provider),
        identity_data: { email: account.email_address || null },
      }))
      .filter((identity) => Boolean(identity.id && identity.provider)),
    totp_enabled: Boolean(user.totp_enabled),
    backup_code_enabled: Boolean(user.backup_code_enabled),
    two_factor_enabled: Boolean(user.two_factor_enabled),
  };
}

async function fetchRawUser(clerkUserId: string) {
  return clerkRequest<ClerkRawUser>(
    `/users/${encodeURIComponent(clerkUserId)}`
  );
}

async function findRawUserByExternalId(externalId: string) {
  const query = new URLSearchParams({ limit: "2" });
  query.append("external_id[]", externalId);
  const payload = await clerkRequest<ClerkRawUser[] | { data?: ClerkRawUser[] }>(
    `/users?${query.toString()}`
  );
  return rawUsers(payload).find((user) => user.external_id === externalId) || null;
}

async function resolveRawUser(userId: string) {
  const normalized = String(userId || "").trim();
  if (!normalized) throw new Error("ID de usuario ausente.");

  if (normalized.startsWith("user_")) {
    return fetchRawUser(normalized);
  }

  const byExternalId = await findRawUserByExternalId(normalized);
  if (!byExternalId?.id) {
    throw Object.assign(
      new Error("Usuario Clerk correspondente ao ID interno nao encontrado."),
      { status: 404 }
    );
  }
  return byExternalId;
}

async function updatePrimaryEmailIfNeeded(clerkUserId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  const current = await fetchRawUser(clerkUserId);
  const emails = Array.isArray(current.email_addresses) ? current.email_addresses : [];
  const currentPrimary =
    emails.find((item) => item.id === current.primary_email_address_id) || emails[0];

  if (String(currentPrimary?.email_address || "").trim().toLowerCase() === normalized) {
    return;
  }

  const existing = emails.find(
    (item) => String(item.email_address || "").trim().toLowerCase() === normalized
  );

  if (existing?.id) {
    await clerkRequest(`/email_addresses/${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ primary: true, verified: true }),
    });
    return;
  }

  await clerkRequest("/email_addresses", {
    method: "POST",
    body: JSON.stringify({
      user_id: clerkUserId,
      email_address: normalized,
      primary: true,
      verified: true,
    }),
  });
}

function resultError(error: unknown) {
  return {
    message: error instanceof Error ? error.message : "Falha na operacao Clerk.",
    status:
      typeof error === "object" && error && "status" in error
        ? Number((error as { status?: unknown }).status || 500)
        : 500,
  };
}

export const clerkAdminApi = {
  async createUser(params: {
    email?: string;
    password?: string;
    externalId?: string;
    publicMetadata?: Record<string, unknown>;
    privateMetadata?: Record<string, unknown>;
  }) {
    try {
      const email = String(params.email || "").trim().toLowerCase();
      const password = String(params.password || "");
      const externalId = String(params.externalId || "").trim() || randomUUID();
      if (!email) throw new Error("E-mail obrigatorio para criar usuario Clerk.");
      if (password.length < 8) {
        throw new Error("A senha deve ter pelo menos 8 caracteres para o Clerk.");
      }

      const names = splitName(params.publicMetadata?.nome);
      const raw = await clerkRequest<ClerkRawUser>("/users", {
        method: "POST",
        body: JSON.stringify({
          email_address: [email],
          password,
          external_id: externalId,
          ...names,
          public_metadata: params.publicMetadata || {},
          private_metadata: params.privateMetadata || {},
        }),
      });

      return { data: { user: toClerkAdminUser(raw) }, error: null };
    } catch (error) {
      return { data: { user: null }, error: resultError(error) };
    }
  },

  async getUserById(userId: string) {
    try {
      const raw = await resolveRawUser(userId);
      return { data: { user: toClerkAdminUser(raw) }, error: null };
    } catch (error) {
      return { data: { user: null }, error: resultError(error) };
    }
  },

  async updateUserById(
    userId: string,
    params: {
      email?: string;
      password?: string;
      externalId?: string;
      publicMetadata?: Record<string, unknown>;
      privateMetadata?: Record<string, unknown>;
    }
  ) {
    try {
      const current = await resolveRawUser(userId);
      const clerkUserId = String(current.id || "").trim();
      if (!clerkUserId) throw new Error("Usuario Clerk sem ID nativo.");

      if (params.email) {
        await updatePrimaryEmailIfNeeded(clerkUserId, params.email);
      }

      const updatePayload: Record<string, unknown> = {};
      if (params.password) {
        if (params.password.length < 8) {
          throw new Error("A senha deve ter pelo menos 8 caracteres para o Clerk.");
        }
        updatePayload.password = params.password;
      }
      if (params.externalId) updatePayload.external_id = params.externalId;

      const names = splitName(params.publicMetadata?.nome);
      if (names.first_name) updatePayload.first_name = names.first_name;
      if (names.last_name) updatePayload.last_name = names.last_name;

      if (Object.keys(updatePayload).length > 0) {
        await clerkRequest(`/users/${encodeURIComponent(clerkUserId)}`, {
          method: "PATCH",
          body: JSON.stringify(updatePayload),
        });
      }

      if (params.publicMetadata || params.privateMetadata) {
        await clerkRequest(`/users/${encodeURIComponent(clerkUserId)}/metadata`, {
          method: "PATCH",
          body: JSON.stringify({
            ...(params.publicMetadata
              ? { public_metadata: params.publicMetadata }
              : {}),
            ...(params.privateMetadata
              ? { private_metadata: params.privateMetadata }
              : {}),
          }),
        });
      }

      return {
        data: { user: toClerkAdminUser(await fetchRawUser(clerkUserId)) },
        error: null,
      };
    } catch (error) {
      return { data: { user: null }, error: resultError(error) };
    }
  },

  async deleteUser(userId: string) {
    try {
      const raw = await resolveRawUser(userId);
      const clerkUserId = String(raw.id || "").trim();
      if (!clerkUserId) throw new Error("Usuario Clerk sem ID nativo.");
      await clerkRequest(`/users/${encodeURIComponent(clerkUserId)}`, {
        method: "DELETE",
      });
      return { data: { user: null }, error: null };
    } catch (error) {
      return { data: { user: null }, error: resultError(error) };
    }
  },

  async listUsers(params?: { page?: number; perPage?: number }) {
    try {
      const page = Math.max(1, Number(params?.page || 1));
      const perPage = Math.min(500, Math.max(1, Number(params?.perPage || 50)));
      const query = new URLSearchParams({
        limit: String(perPage),
        offset: String((page - 1) * perPage),
      });
      const payload = await clerkRequest<ClerkRawUser[] | { data?: ClerkRawUser[] }>(
        `/users?${query.toString()}`
      );
      const rows = rawUsers(payload);
      return {
        data: { users: rows.map(toClerkAdminUser) },
        error: null,
      };
    } catch (error) {
      return { data: { users: [] }, error: resultError(error) };
    }
  },

  async unlinkExternalAccount(userId: string, providerOrAccountId: string) {
    try {
      const raw = await resolveRawUser(userId);
      const clerkUserId = String(raw.id || "").trim();
      if (!clerkUserId) throw new Error("Usuario Clerk sem ID nativo.");

      const requested = String(providerOrAccountId || "").trim();
      const normalizedProvider = normalizeProvider(requested);
      const account = (raw.external_accounts || []).find((item) => {
        const accountId = String(item.id || "").trim();
        return (
          accountId === requested ||
          normalizeProvider(item.provider) === normalizedProvider
        );
      });

      const externalAccountId = String(account?.id || "").trim();
      if (!externalAccountId) {
        throw Object.assign(new Error("Conta externa Clerk nao encontrada."), {
          status: 404,
        });
      }

      await clerkRequest(
        `/users/${encodeURIComponent(clerkUserId)}/external_accounts/${encodeURIComponent(externalAccountId)}`,
        { method: "DELETE" }
      );
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: resultError(error) };
    }
  },

  mfa: {
    async listFactors(params: { userId: string }) {
      try {
        const user = await resolveRawUser(params.userId);
        const factors = user.totp_enabled
          ? [
              {
                id: "clerk-totp",
                factor_type: "totp",
                status: "verified",
              },
            ]
          : [];
        return { data: { factors }, error: null };
      } catch (error) {
        return { data: { factors: [] }, error: resultError(error) };
      }
    },

    async deleteFactor(params: { userId: string; id?: string }) {
      try {
        const user = await resolveRawUser(params.userId);
        const clerkUserId = String(user.id || "").trim();
        if (!clerkUserId) throw new Error("Usuario Clerk sem ID nativo.");
        await clerkRequest(`/users/${encodeURIComponent(clerkUserId)}/totp`, {
          method: "DELETE",
        });
        return { data: null, error: null };
      } catch (error) {
        return { data: null, error: resultError(error) };
      }
    },
  },
};
