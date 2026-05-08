import { NextResponse } from "next/server";
import {
  clearClienteSession,
  createClienteSession,
  getClienteSessionFromCookie,
} from "@/lib/cliente-auth.server";

export async function POST() {
  const session = await getClienteSessionFromCookie();

  if (!session?.idConta) {
    await clearClienteSession();
    return NextResponse.json(
      { ok: false, message: "Sessão do cliente expirada." },
      { status: 401 }
    );
  }

  await createClienteSession(session);

  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
