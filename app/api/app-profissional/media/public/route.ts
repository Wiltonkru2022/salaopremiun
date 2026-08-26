import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED_BUCKET = "agendamento-comprovantes";

function safeExternalMediaUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (url.hostname.endsWith("res.cloudinary.com")) return url.toString();
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const session = await requireProfissionalAppContext();
  const url = new URL(request.url);
  const bucket = String(url.searchParams.get("bucket") || "").trim();
  const path = String(url.searchParams.get("path") || "").trim();

  if (bucket !== ALLOWED_BUCKET || !path || path.length > 1200) {
    return NextResponse.json(
      { ok: false, error: "Mídia inválida." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const db = getSupabaseAdmin();
  let query = (db as any)
    .from("agendamentos")
    .select("id, id_salao, profissional_id, sinal_comprovante_path")
    .eq("id_salao", session.idSalao)
    .eq("sinal_comprovante_path", path)
    .limit(1);

  if (!session.podeVerAgendaTodos) {
    query = query.eq("profissional_id", session.idProfissional);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data?.id) {
    return NextResponse.json(
      { ok: false, error: "Mídia não encontrada." },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const externalUrl = safeExternalMediaUrl(String(data.sinal_comprovante_path || ""));
  if (externalUrl) {
    return NextResponse.redirect(externalUrl, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  }

  return NextResponse.json(
    {
      ok: false,
      error:
        "Este comprovante é legado e ainda não foi migrado para o armazenamento atual.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } }
  );
}
