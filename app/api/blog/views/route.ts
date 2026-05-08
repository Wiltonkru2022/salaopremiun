import { NextResponse } from "next/server";
import {
  assertPublicRateLimit,
  getPublicRateLimitIdentity,
} from "@/lib/security/public-rate-limit";
import { registrarVisualizacaoBlog } from "@/services/blogRouteService";

export const publicRoute = "rota publica: contador de visualizacao do blog com rate limit.";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    postId?: string;
    sessionId?: string;
  };

  if (!body.postId) {
    return NextResponse.json({ message: "Post invalido." }, { status: 400 });
  }

  try {
    assertPublicRateLimit({
      key: getPublicRateLimitIdentity(request, `blog-views:${body.postId}`),
      limit: 30,
      windowMs: 5 * 60 * 1000,
    });

    const userAgent = request.headers.get("user-agent")?.slice(0, 300) || null;
    const views = await registrarVisualizacaoBlog({
      postId: body.postId,
      sessionId: body.sessionId || null,
      userAgent,
    });

    return NextResponse.json({ views });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel registrar a leitura.",
      },
      { status: 500 }
    );
  }
}
