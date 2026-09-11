import { getBlogSupabaseAdmin } from "@/lib/blog/supabase";

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

function getStoragePathFromPublicUrl(publicUrl: string) {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${BUCKET_ID}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return null;

    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

async function ensureBlogBucket() {
  if (!process.env.BLOG_SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }

  const supabaseAdmin = getBlogSupabaseAdmin();
  const { data: bucket, error: getBucketError } =
    await supabaseAdmin.storage.getBucket(BUCKET_ID);

  if (bucket) return;

  if (
    getBucketError &&
    /not authorized|permission|row-level security/i.test(
      getBucketError.message || ""
    )
  ) {
    return;
  }

  const { error } = await supabaseAdmin.storage.createBucket(BUCKET_ID, {
    public: true,
    fileSizeLimit: MAX_VIDEO_SIZE,
    allowedMimeTypes: [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES],
  });

  if (error && !/already exists/i.test(error.message || "")) {
    throw error;
  }
}

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
      `${isVideo ? "Video" : "Imagem"} precisa ter ate ${Math.round(
        maxSize / 1024 / 1024
      )}MB.`
    );
  }

  await ensureBlogBucket();

  const supabaseAdmin = getBlogSupabaseAdmin();
  const safePlacement = params.placement.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const path = `${safePlacement}/${new Date()
    .toISOString()
    .slice(0, 10)}/${crypto.randomUUID()}.${getFileExtension(params.file)}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET_ID)
    .upload(path, params.file, {
      cacheControl: "31536000",
      contentType: params.file.type,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabaseAdmin.storage.from(BUCKET_ID).getPublicUrl(path);

  if (!data.publicUrl) {
    throw new Error("Nao foi possivel obter a URL publica da midia.");
  }

  return {
    publicUrl: data.publicUrl,
    type: isVideo ? "video" : "image",
    name: params.file.name,
  };
}

export async function removeBlogMedia(publicUrl: string) {
  const path = getStoragePathFromPublicUrl(publicUrl);

  if (!path) {
    throw new Error("URL de midia invalida para remocao.");
  }

  const supabaseAdmin = getBlogSupabaseAdmin();
  const { error } = await supabaseAdmin.storage.from(BUCKET_ID).remove([path]);

  if (error) {
    throw new Error(`Nao foi possivel remover a midia: ${error.message}`);
  }
}
