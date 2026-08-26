import {
  removeCloudinaryAssetByUrl,
  uploadBufferToCloudinary,
} from "@/lib/platform/cloudinary.server";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

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

export async function uploadCampanhaImage(params: {
  idCampanha: string;
  file: File;
}) {
  validar(params.file);

  const uploaded = await uploadBufferToCloudinary({
    buffer: Buffer.from(await params.file.arrayBuffer()),
    mimeType: params.file.type,
    folder: `salaopremiun/campanhas/${params.idCampanha}`,
  });
  if (!uploaded.secureUrl) throw new Error("Cloudinary não retornou URL segura.");
  return uploaded.secureUrl;
}

export async function removeCampanhaImage(publicUrl: string | null | undefined) {
  if (!publicUrl) return;
  if (!publicUrl.includes("res.cloudinary.com")) {
    // Arquivo histórico fora do Cloudinary é preservado até a migração de mídia.
    return;
  }

  await removeCloudinaryAssetByUrl(publicUrl).catch(() => false);
}
