import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    postId?: string;
    sessionId?: string;
  };

  if (!body.postId) {
    return NextResponse.json({ message: "Post invalido." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin() as any;
    const userAgent = request.headers.get("user-agent")?.slice(0, 300) || null;

    await supabase.from("blog_views").insert({
      post_id: body.postId,
      session_id: body.sessionId || null,
      user_agent: userAgent,
    });

    const { data, error } = await supabase.rpc("increment_blog_post_views", {
      p_post_id: body.postId,
    });

    if (error) throw error;

    return NextResponse.json({ views: Number(data || 0) });
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
