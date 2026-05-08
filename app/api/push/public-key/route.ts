import { NextResponse } from "next/server";
import { getWebPushPublicKey } from "@/lib/push-notifications";

export const publicRoute = "rota publica: chave publica Web Push.";

export async function GET() {
  const publicKey = getWebPushPublicKey();

  return NextResponse.json(
    {
      ok: Boolean(publicKey),
      publicKey,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
