import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getClienteSessionFromCookie } from "@/lib/cliente-auth.server";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";
import { upsertPushSubscription, type PushAudience } from "@/lib/push-notifications";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function isAudience(value: unknown): value is PushAudience {
  return (
    value === "cliente_app" ||
    value === "profissional_app" ||
    value === "salao_painel"
  );
}

async function getSalaoPainelContext() {
  const supabaseServer = await createClient();
  const {
    data: { user },
    error,
  } = await supabaseServer.auth.getUser();

  if (error || !user?.id) {
    return null;
  }

  const { data: usuario, error: usuarioError } = await (getSupabaseAdmin() as any)
    .from("usuarios")
    .select("id, id_salao, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (
    usuarioError ||
    !usuario?.id ||
    !usuario?.id_salao ||
    String(usuario.status || "").toLowerCase() !== "ativo"
  ) {
    return null;
  }

  return {
    idUsuario: String(usuario.id),
    idSalao: String(usuario.id_salao),
  };
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const audience = payload?.audience;

  if (!isAudience(audience)) {
    return NextResponse.json(
      { ok: false, error: "Destino de notificacao invalido." },
      { status: 400 }
    );
  }

  const headerList = await headers();
  const userAgent = headerList.get("user-agent");

  try {
    if (audience === "cliente_app") {
      const session = await getClienteSessionFromCookie();
      if (!session?.idConta) {
        return NextResponse.json({ ok: false }, { status: 401 });
      }

      await upsertPushSubscription({
        audience,
        subscription: payload.subscription,
        clienteAppContaId: session.idConta,
        userAgent,
      });
    }

    if (audience === "profissional_app") {
      const session = await getProfissionalSessionFromCookie();
      if (!session?.idProfissional || !session?.idSalao) {
        return NextResponse.json({ ok: false }, { status: 401 });
      }

      await upsertPushSubscription({
        audience,
        subscription: payload.subscription,
        idSalao: session.idSalao,
        idProfissional: session.idProfissional,
        userAgent,
      });
    }

    if (audience === "salao_painel") {
      const context = await getSalaoPainelContext();
      if (!context) {
        return NextResponse.json({ ok: false }, { status: 401 });
      }

      await upsertPushSubscription({
        audience,
        subscription: payload.subscription,
        idSalao: context.idSalao,
        idUsuario: context.idUsuario,
        userAgent,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel ativar as notificacoes.",
      },
      { status: 500 }
    );
  }
}
