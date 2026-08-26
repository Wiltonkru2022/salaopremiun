import { getDatabaseAdmin } from "@/lib/db/admin";
import { getProviderConfig } from "@/lib/platform/provider-config.server";
import {
  removeCloudinaryAssetByUrl,
  uploadBufferToCloudinary,
} from "@/lib/platform/cloudinary.server";

const BUCKET_ID = "salao-publico";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extension(file: File) {
  const byName = file.name.split(".").pop()?.toLowerCase();
  if (byName && /^[a-z0-9]+$/.test(byName)) return byName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

function validar(file: File) {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Envie uma imagem JPG, PNG, WEBP ou GIF.");
  }
  if (file.size <= 0) {
    throw new Error("Escolha uma imagem para o anúncio.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("A imagem do anúncio precisa ter até 5 MB.");
  }
}

async function ensureBucket() {
  const supabase = getDatabaseAdmin();
  const { data: bucket } = await supabase.storage.getBucket(BUCKET_ID);
  if (bucket) return;

  const { error } = await supabase.storage.createBucket(BUCKET_ID, {
    public: true,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: [...ALLOWED_MIME_TYPES],
  });

  if (error && !/already exists/i.test(error.message || "")) throw error;
}

async function uploadToSupabase(params: { idCampanha: string; file: File }) {
  await ensureBucket();
  const supabase = getDatabaseAdmin();
  const path = `campanhas/${params.idCampanha}/${crypto.randomUUID()}.${extension(params.file)}`;
  const { error } = await supabase.storage.from(BUCKET_ID).upload(path, params.file, {
    cacheControl: "31536000",
    contentType: params.file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message || "Não foi possível enviar a imagem.");

  const { data } = supabase.storage.from(BUCKET_ID).getPublicUrl(path);
  if (!data.publicUrl) throw new Error("Não foi possível obter a URL pública da imagem.");
  return data.publicUrl;
}

export async function uploadCampanhaImage(params: {
  idCampanha: string;
  file: File;
}) {
  validar(params.file);

  if (getProviderConfig().media === "cloudinary") {
    try {
      const uploaded = await uploadBufferToCloudinary({
        buffer: Buffer.from(await params.file.arrayBuffer()),
        mimeType: params.file.type,
        folder: `salaopremiun/campanhas/${params.idCampanha}`,
      });
      if (!uploaded.secureUrl) throw new Error("Cloudinary não retornou URL segura.");
      return uploaded.secureUrl;
    } catch (error) {
      console.error("[campanha-media] Cloudinary falhou; usando Supabase fallback", error);
    }
  }

  return uploadToSupabase(params);
}

export async function removeCampanhaImage(publicUrl: string | null | undefined) {
  if (!publicUrl) return;

  if (publicUrl.includes("res.cloudinary.com")) {
    try {
      await removeCloudinaryAssetByUrl(publicUrl);
      return;
    } catch {
      return;
    }
  }

  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${BUCKET_ID}/`;
    const index = url.pathname.indexOf(marker);
    if (index < 0) return;
    const path = decodeURIComponent(url.pathname.slice(index + marker.length));
    if (!path.startsWith("campanhas/")) return;
    const supabase = getDatabaseAdmin();
    await supabase.storage.from(BUCKET_ID).remove([path]);
  } catch {
    // Não bloqueia a exclusão do registro se o arquivo já não existir.
  }
}
