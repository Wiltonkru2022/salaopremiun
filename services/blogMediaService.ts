import {
  removeCloudinaryAssetByUrl,
  uploadBufferToCloudinary,
} from "@/lib/platform/cloudinary.server";

const MAX_IMAGE_SIZE = 6 * 1024 * 1024;
const MAX_VIDEO_SIZE = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export async function uploadBlogMedia(params: {
  file: File;
  placement: string;
}) {
  const isImage = ALLOWED_IMAGE_TYPES.has(params.file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.has(params.file.type);

  if (!isImage && !isVideo) {
    throw new Error("Envie JPG, PNG, WEBP, GIF, MP4, WEBM ou MOV.");
  }

  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (params.file.size > maxSize) {
    throw new Error(
      `${isVideo ? "Video" : "Imagem"} precisa ter ate ${Math.round(maxSize / 1024 / 1024)}MB.`
    );
  }

  const safePlacement = params.placement.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const uploaded = await uploadBufferToCloudinary({
    buffer: Buffer.from(await params.file.arrayBuffer()),
    mimeType: params.file.type,
    folder: `salaopremiun/blog/${safePlacement}`,
  });

  if (!uploaded.secureUrl) throw new Error("Cloudinary não retornou URL segura.");

  return {
    publicUrl: uploaded.secureUrl,
    type: isVideo ? "video" : "image",
    name: params.file.name,
  };
}

export async function removeBlogMedia(publicUrl: string) {
  if (!publicUrl.includes("res.cloudinary.com")) {
    throw new Error("Mídia legada fora do Cloudinary precisa ser migrada antes da remoção.");
  }

  const removed = await removeCloudinaryAssetByUrl(publicUrl);
  if (!removed) throw new Error("URL Cloudinary inválida para remoção.");
}
