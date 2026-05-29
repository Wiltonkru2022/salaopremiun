import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const COMPROVANTES_BUCKET = "agendamento-comprovantes";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireProfissionalAppContext();
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await (supabaseAdmin as any)
    .from("agendamentos")
    .select("id, id_salao, profissional_id, sinal_comprovante_path")
    .eq("id", id)
    .eq("id_salao", session.idSalao)
    .eq("profissional_id", session.idProfissional)
    .maybeSingle();

  if (error || !data?.sinal_comprovante_path) {
    return NextResponse.json(
      { message: "Comprovante nao encontrado para este agendamento." },
      { status: 404 }
    );
  }

  const { data: signed, error: signedError } = await (supabaseAdmin as any).storage
    .from(COMPROVANTES_BUCKET)
    .createSignedUrl(String(data.sinal_comprovante_path), 60 * 5);

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json(
      { message: "Nao foi possivel abrir o comprovante agora." },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signed.signedUrl);
}
