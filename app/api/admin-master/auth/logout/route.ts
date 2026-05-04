import { NextResponse } from "next/server";
import { clearAdminMasterSessionCookie } from "@/lib/admin-master/auth/session";

function getRequestHost(request: Request) {
  return (
    request.headers.get("x-forwarded-host")?.split(",")[0] ||
    request.headers.get("host")
  );
}

export async function POST(request: Request) {
  const response = NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );

  clearAdminMasterSessionCookie(response, getRequestHost(request));
  return response;
}
