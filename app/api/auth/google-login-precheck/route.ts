import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AuthUserWithIdentities = {
  identities?: Array<{ provider?: string | null }> | null;
};

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
  };
  const email = normalizeEmail(body.email);

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      {
        ok: false,
        allowed: false,
        error: "Digite o e-mail do salão antes de entrar com Google.",
      },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("id, email, auth_user_id, status")
    .eq("email", email)
    .eq("status", "ativo")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        allowed: false,
        error: "Não foi possível verificar o login com Google agora.",
      },
      { status: 500 }
    );
  }

  if (!usuario?.auth_user_id) {
    return NextResponse.json(
      {
        ok: false,
        allowed: false,
        error:
          "Este e-mail ainda não tem Login com Google configurado. Entre com e-mail e senha e ative em Perfil do Salão > Login com Google.",
      },
      { status: 403 }
    );
  }

  const { data: authUser, error: authError } =
    await supabase.auth.admin.getUserById(usuario.auth_user_id);

  if (authError || !authUser?.user) {
    return NextResponse.json(
      {
        ok: false,
        allowed: false,
        error:
          "Não foi possível validar o vínculo Google desta conta. Entre com e-mail e senha.",
      },
      { status: 403 }
    );
  }

  const user = authUser.user as AuthUserWithIdentities;
  const hasGoogleIdentity = Boolean(
    user.identities?.some((identity) => identity.provider === "google")
  );

  if (!hasGoogleIdentity) {
    return NextResponse.json(
      {
        ok: false,
        allowed: false,
        error:
          "Este e-mail ainda não tem Login com Google configurado. Entre com e-mail e senha e ative em Perfil do Salão > Login com Google.",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true, allowed: true });
}
