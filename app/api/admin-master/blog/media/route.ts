import { NextResponse } from "next/server";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const BUCKET_ID = "blog-media";
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;
const MAX_VIDEO_SIZE = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function getFileExtension(file: File) {
  const byName = file.name.split(".").pop()?.toLowerCase();
  if (byName && /^[a-z0-9]+$/.test(byName)) return byName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  if (file.type === "video/webm") return "webm";
  if (file.type === "video/quicktime") return "mov";
  return file.type.startsWith("video/") ? "mp4" : "jpg";
}

async function ensureBlogBucket() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: bucket } = await supabaseAdmin.storage.getBucket(BUCKET_ID);

  if (bucket) return;

  const { error } = await supabaseAdmin.storage.createBucket(BUCKET_ID, {
    public: true,
    fileSizeLimit: MAX_VIDEO_SIZE,
    allowedMimeTypes: [
      ...Array.from(ALLOWED_IMAGE_TYPES),
      ...Array.from(ALLOWED_VIDEO_TYPES),
    ],
  });

  if (error && !/already exists/i.test(error.message || "")) {
    throw error;
  }
}

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

  const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.has(file.type);

  if (!isImage && !isVideo) {
    return NextResponse.json(
      { message: "Envie JPG, PNG, WEBP, GIF, MP4, WEBM ou MOV." },
      { status: 400 }
    );
  }

  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    return NextResponse.json(
      {
        message: `${isVideo ? "Video" : "Imagem"} precisa ter ate ${Math.round(
          maxSize / 1024 / 1024
        )}MB.`,
      },
      { status: 400 }
    );
  }

  try {
    await ensureBlogBucket();

    const supabaseAdmin = getSupabaseAdmin();
    const safePlacement = placement.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const path = `${safePlacement}/${new Date()
      .toISOString()
      .slice(0, 10)}/${crypto.randomUUID()}.${getFileExtension(file)}`;

    const { error } = await supabaseAdmin.storage
      .from(BUCKET_ID)
      .upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabaseAdmin.storage.from(BUCKET_ID).getPublicUrl(path);

    if (!data.publicUrl) {
      throw new Error("Nao foi possivel obter a URL publica da midia.");
    }

    return NextResponse.json({
      publicUrl: data.publicUrl,
      type: isVideo ? "video" : "image",
      name: file.name,
    });
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
