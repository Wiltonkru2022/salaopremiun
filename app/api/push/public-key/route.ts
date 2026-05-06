import { NextResponse } from "next/server";
import { getWebPushPublicKey } from "@/lib/push-notifications";

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
