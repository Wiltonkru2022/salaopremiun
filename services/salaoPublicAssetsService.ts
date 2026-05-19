import { getSupabaseAdmin } from "@/lib/supabase/admin";

const BUCKET_ID = "salao-publico";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function validarSalaoPublicAsset(file: File, tipo: string) {
  if (
    tipo !== "logo" &&
    tipo !== "capa" &&
    tipo !== "portfolio" &&
    tipo !== "profissional"
  ) {
    throw new Error("Tipo de imagem invalido.");
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Envie uma imagem JPG, PNG, WEBP ou GIF.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("A imagem precisa ter ate 5MB.");
  }
}

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
    allowedMimeTypes: [...ALLOWED_MIME_TYPES],
  });

  if (error && !/already exists/i.test(error.message || "")) {
    throw error;
  }
}

export async function uploadSalaoPublicAsset(params: {
  idSalao: string;
  tipo: string;
  file: File;
}) {
  validarSalaoPublicAsset(params.file, params.tipo);
  await ensurePublicBucket();

  const supabaseAdmin = getSupabaseAdmin();
  const path = `${params.idSalao}/${params.tipo}-${Date.now()}.${getFileExtension(
    params.file
  )}`;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET_ID)
    .upload(path, params.file, {
      cacheControl: "31536000",
      contentType: params.file.type,
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabaseAdmin.storage.from(BUCKET_ID).getPublicUrl(path);

  if (!data.publicUrl) {
    throw new Error("Nao foi possivel obter a URL publica da imagem.");
  }

  return data.publicUrl;
}
