import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const BUCKET_ID = "salao-publico";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function getFileExtension(file: File) {
  const byName = file.name.split(".").pop()?.toLowerCase();
  if (byName && /^[a-z0-9]+$/.test(byName)) return byName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

async function ensurePublicBucket() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: bucket } = await supabaseAdmin.storage.getBucket(BUCKET_ID);

  if (bucket) return;

  const { error } = await supabaseAdmin.storage.createBucket(BUCKET_ID, {
    public: true,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: Array.from(ALLOWED_MIME_TYPES),
  });

  if (error && !/already exists/i.test(error.message || "")) {
    throw error;
  }
}

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

  if (tipo !== "logo" && tipo !== "capa") {
    return NextResponse.json(
      { message: "Tipo de imagem invalido." },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { message: "Envie uma imagem JPG, PNG, WEBP ou GIF." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { message: "A imagem precisa ter ate 5MB." },
      { status: 400 }
    );
  }

  try {
    await ensurePublicBucket();

    const supabaseAdmin = getSupabaseAdmin();
    const path = `${usuario.id_salao}/${tipo}-${Date.now()}.${getFileExtension(
      file
    )}`;
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_ID)
      .upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: true,
      });

    if (error) throw error;

    const { data } = supabaseAdmin.storage.from(BUCKET_ID).getPublicUrl(path);

    if (!data.publicUrl) {
      throw new Error("Nao foi possivel obter a URL publica da imagem.");
    }

    return NextResponse.json({ publicUrl: data.publicUrl });
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
