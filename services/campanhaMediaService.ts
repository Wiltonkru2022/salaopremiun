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
    throw new Error("Escolha uma imagem para o anuncio.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("A imagem do anuncio precisa ter ate 5 MB.");
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

  if (!uploaded.secureUrl) {
    throw new Error("Cloudinary nao retornou URL segura.");
  }

  return uploaded.secureUrl;
}

export async function removeCampanhaImage(publicUrl: string | null | undefined) {
  if (!publicUrl) return;

  // URLs antigas do Storage podem continuar registradas ate a migracao de midia.
  // Nao tentamos mais acessar Neon para remove-las.
  if (!publicUrl.includes("res.cloudinary.com")) return;

  await removeCloudinaryAssetByUrl(publicUrl).catch(() => undefined);
}
