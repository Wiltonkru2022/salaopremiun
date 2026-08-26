import "server-only";

import {
  removeCloudinaryAssetByUrl,
  uploadBufferToCloudinary,
} from "@/lib/platform/cloudinary.server";

type StorageUploadOptions = {
  cacheControl?: string;
  contentType?: string;
  upsert?: boolean;
};

type StorageError = { message: string } | null;

function cloudName() {
  const value = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  if (!value) throw new Error("CLOUDINARY_CLOUD_NAME nao configurado.");
  return value;
}

function cleanSegment(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "asset";
}

function splitLogicalPath(path: string) {
  const normalized = String(path || "")
    .replace(/^\/+/, "")
    .replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const rawFile = parts.pop() || "asset";
  const extensionMatch = rawFile.match(/\.([a-zA-Z0-9]{1,12})$/);
  const extension = extensionMatch?.[1]?.toLowerCase() || "";
  const rawBase = extension ? rawFile.slice(0, -(extension.length + 1)) : rawFile;
  const publicId = cleanSegment(rawBase);
  const dirs = parts.map(cleanSegment);
  return { dirs, publicId, extension };
}

function cloudinaryLocation(bucket: string, path: string) {
  const { dirs, publicId, extension } = splitLogicalPath(path);
  const folderParts = [
    "salaopremiun",
    "storage",
    cleanSegment(bucket),
    ...dirs,
  ];
  const folder = folderParts.join("/");
  const deliveryPath = [...folderParts, publicId]
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const suffix = extension ? `.${encodeURIComponent(extension)}` : "";
  const publicUrl = `https://res.cloudinary.com/${encodeURIComponent(
    cloudName()
  )}/image/upload/${deliveryPath}${suffix}`;

  return { folder, publicId, publicUrl };
}

async function toBuffer(value: unknown) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return Buffer.from(await value.arrayBuffer());
  }
  throw new Error("Formato de arquivo nao suportado pelo Cloudinary.");
}

function errorResult(cause: unknown) {
  const message = cause instanceof Error ? cause.message : "Falha no Cloudinary.";
  return { data: null, error: { message } satisfies NonNullable<StorageError> };
}

function createBucketFacade(bucket: string) {
  return {
    async upload(path: string, value: unknown, options?: StorageUploadOptions) {
      try {
        const location = cloudinaryLocation(bucket, path);
        const mimeType =
          String(options?.contentType || "").trim() ||
          (typeof Blob !== "undefined" && value instanceof Blob && value.type
            ? value.type
            : "application/octet-stream");
        const uploaded = await uploadBufferToCloudinary({
          buffer: await toBuffer(value),
          mimeType,
          folder: location.folder,
          publicId: location.publicId,
        });

        if (!uploaded.secureUrl) {
          throw new Error("Cloudinary nao retornou URL segura.");
        }

        return {
          data: {
            path,
            fullPath: path,
            publicUrl: uploaded.secureUrl,
          },
          error: null,
        };
      } catch (cause) {
        return errorResult(cause);
      }
    },

    getPublicUrl(path: string) {
      try {
        return {
          data: { publicUrl: cloudinaryLocation(bucket, path).publicUrl },
          error: null,
        };
      } catch (cause) {
        return errorResult(cause);
      }
    },

    async createSignedUrl(path: string, _expiresInSeconds?: number) {
      try {
        // Os assets dessa camada sao entregues pelo CDN do Cloudinary. O nome
        // foi mantido apenas para compatibilidade das telas legadas.
        return {
          data: { signedUrl: cloudinaryLocation(bucket, path).publicUrl },
          error: null,
        };
      } catch (cause) {
        return errorResult(cause);
      }
    },

    async remove(paths: string[]) {
      try {
        await Promise.all(
          (paths || []).map(async (path) => {
            const { publicUrl } = cloudinaryLocation(bucket, path);
            await removeCloudinaryAssetByUrl(publicUrl).catch(() => undefined);
          })
        );
        return { data: [], error: null };
      } catch (cause) {
        return errorResult(cause);
      }
    },
  };
}

export const cloudinaryStorageCompat = {
  from(bucket: string) {
    return createBucketFacade(bucket);
  },

  async getBucket(bucket: string) {
    try {
      cloudName();
      return {
        data: {
          id: bucket,
          name: bucket,
          public: true,
          provider: "cloudinary",
        },
        error: null,
      };
    } catch (cause) {
      return errorResult(cause);
    }
  },

  async createBucket(bucket: string) {
    try {
      cloudName();
      return {
        data: { name: bucket, provider: "cloudinary" },
        error: null,
      };
    } catch (cause) {
      return errorResult(cause);
    }
  },

  async listBuckets() {
    try {
      cloudName();
      return {
        data: [
          {
            id: "cloudinary",
            name: "Cloudinary",
            public: true,
            provider: "cloudinary",
          },
        ],
        error: null,
      };
    } catch (cause) {
      return errorResult(cause);
    }
  },
};
