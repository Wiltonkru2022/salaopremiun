import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getClienteSessionFromCookie } from "@/lib/cliente-auth.server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { upsertPushSubscription, type PushAudience } from "@/lib/push-notifications";

function isAudience(value: unknown): value is PushAudience {
  return (
    value === "cliente_app" ||
    value === "profissional_app" ||
    value === "salao_painel"
  );
}

async function getSalaoPainelContext() {
  const { user, usuario } = await getPainelUserContext();

  if (
    !user?.id ||
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

async function listActiveClientEndpoints(clienteAppContaId: string) {
  const { data } = await (getDatabaseAdmin() as any)
    .from("push_subscriptions")
    .select("endpoint")
    .eq("audience", "cliente_app")
    .eq("cliente_app_conta_id", clienteAppContaId)
    .eq("ativo", true);

  return Array.from(
    new Set(
      ((data || []) as Array<{ endpoint?: string | null }>)
        .map((item) => String(item.endpoint || "").trim())
        .filter(Boolean)
    )
  );
}

async function restorePreviouslyActiveClientEndpoints(
  clienteAppContaId: string,
  endpoints: string[]
) {
  if (!endpoints.length) return;

  await (getDatabaseAdmin() as any)
    .from("push_subscriptions")
    .update({ ativo: true })
    .eq("audience", "cliente_app")
    .eq("cliente_app_conta_id", clienteAppContaId)
    .in("endpoint", endpoints);
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

      const activeEndpoints = await listActiveClientEndpoints(session.idConta);

      await upsertPushSubscription({
        audience,
        subscription: payload.subscription,
        clienteAppContaId: session.idConta,
        userAgent,
      });

      // O helper legado desativa os outros endpoints da cliente. Reativamos apenas
      // os que ja estavam validos antes deste cadastro para permitir celular,
      // tablet e computador simultaneamente sem ressuscitar subscriptions antigas.
      await restorePreviouslyActiveClientEndpoints(session.idConta, activeEndpoints);
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
            : "Não foi possível ativar as notificações.",
      },
      { status: 500 }
    );
  }
}
