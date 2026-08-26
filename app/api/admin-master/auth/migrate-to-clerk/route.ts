import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveAdminMasterAccessForIdentity } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getAuthProviderForSurface } from "@/lib/platform/provider-config.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLERK_API = "https://api.clerk.com/v1";

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function buildUsername(email: string, legacyUserId: string) {
  const local = email.split("@")[0] || "admin";
  let base = local
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (base.length < 4) base = `admin_${base || "master"}`;
  const suffix = legacyUserId.replace(/[^a-z0-9]/gi, "").slice(-8).toLowerCase();
  return `${base.slice(0, 42)}_${suffix || "sp"}`.slice(0, 63);
}

function clerkHeaders() {
  const secretKey = String(process.env.CLERK_SECRET_KEY || "").trim();
  if (!secretKey) throw new Error("CLERK_SECRET_KEY nao configurada.");
  return {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };
}

type ClerkUser = {
  id: string;
  external_id?: string | null;
  email_addresses?: Array<{ email_address?: string }>;
};

async function findClerkUserByEmail(email: string): Promise<ClerkUser | null> {
  const response = await fetch(`${CLERK_API}/users?query=${encodeURIComponent(email)}&limit=10`, {
    headers: clerkHeaders(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Nao foi possivel consultar a conta Clerk.");
  const payload = (await response.json()) as ClerkUser[] | { data?: ClerkUser[] };
  const users = Array.isArray(payload) ? payload : payload.data || [];
  return users.find((user) =>
    (user.email_addresses || []).some((item) => normalizeEmail(item.email_address) === email)
  ) || null;
}

async function createClerkUser(params: {
  email: string;
  password: string;
  legacyUserId: string;
  nome: string;
  perfil: string;
}) {
  const nomes = params.nome.trim().split(/\s+/).filter(Boolean);
  const response = await fetch(`${CLERK_API}/users`, {
    method: "POST",
    headers: clerkHeaders(),
    body: JSON.stringify({
      email_address: [params.email],
      username: buildUsername(params.email, params.legacyUserId),
      password: params.password,
      external_id: params.legacyUserId,
      first_name: nomes[0] || undefined,
      last_name: nomes.length > 1 ? nomes.slice(1).join(" ") : undefined,
      skip_password_checks: true,
      skip_legal_checks: true,
      public_metadata: {
        salaoPremium: {
          migratedFrom: "supabase",
          surface: "admin-master",
          perfil: params.perfil,
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("[admin-master/clerk-create-user]", response.status, text.slice(0, 500));
    throw new Error("Nao foi possivel preparar sua conta administrativa no Clerk.");
  }
  return (await response.json()) as ClerkUser;
}

async function bindExistingClerkUser(user: ClerkUser, legacyUserId: string, perfil: string) {
  if (user.external_id === legacyUserId) return user;
  const response = await fetch(`${CLERK_API}/users/${encodeURIComponent(user.id)}`, {
    method: "PATCH",
    headers: clerkHeaders(),
    body: JSON.stringify({
      external_id: legacyUserId,
      public_metadata: {
        salaoPremium: {
          migratedFrom: "supabase",
          surface: "admin-master",
          perfil,
        },
      },
    }),
  });
  if (!response.ok) throw new Error("Nao foi possivel vincular a conta administrativa ao Clerk.");
  return (await response.json()) as ClerkUser;
}

async function createSignInTicket(userId: string) {
  const response = await fetch(`${CLERK_API}/sign_in_tokens`, {
    method: "POST",
    headers: clerkHeaders(),
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 180 }),
  });
  if (!response.ok) throw new Error("Nao foi possivel iniciar a sessao Clerk.");
  const payload = (await response.json()) as { token?: string };
  if (!payload.token) throw new Error("Clerk nao retornou ticket de sessao.");
  return payload.token;
}

export async function POST(request: Request) {
  if (getAuthProviderForSurface("admin-master") !== "clerk") {
    return NextResponse.json({ ok: false, message: "Clerk nao esta ativo no Admin Master." }, { status: 409 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    if (!email || !password) {
      return NextResponse.json({ ok: false, message: "Informe e-mail e senha atuais." }, { status: 400 });
    }

    const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const supabaseAnonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
    if (!supabaseUrl || !supabaseAnonKey) throw new Error("Credenciais legadas indisponiveis.");

    const legacyAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await legacyAuth.auth.signInWithPassword({ email, password });
    if (error || !data.user?.id) {
      return NextResponse.json({ ok: false, message: "E-mail ou senha atuais invalidos." }, { status: 401 });
    }

    const access = await resolveAdminMasterAccessForIdentity(
      { id: data.user.id, email: data.user.email, nome: String(data.user.user_metadata?.nome || "") },
      "dashboard_ver"
    );
    if (!access.ok) {
      return NextResponse.json({ ok: false, message: access.message }, { status: access.status });
    }

    let clerkUser = await findClerkUserByEmail(email);
    if (!clerkUser) {
      clerkUser = await createClerkUser({
        email,
        password,
        legacyUserId: data.user.id,
        nome: access.usuario.nome || email.split("@")[0],
        perfil: access.usuario.perfil,
      });
    } else {
      clerkUser = await bindExistingClerkUser(clerkUser, data.user.id, access.usuario.perfil);
    }

    const ticket = await createSignInTicket(clerkUser.id);
    return NextResponse.json({ ok: true, ticket, redirectTo: "/admin-master" });
  } catch (cause) {
    console.error("[admin-master/clerk-migration]", cause);
    return NextResponse.json(
      { ok: false, message: "Nao foi possivel concluir a migracao do Admin Master agora. Tente novamente." },
      { status: 500 }
    );
  }
}
