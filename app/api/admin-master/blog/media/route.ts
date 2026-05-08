import { NextResponse } from "next/server";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { removeBlogMedia, uploadBlogMedia } from "@/services/blogMediaService";

export async function POST(request: Request) {
  await requireAdminMasterUser("comunicacao_ver");

  const formData = await request.formData();
  const file = formData.get("file");
  const placement = String(formData.get("placement") || "inline");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "Selecione uma imagem ou video valido." },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(await uploadBlogMedia({ file, placement }));
  } catch (error: unknown) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel enviar a midia.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  await requireAdminMasterUser("comunicacao_ver");

  const body = (await request.json().catch(() => null)) as {
    publicUrl?: string;
  } | null;

  try {
    await removeBlogMedia(String(body?.publicUrl || ""));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel remover a midia.",
      },
      { status: 500 }
    );
  }
}
