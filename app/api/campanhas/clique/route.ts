import { NextResponse } from "next/server";
import {
  assertPublicRateLimit,
  getPublicRateLimitIdentity,
} from "@/lib/security/public-rate-limit";
import { registrarCliqueCampanha } from "@/lib/campanhas/click";

export const publicRoute = "rota publica: registro de clique de campanha com rate limit.";

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const idCampanha = String(payload.idCampanha || "").trim();
    const idSalao = String(payload.idSalao || "").trim();

    if (!idCampanha || !idSalao) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    assertPublicRateLimit({
      key: getPublicRateLimitIdentity(request, `campanha-clique:${idCampanha}`),
      limit: 60,
      windowMs: 5 * 60 * 1000,
    });

    const result = await registrarCliqueCampanha({
      idCampanha,
      idSalao,
      origem: payload.origem,
      slug: payload.slug,
      token: payload.token,
      href: payload.href,
      referrer: payload.referrer,
      userAgent: payload.userAgent,
    });

    if (!result.ok) return NextResponse.json({ ok: false }, { status: result.status });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
