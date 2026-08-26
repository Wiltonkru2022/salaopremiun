import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAuthProviderForSurface } from "@/lib/platform/provider-config.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLERK_API = "https://api.clerk.com/v1";

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function safeNext(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard?boot=1";
  return raw;
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
  const response = await fetch(
    `${CLERK_API}/users?query=${encodeURIComponent(email)}&limit=10`,
    { headers: clerkHeaders(), cache: "no-store" }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Falha ao consultar Clerk (${response.status})${text ? `: ${text.slice(0, 180)}` : ""}`);
  }

  const payload = (await response.json()) as ClerkUser[] | { data?: ClerkUser[] };
  const users = Array.isArray(payload) ? payload : payload.data || [];
  return (
    users.find((user) =>
      (user.email_addresses || []).some(
        (item) => normalizeEmail(item.email_address) === email
      )
    ) || null
  );
}

async function createClerkUser(params: {
  email: string;
  password: string;
  legacyUserId: string;
  nome?: string | null;
  idSalao: string;
  nivel?: string | null;
}) {
  const nomePartes = String(params.nome || "").trim().split(/\s+/).filter(Boolean);
  const firstName = nomePartes[0] || undefined;
  const lastName = nomePartes.length > 1 ? nomePartes.slice(1).join(" ") : undefined;

  const response = await fetch(`${CLERK_API}/users`, {
    method: "POST",
    headers: clerkHeaders(),
    body: JSON.stringify({
      email_address: [params.email],
      password: params.password,
      external_id: params.legacyUserId,
      first_name: firstName,
      last_name: lastName,
      skip_password_checks: true,
      skip_legal_checks: true,
      public_metadata: {
        salaoPremium: {
          migratedFrom: "supabase",
          idSalao: params.idSalao,
          nivel: params.nivel || null,
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Falha ao criar usuario Clerk (${response.status})${text ? `: ${text.slice(0, 180)}` : ""}`);
  }

  return (await response.json()) as ClerkUser;
}

async function bindExistingClerkUser(user: ClerkUser, legacyUserId: string, idSalao: string, nivel?: string | null) {
  if (user.external_id === legacyUserId) return user;

  const response = await fetch(`${CLERK_API}/users/${encodeURIComponent(user.id)}`, {
    method: "PATCH",
    headers: clerkHeaders(),
    body: JSON.stringify({
      external_id: legacyUserId,
      public_metadata: {
        salaoPremium: {
          migratedFrom: "supabase",
          idSalao,
          nivel: nivel || null,
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Falha ao vincular usuario Clerk (${response.status})${text ? `: ${text.slice(0, 180)}` : ""}`);
  }

  return (await response.json()) as ClerkUser;
}

async function createSignInTicket(userId: string) {
  const response = await fetch(`${CLERK_API}/sign_in_tokens`, {
    method: "POST",
    headers: clerkHeaders(),
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 180 }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Falha ao criar sessao Clerk (${response.status})${text ? `: ${text.slice(0, 180)}` : ""}`);
  }

  const payload = (await response.json()) as { token?: string };
  if (!payload.token) throw new Error("Clerk nao retornou ticket de sessao.");
  return payload.token;
}

export async function POST(request: Request) {
  if (getAuthProviderForSurface("painel") !== "clerk") {
    return NextResponse.json(
      { ok: false, message: "Migracao Clerk nao esta ativa no painel." },
      { status: 409 }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: unknown;
      password?: unknown;
      next?: unknown;
    };

    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    if (!email || !password) {
      return NextResponse.json(
        { ok: false, message: "Informe e-mail e senha atuais do salao." },
        { status: 400 }
      );
    }

    const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const supabaseAnonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Credenciais legadas de autenticacao nao configuradas para migracao.");
    }

    // O Supabase e usado somente para provar a senha antiga durante a transicao.
    // Dados operacionais e a sessao final continuam no Neon + Clerk.
    const legacyAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data: legacySession, error: legacyError } = await legacyAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (legacyError || !legacySession.user?.id) {
      return NextResponse.json(
        { ok: false, message: "E-mail ou senha atuais invalidos." },
        { status: 401 }
      );
    }

    const db = getSupabaseAdmin();
    const { data: usuario, error: usuarioError } = await db
      .from("usuarios")
      .select("id, id_salao, nome, email, nivel, status")
      .ilike("email", email)
      .eq("status", "ativo")
      .maybeSingle();

    if (usuarioError || !usuario?.id || !usuario?.id_salao) {
      return NextResponse.json(
        { ok: false, message: "Usuario autenticado, mas sem vinculo ativo com um salao." },
        { status: 403 }
      );
    }

    let clerkUser = await findClerkUserByEmail(email);
    let migrated = false;

    if (!clerkUser) {
      clerkUser = await createClerkUser({
        email,
        password,
        legacyUserId: String(legacySession.user.id),
        nome: usuario.nome ? String(usuario.nome) : null,
        idSalao: String(usuario.id_salao),
        nivel: usuario.nivel ? String(usuario.nivel) : null,
      });
      migrated = true;
    } else {
      clerkUser = await bindExistingClerkUser(
        clerkUser,
        String(legacySession.user.id),
        String(usuario.id_salao),
        usuario.nivel ? String(usuario.nivel) : null
      );
    }

    const ticket = await createSignInTicket(clerkUser.id);

    return NextResponse.json({
      ok: true,
      migrated,
      ticket,
      redirectTo: safeNext(body.next),
    });
  } catch (cause) {
    console.error("[painel/clerk-migration]", cause);
    return NextResponse.json(
      {
        ok: false,
        message:
          cause instanceof Error
            ? cause.message
            : "Falha ao migrar acesso para Clerk.",
      },
      { status: 500 }
    );
  }
}
