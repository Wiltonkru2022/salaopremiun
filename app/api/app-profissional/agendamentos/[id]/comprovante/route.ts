import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireProfissionalAppContext();
  const database = getSupabaseAdmin();

  let query = (database as any)
    .from("agendamentos")
    .select("id, id_salao, profissional_id, sinal_comprovante_path")
    .eq("id", id)
    .eq("id_salao", session.idSalao);

  if (!session.podeVerAgendaTodos) {
    query = query.eq("profissional_id", session.idProfissional);
  }

  const { data, error } = await query.maybeSingle();
  const receiptUrl = String(data?.sinal_comprovante_path || "").trim();

  if (error || !receiptUrl) {
    return htmlError("Comprovante não encontrado para este agendamento.", 404);
  }

  if (!/^https:\/\//i.test(receiptUrl)) {
    return htmlError(
      "Este comprovante ainda está no armazenamento legado e precisa ser migrado.",
      410
    );
  }

  try {
    const parsed = new URL(receiptUrl);
    if (!parsed.hostname.endsWith("res.cloudinary.com")) {
      return htmlError("Origem do comprovante não autorizada.", 403);
    }
  } catch {
    return htmlError("Endereço do comprovante inválido.", 400);
  }

  return NextResponse.redirect(receiptUrl);
}

function htmlError(message: string, status: number) {
  return new NextResponse(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Comprovante</title><style>body{margin:0;background:#050505;color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:grid;min-height:100dvh;place-items:center;padding:24px}.card{max-width:420px;border:1px solid rgba(255,255,255,.14);border-radius:24px;background:#111214;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.28)}h1{font-size:24px;margin:0 0 10px}p{color:#d4d4d8;font-size:16px;line-height:1.5;margin:0 0 18px}button{width:100%;height:48px;border:0;border-radius:16px;background:#fff;color:#050505;font-weight:800;font-size:15px}</style></head><body><main class="card"><h1>Comprovante indisponível</h1><p>${escapeHtml(message)}</p><button onclick="history.back()">Voltar</button></main></body></html>`,
    {
      status,
      headers: { "content-type": "text/html; charset=utf-8" },
    }
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
