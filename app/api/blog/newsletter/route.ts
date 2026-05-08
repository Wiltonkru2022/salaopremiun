import { NextResponse } from "next/server";
import {
  assertPublicRateLimit,
  getPublicRateLimitIdentity,
} from "@/lib/security/public-rate-limit";
import { cadastrarNewsletterBlog } from "@/services/blogRouteService";

export const publicRoute = "rota publica: newsletter do blog com rate limit.";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    postSlug?: string;
  };
  const email = String(body.email || "").trim().toLowerCase();

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { message: "Informe um e-mail valido." },
      { status: 400 }
    );
  }

  try {
    assertPublicRateLimit({
      key: getPublicRateLimitIdentity(request, `blog-newsletter:${email}`),
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    await cadastrarNewsletterBlog({
      email,
      postSlug: body.postSlug || null,
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar o e-mail.",
      },
      { status: 500 }
    );
  }
}
