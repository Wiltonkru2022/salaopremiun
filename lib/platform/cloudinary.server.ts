import crypto from "node:crypto";

export type CloudinaryUploadResult = {
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
};

function getConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) throw new Error("Cloudinary não configurado.");
  return { cloudName, apiKey, apiSecret };
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
  const signatureBase = Object.entries(signed)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const signature = crypto.createHash("sha1").update(`${signatureBase}${apiSecret}`).digest("hex");

  const form = new FormData();
  // Cloudinary aceita Data URI diretamente; isso evita a incompatibilidade Buffer/Blob
  // entre os tipos DOM e Node.js usados no build da Vercel.
  form.set("file", `data:${params.mimeType};base64,${params.buffer.toString("base64")}`);
  form.set("api_key", apiKey);
  form.set("timestamp", String(timestamp));
  form.set("folder", params.folder);
  form.set("signature", signature);
  if (params.publicId) form.set("public_id", params.publicId);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/auto/upload`,
    {
      method: "POST",
      body: form,
    }
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
  };
}
