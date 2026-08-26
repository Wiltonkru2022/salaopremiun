import crypto from "node:crypto";

export type CloudinaryUploadResult = {
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
  resourceType?: string;
};

function getConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary não configurado.");
  return { cloudName, apiKey, apiSecret };
}

function signParams(params: Record<string, string | number>, apiSecret: string) {
  const signatureBase = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return crypto.createHash("sha1").update(`${signatureBase}${apiSecret}`).digest("hex");
}

export async function uploadBufferToCloudinary(params: {
  buffer: Buffer;
  mimeType: string;
  folder: string;
  publicId?: string;
}): Promise<CloudinaryUploadResult> {
  const { cloudName, apiKey, apiSecret } = getConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signed: Record<string, string | number> = { folder: params.folder, timestamp };
  if (params.publicId) signed.public_id = params.publicId;
  const signature = signParams(signed, apiSecret);

  const form = new FormData();
  form.set("file", `data:${params.mimeType};base64,${params.buffer.toString("base64")}`);
  form.set("api_key", apiKey);
  form.set("timestamp", String(timestamp));
  form.set("folder", params.folder);
  form.set("signature", signature);
  if (params.publicId) form.set("public_id", params.publicId);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/auto/upload`,
    { method: "POST", body: form }
  );
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      String(
        (payload.error as { message?: string } | undefined)?.message ||
          "Falha no upload Cloudinary."
      )
    );
  }

  return {
    publicId: String(payload.public_id || ""),
    secureUrl: String(payload.secure_url || ""),
    width: typeof payload.width === "number" ? payload.width : undefined,
    height: typeof payload.height === "number" ? payload.height : undefined,
    format: typeof payload.format === "string" ? payload.format : undefined,
    resourceType:
      typeof payload.resource_type === "string" ? payload.resource_type : undefined,
  };
}

function parseCloudinaryAssetUrl(publicUrl: string) {
  try {
    const url = new URL(publicUrl);
    if (!url.hostname.endsWith("res.cloudinary.com")) return null;
    const segments = url.pathname.split("/").filter(Boolean);
    const uploadIndex = segments.indexOf("upload");
    if (uploadIndex < 1 || uploadIndex >= segments.length - 1) return null;

    const resourceType = segments[uploadIndex - 1] || "image";
    const afterUpload = segments.slice(uploadIndex + 1);
    if (/^v\d+$/.test(afterUpload[0] || "")) afterUpload.shift();
    const joined = decodeURIComponent(afterUpload.join("/"));
    const publicId = joined.replace(/\.[a-z0-9]+$/i, "");
    if (!publicId) return null;

    return { publicId, resourceType };
  } catch {
    return null;
  }
}

export async function removeCloudinaryAssetByUrl(publicUrl: string | null | undefined) {
  if (!publicUrl) return false;
  const parsed = parseCloudinaryAssetUrl(publicUrl);
  if (!parsed) return false;

  const { cloudName, apiKey, apiSecret } = getConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = { public_id: parsed.publicId, timestamp };
  const signature = signParams(signed, apiSecret);

  const form = new FormData();
  form.set("public_id", parsed.publicId);
  form.set("timestamp", String(timestamp));
  form.set("api_key", apiKey);
  form.set("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${encodeURIComponent(parsed.resourceType)}/destroy`,
    { method: "POST", body: form }
  );

  const payload = (await response.json().catch(() => ({}))) as { result?: string; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message || "Falha ao remover mídia do Cloudinary.");
  }

  return payload.result === "ok" || payload.result === "not found";
}
