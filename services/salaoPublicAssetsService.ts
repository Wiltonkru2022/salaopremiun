import { uploadBufferToCloudinary } from "@/lib/platform/cloudinary.server";

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

export async function uploadSalaoPublicAsset(params: {
  idSalao: string;
  tipo: string;
  file: File;
}) {
  validarSalaoPublicAsset(params.file, params.tipo);

  const uploaded = await uploadBufferToCloudinary({
    buffer: Buffer.from(await params.file.arrayBuffer()),
    mimeType: params.file.type,
    folder: `salaopremiun/saloes/${params.idSalao}/${params.tipo}`,
  });

  if (!uploaded.secureUrl) {
    throw new Error("Cloudinary nao retornou URL segura.");
  }

  return uploaded.secureUrl;
}
