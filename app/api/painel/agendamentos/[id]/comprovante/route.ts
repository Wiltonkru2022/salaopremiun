import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getDatabaseAdmin } from "@/lib/db/admin";

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

  const database = getDatabaseAdmin();
  const { data, error } = await database
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

  const publicUrl = String(data.sinal_comprovante_path || "").trim();
  if (/^https:\/\/res\.cloudinary\.com\//i.test(publicUrl)) {
    return NextResponse.redirect(publicUrl);
  }

  return NextResponse.json(
    {
      message:
        "Este comprovante foi salvo no storage legado e precisa ser migrado para o Cloudinary.",
      legacyMedia: true,
    },
    { status: 410 }
  );
}
