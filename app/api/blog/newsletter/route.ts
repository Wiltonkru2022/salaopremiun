import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
    const supabase = getSupabaseAdmin() as any;
    const { error } = await supabase.from("newsletter_subscribers").upsert(
      {
        email,
        origem: "blog",
        post_slug: body.postSlug || null,
      },
      { onConflict: "email" }
    );

    if (error) throw error;

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
