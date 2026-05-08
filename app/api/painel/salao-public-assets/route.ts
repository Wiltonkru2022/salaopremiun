import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { uploadSalaoPublicAsset } from "@/services/salaoPublicAssetsService";

export async function POST(request: Request) {
  const { user, usuario } = await getPainelUserContext();

  if (!user || !usuario?.id_salao) {
    return NextResponse.json(
      { message: "Sessao expirada. Entre novamente para enviar a imagem." },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const tipo = String(formData.get("tipo") || "");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "Selecione uma imagem valida." },
      { status: 400 }
    );
  }

  try {
    const publicUrl = await uploadSalaoPublicAsset({
      idSalao: usuario.id_salao,
      tipo,
      file,
    });

    return NextResponse.json({ publicUrl });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel enviar a imagem.",
      },
      { status: 500 }
    );
  }
}
