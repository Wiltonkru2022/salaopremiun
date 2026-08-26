import { NextResponse } from "next/server";
import { getAuthProviderForSurface } from "@/lib/platform/provider-config.server";

export async function GET() {
  return NextResponse.json(
    {
      provider: getAuthProviderForSurface("admin-master"),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
