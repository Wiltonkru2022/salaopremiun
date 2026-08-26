import { NextRequest, NextResponse } from "next/server";
import { readPainelClerkSession } from "@/lib/platform/painel-clerk-session.server";

export const dynamic = "force-dynamic";

function clerkMfaUrl(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") || "/dashboard";
  const url = new URL("https://login.salaopremiun.com.br/login-clerk");
  url.searchParams.set("next", next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
  url.searchParams.set("mfa", "1");
  return url.toString();
}

export async function GET(request: NextRequest) {
  const session = await readPainelClerkSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Sessao invalida.", redirectTo: clerkMfaUrl(request) },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    provider: "clerk",
    factorActive: session.mfaVerified,
    currentLevel: session.mfaVerified ? "aal2" : "aal1",
    backupCodesRemaining: 0,
    backupCodesLockedUntil: null,
    backupCodesGeneratedAt: null,
    backupCodesLastUsedAt: null,
    sensitiveActionLockedUntil: null,
    redirectTo: session.mfaVerified ? null : clerkMfaUrl(request),
  });
}

export async function POST(request: NextRequest) {
  const session = await readPainelClerkSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Sessao invalida.", redirectTo: clerkMfaUrl(request) },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      ok: false,
      provider: "clerk",
      error: "O MFA do Painel e administrado pelo Clerk.",
      redirectTo: clerkMfaUrl(request),
    },
    { status: 409 }
  );
}
