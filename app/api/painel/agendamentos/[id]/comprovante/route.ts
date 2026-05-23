import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const COMPROVANTES_BUCKET = "agendamento-comprovantes";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user, usuario } = await getPainelUserContext();

  if (!user || !usuario?.id_salao) {
    return NextResponse.json(
      { message: "Sessao expirada. Entre novamente para abrir o comprovante." },
      { status: 401 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await (supabaseAdmin as any)
    .from("agendamentos")
    .select("id, id_salao, sinal_comprovante_path")
    .eq("id", id)
    .eq("id_salao", usuario.id_salao)
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
